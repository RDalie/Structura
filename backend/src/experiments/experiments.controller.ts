import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { RunExperimentDto } from './dto/run-experiment.dto';
import { ExperimentsService } from './experiments.service';

@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get()
  async listRuns() {
    return this.experimentsService.listRuns();
  }

  @Get(':id')
  async getRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentsService.getRun(id);
  }

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  async startRun(@Body() dto: RunExperimentDto) {
    return this.experimentsService.startRun(dto);
  }

  @Get('outputs/:runId/:filename')
  async getOutputFile(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    // Validate filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Build path to the output file
    // __dirname in compiled code is backend/dist/src/experiments/
    // Go up 4 levels to reach repo root: experiments -> src -> dist -> backend -> repo
    const projectRoot = path.resolve(__dirname, '../../../..');
    const filePath = path.join(projectRoot, 'learning/output/experiments', runId, safeFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine content type based on extension
    const ext = path.extname(safeFilename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.pkl': 'application/octet-stream',
      '.json': 'application/json',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
