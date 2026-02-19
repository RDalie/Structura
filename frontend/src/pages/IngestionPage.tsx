import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Play, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { endpoints } from '../lib/endpoints';

type RunStatus = 'queued' | 'running' | 'complete' | 'failed';

type IngestionRun = {
  id: string;
  path: string;
  status: RunStatus;
  startedAt: Date;
  message: string;
  snapshotVersion?: string;
  filesDiscovered?: number;
  normalized?: number;
  failed?: number;
};

type StartResponse = {
  snapshotId?: string;
  message?: string;
};

type SnapshotResponse = {
  id: string;
  rootPath: string;
  snapshotVersion: string;
  createdAt: string;
  _count: { astNodes: number; graphEdges: number };
};

export function IngestionPage() {
  const [repoPath, setRepoPath] = useState('');
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuns();
  }, []);

  const latestRun = runs[0];

  const orderedRuns = useMemo(
    () => [...runs].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
    [runs]
  );

  async function fetchRuns() {
    setIsLoadingRuns(true);
    setRunsError(null);
    try {
      const response = await fetch(endpoints.ingestionSnapshots);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to load snapshots.');
      }
      const data = (await response.json()) as SnapshotResponse[];
      const mapped = data.map<IngestionRun>((snapshot) => ({
        id: snapshot.id,
        path: snapshot.rootPath,
        status: 'complete',
        startedAt: new Date(snapshot.createdAt),
        message: `${snapshot._count.astNodes} AST nodes, ${snapshot._count.graphEdges} edges`,
        snapshotVersion: snapshot.snapshotVersion,
        filesDiscovered: snapshot._count.astNodes,
        normalized: snapshot._count.astNodes,
        failed: 0,
      }));
      setRuns(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load snapshots.';
      setRunsError(message);
    } finally {
      setIsLoadingRuns(false);
    }
  }

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPath = repoPath.trim();
    if (!trimmedPath) {
      setFeedback({ type: 'error', message: 'Please provide a repository path to ingest.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(endpoints.ingestionStart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmedPath }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Ingestion request failed.');
      }

      const data = (await response.json()) as StartResponse;
      const snapshotId = data.snapshotId ?? generateSnapshotId();
      const message = data.message ?? `Ingestion started for ${trimmedPath}`;

      const newRun: IngestionRun = {
        id: snapshotId,
        path: trimmedPath,
        status: 'queued',
        startedAt: new Date(),
        message,
        snapshotVersion: 'v1',
        filesDiscovered: undefined,
      };

      setRuns((prev) => [newRun, ...prev]);
      setFeedback({ type: 'success', message });
      void fetchRuns();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start ingestion right now.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[#1d2a4c] bg-gradient-to-r from-[#0b1222] via-[#0f1934] to-[#1f2f5c] p-6 text-white shadow-lg shadow-[#0b1222]/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.24em] text-[#93b4ff]">Pipeline</div>
            <h1 className="text-3xl font-semibold leading-tight">Ingestion Control</h1>
            <p className="text-sm text-[#d6e1ff]">
              Launch a snapshot, watch crawler progress, and keep the pipeline honest before it hits
              the graph.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[#cfe0ff]">Endpoint</div>
              <div className="font-semibold">POST /ingestion/start</div>
              <p className="text-xs text-[#cfe0ff]/80">Requires a readable repository path</p>
            </div>
            <Badge className="border-white/30 bg-white/20 text-white">Active</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-[#dde3f1]">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Start a new ingestion</CardTitle>
            <CardDescription>
              Point to a repository root. We will crawl JS/TS files, parse them with Tree-sitter,
              and persist a normalized snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form onSubmit={handleStart} className="flex flex-col gap-4">
              <label className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-[#0f172a]">
                  <span className="font-semibold">Repository path</span>
                  <span className="text-xs text-[#6b7280]">
                    Local or mounted path on the server
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={repoPath}
                      onChange={(event) => setRepoPath(event.target.value)}
                      placeholder="/srv/repos/my-service"
                      className="w-2/3 rounded-lg border border-[#d0d7e2] bg-white px-3 py-2 text-sm text-[#0f172a] shadow-inner shadow-[#dce3f3]/50 focus:border-[#4f7cff] focus:outline-none"
                    />
                    <Button type="submit" className="w-full sm:w-auto p-3" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <RefreshCcw className="h-4 w-4 animate-spin" /> Starting...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Start ingestion
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-[#4b5563]">
                    The backend will validate readability before starting. JS/TS files are crawled
                    recursively; customize ignore rules in{' '}
                    <span className="font-mono text-[#0f172a]/80">
                      ingestion/crawler/ignore-folders.txt
                    </span>
                    .
                  </p>
                </div>
              </label>
            </form>

            {feedback ? (
              <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
                <AlertTitle className="flex items-center gap-2">
                  {feedback.type === 'error' ? (
                    <>
                      <AlertTriangle className="h-4 w-4" /> Could not start ingestion
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Request accepted
                    </>
                  )}
                </AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            ) : null}

            {runsError ? (
              <Alert variant="destructive">
                <AlertTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Could not load snapshots
                </AlertTitle>
                <AlertDescription>{runsError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <PipelineFact
                label="Latest snapshot"
                value={latestRun?.id ?? '—'}
                helper={latestRun ? `Started ${formatDate(latestRun.startedAt)}` : 'No runs yet'}
              />
              <PipelineFact
                label="Snapshot version"
                value={latestRun?.snapshotVersion ?? 'v1'}
                helper="Provided by @structura/core"
              />
              <PipelineFact
                label="Crawler scope"
                value="JavaScript + TypeScript"
                helper="Tree-sitter backed parsing"
              />
              <PipelineFact
                label="Failure budget"
                value={`${latestRun?.failed ?? 0} errors`}
                helper="See run log for details"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dde3f1]">
          <CardHeader>
            <CardTitle>Pipeline recipe</CardTitle>
            <CardDescription>Quick checklist before you hit run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm text-[#0f172a]">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">Crawl</div>
                  <p className="text-[#4b5563]">
                    Respects <span className="font-mono text-xs">ignore-folders.txt</span>; picks up
                    <span className="mx-1 inline-flex items-center gap-1 rounded-full border border-[#d0d7e2] bg-[#f8fafc] px-2 py-0.5 text-xs font-semibold text-[#0f172a]">
                      .js
                    </span>
                    and
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-[#d0d7e2] bg-[#f8fafc] px-2 py-0.5 text-xs font-semibold text-[#0f172a]">
                      .ts
                    </span>{' '}
                    files recursively.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">Parse</div>
                  <p className="text-[#4b5563]">
                    Tree-sitter converts source into ASTs; snapshot IDs are UUIDs per request.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">Normalize</div>
                  <p className="text-[#4b5563]">
                    Nodes are normalized via{' '}
                    <span className="font-mono text-xs">@structura/core</span> and flattened for
                    Prisma ingestion.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">Persist</div>
                  <p className="text-[#4b5563]">
                    Snapshot metadata + AST rows land in the database; errors are logged per file.
                  </p>
                </div>
              </li>
            </ul>
            <div className="rounded-lg border border-[#e4e7ee] bg-[#f8fafc] p-4 text-sm text-[#0f172a] shadow-inner shadow-[#d5dce9]/30">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#6b7280]">
                <Clock className="h-4 w-4" /> Typical timeline
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <TimelineChip title="Crawl" detail="~1s per 500 files" />
                <TimelineChip title="Parse" detail="Tree-sitter, parallel per CPU" />
                <TimelineChip title="Normalize" detail="Flattens + persists to Prisma" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#dde3f1]">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>Monitor the last few snapshots and their outcomes.</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#4b5563]">
            {isLoadingRuns ? (
              <div className="flex items-center gap-2">
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                <span>Refreshing…</span>
              </div>
            ) : (
              <Button type="button" variant="ghost" className="px-2" onClick={() => void fetchRuns()}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#4b5563]">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#4f7cff]" /> Running
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#1f4732]" /> Complete
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#7a1f1b]" /> Failed
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Snapshot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Root</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-[#4b5563]">
                    {isLoadingRuns
                      ? 'Loading snapshots...'
                      : 'No snapshots yet. Start an ingestion to see it here.'}
                  </TableCell>
                </TableRow>
              ) : (
                orderedRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs text-[#0f172a]">{run.id}</TableCell>
                    <TableCell>
                      <StatusPill status={run.status} />
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-[#0f172a]">
                      {run.path}
                    </TableCell>
                    <TableCell className="text-sm text-[#0f172a]">
                      {formatFiles(run.filesDiscovered, run.failed)}
                    </TableCell>
                    <TableCell className="text-sm text-[#0f172a]">
                      {formatDate(run.startedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-[#4b5563]">
                      {run.message || 'Snapshot created'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableCaption className="text-left">
              Snapshots pulled directly from the backend Snapshot table.
            </TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { label: string; className: string }> = {
    queued: { label: 'Queued', className: 'border-[#d0d7e2] bg-[#f8fafc] text-[#4b5563]' },
    running: { label: 'Running', className: 'border-[#9fd8b4] bg-[#e7f5eb] text-[#1f4732]' },
    complete: { label: 'Complete', className: 'border-[#9fd8ff] bg-[#e7f1ff] text-[#0b3b80]' },
    failed: { label: 'Failed', className: 'border-[#f0b6b0] bg-[#fde8e7] text-[#7a1f1b]' },
  };
  const entry = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

function PipelineFact({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-[#e4e7ee] bg-[#f8fafc] p-4 shadow-inner shadow-[#d5dce9]/20">
      <div className="text-xs uppercase tracking-[0.12em] text-[#6b7280]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[#0f172a]">{value}</div>
      <p className="text-xs text-[#4b5563]">{helper}</p>
    </div>
  );
}

function TimelineChip({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-[#e4e7ee] bg-white px-3 py-2 shadow-sm shadow-[#d5dce9]/30">
      <div className="text-sm font-semibold text-[#0f172a]">{title}</div>
      <div className="text-xs text-[#4b5563]">{detail}</div>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFiles(files?: number, failed?: number) {
  if (files === undefined && failed === undefined) return '—';
  const parts = [];
  if (typeof files === 'number') parts.push(`${files} files`);
  if (typeof failed === 'number' && failed > 0) parts.push(`${failed} failed`);
  return parts.join(' · ');
}

function generateSnapshotId() {
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `snap-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14)}-${randomSuffix}`;
}
