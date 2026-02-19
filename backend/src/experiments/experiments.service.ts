import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ExperimentRun } from '../../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RunExperimentDto } from './dto/run-experiment.dto';

interface ExperimentResult {
  tensor_bundle_path: string;
  embeddings_path: string;
  tsne_plot_path: string;
  silhouette_score: number | null;
  best_cluster_k: number | null;
  cluster_summary: string[] | null;
  node_count: number;
  edge_count: number;
}

@Injectable()
export class ExperimentsService {
  private readonly logger = new Logger(ExperimentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listRuns() {
    const runs = await this.prisma.experimentRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        snapshot: {
          select: {
            id: true,
            rootPath: true,
            createdAt: true,
          },
        },
      },
    });

    return Promise.all(
      runs.map(async (run) => {
        const [silhouetteScore, clusterSummary] = await Promise.all([
          this.getExperimentRunSilhouetteScore(run.id),
          this.getExperimentRunClusterSummary(run.id),
        ]);
        return {
          ...run,
          silhouetteScore,
          clusterSummary,
        };
      })
    );
  }

  async getRun(id: string) {
    const run = await this.prisma.experimentRun.findUnique({
      where: { id },
      include: {
        snapshot: {
          select: {
            id: true,
            rootPath: true,
            createdAt: true,
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Experiment run ${id} not found`);
    }

    const [silhouetteScore, clusterSummary] = await Promise.all([
      this.getExperimentRunSilhouetteScore(run.id),
      this.getExperimentRunClusterSummary(run.id),
    ]);

    return {
      ...run,
      silhouetteScore,
      clusterSummary,
    };
  }

  async startRun(dto: RunExperimentDto) {
    // Verify snapshot exists.
    // Use raw SQL to avoid stale generated Snapshot model metadata.
    const snapshotRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Snapshot"
      WHERE "id" = ${dto.snapshotId}
      LIMIT 1
    `;

    if (snapshotRows.length === 0) {
      throw new NotFoundException(`Snapshot ${dto.snapshotId} not found`);
    }

    // Create experiment run record
    const run = await this.prisma.experimentRun.create({
      data: {
        snapshotId: dto.snapshotId,
        numLayers: dto.numLayers ?? 2,
        hiddenChannels: dto.hiddenChannels ?? 256,
        seed: dto.seed ?? 42,
        status: 'pending',
      },
    });

    this.logger.log(`Created experiment run ${run.id} for snapshot ${dto.snapshotId}`);

    // Kick off the Python pipeline asynchronously
    void this.runPipeline(run);

    return {
      runId: run.id,
      message: `Experiment started for snapshot ${dto.snapshotId}`,
    };
  }

  private async runPipeline(run: ExperimentRun) {
    const runId = run.id;

    try {
      // Update status to running
      await this.prisma.experimentRun.update({
        where: { id: runId },
        data: { status: 'running' },
      });

      this.logger.log(`Starting pipeline for experiment ${runId}`);

      // Determine paths
      // __dirname in compiled code is backend/dist/src/experiments/
      // Go up 4 levels to reach repo root: experiments -> src -> dist -> backend -> repo
      const projectRoot = path.resolve(__dirname, '../../../..');
      const pythonScript = path.join(projectRoot, 'learning/src/pipeline/run_experiment.py');

      // Spawn Python process
      const result = await this.executePythonScript(pythonScript, [
        '--snapshot_id',
        run.snapshotId,
        '--run_id',
        runId,
        '--num_layers',
        String(run.numLayers),
        '--hidden_channels',
        String(run.hiddenChannels),
        '--seed',
        String(run.seed),
      ]);

      // Parse result JSON from output
      const experimentResult = this.parseExperimentResult(result.stdout);

      // Update record with success
      await this.prisma.experimentRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          tensorBundlePath: experimentResult.tensor_bundle_path,
          embeddingsPath: experimentResult.embeddings_path,
          tsnePlotPath: experimentResult.tsne_plot_path,
          nodeCount: experimentResult.node_count,
          edgeCount: experimentResult.edge_count,
          completedAt: new Date(),
        },
      });
      await this.setExperimentRunSilhouetteScore(runId, experimentResult.silhouette_score);

      this.logger.log(`Experiment ${runId} completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Experiment ${runId} failed: ${message}`);

      await this.prisma.experimentRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }
  }

  private executePythonScript(
    scriptPath: string,
    args: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [scriptPath, ...args], {
        env: {
          ...process.env,
          // Ensure Python can find the database
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        // Log Python output for debugging
        chunk.split('\n').forEach((line) => {
          if (line.trim()) {
            this.logger.debug(`[Python] ${line}`);
          }
        });
      });

      python.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        chunk.split('\n').forEach((line) => {
          if (line.trim()) {
            this.logger.warn(`[Python stderr] ${line}`);
          }
        });
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr || stdout}`));
        }
      });

      python.on('error', (err) => {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  private parseExperimentResult(stdout: string): ExperimentResult {
    // Look for the JSON result marker in the output
    const jsonMatch = stdout.match(/EXPERIMENT_RESULT_JSON:\s*\n({[\s\S]*?})\n/);
    if (!jsonMatch) {
      throw new Error('Could not find experiment result JSON in Python output');
    }

    try {
      return JSON.parse(jsonMatch[1]) as ExperimentResult;
    } catch {
      throw new Error(`Failed to parse experiment result JSON: ${jsonMatch[1]}`);
    }
  }

  private async setExperimentRunSilhouetteScore(
    runId: string,
    silhouetteScore: number | null
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "ExperimentRun"
      SET "silhouetteScore" = ${silhouetteScore}
      WHERE "id" = ${runId}
    `;
  }

  private async getExperimentRunSilhouetteScore(runId: string): Promise<number | null> {
    type Row = { silhouetteScore: number | null };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT "silhouetteScore"
      FROM "ExperimentRun"
      WHERE "id" = ${runId}
      LIMIT 1
    `;
    return rows[0]?.silhouetteScore ?? null;
  }

  private getExperimentOutputDir(runId: string): string {
    const projectRoot = path.resolve(__dirname, '../../../..');
    return path.join(projectRoot, 'learning/output/experiments', runId);
  }

  private async getExperimentRunClusterSummary(runId: string): Promise<string[] | null> {
    const summaryPath = path.join(this.getExperimentOutputDir(runId), 'cluster_summary.json');

    try {
      const content = await fs.readFile(summaryPath, 'utf8');
      const parsed = JSON.parse(content) as unknown;

      if (Array.isArray(parsed) && parsed.every((line) => typeof line === 'string')) {
        return parsed;
      }
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'lines' in parsed &&
        Array.isArray((parsed as { lines: unknown }).lines)
      ) {
        const lines = (parsed as { lines: unknown[] }).lines.filter(
          (line): line is string => typeof line === 'string'
        );
        return lines;
      }
      return null;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return null;
      }

      this.logger.warn(`Failed to load cluster summary for run ${runId}: ${err.message}`);
      return null;
    }
  }
}
