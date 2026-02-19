import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Play,
  RefreshCcw,
  XCircle,
} from 'lucide-react';
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

type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

type SnapshotOption = {
  id: string;
  rootPath: string;
  createdAt: string;
};

type ExperimentRun = {
  id: string;
  snapshotId: string;
  numLayers: number;
  hiddenChannels: number;
  seed: number;
  status: RunStatus;
  errorMessage: string | null;
  tensorBundlePath: string | null;
  embeddingsPath: string | null;
  tsnePlotPath: string | null;
  silhouetteScore: number | null;
  clusterSummary: string[] | null;
  nodeCount: number | null;
  edgeCount: number | null;
  createdAt: string;
  completedAt: string | null;
  snapshot: SnapshotOption;
};

type StartResponse = {
  runId?: string;
  message?: string;
};

export function ExperimentsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotOption[]>([]);
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [numLayers, setNumLayers] = useState(2);
  const [hiddenChannels, setHiddenChannels] = useState(256);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [preview, setPreview] = useState<{ imageUrl: string; clusterSummary: string[] | null } | null>(
    null
  );

  useEffect(() => {
    void fetchSnapshots();
    void fetchRuns();
  }, []);

  // Poll for status updates when there are pending/running experiments
  useEffect(() => {
    const hasPending = runs.some((r) => r.status === 'pending' || r.status === 'running');
    if (!hasPending) return;

    const interval = setInterval(() => {
      void fetchRuns();
    }, 3000);

    return () => clearInterval(interval);
  }, [runs]);

  const orderedRuns = useMemo(
    () => [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [runs]
  );

  async function fetchSnapshots() {
    setIsLoadingSnapshots(true);
    try {
      const response = await fetch(endpoints.ingestionSnapshots);
      if (!response.ok) throw new Error('Failed to load snapshots');
      const data = await response.json();
      setSnapshots(data);
      if (data.length > 0 && !selectedSnapshotId) {
        setSelectedSnapshotId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }

  async function fetchRuns() {
    setIsLoadingRuns(true);
    try {
      const response = await fetch(endpoints.experimentsList);
      if (!response.ok) throw new Error('Failed to load experiment runs');
      const data = await response.json();
      setRuns(data);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setIsLoadingRuns(false);
    }
  }

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSnapshotId) {
      setFeedback({ type: 'error', message: 'Please select a snapshot.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(endpoints.experimentsRun, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: selectedSnapshotId,
          numLayers,
          hiddenChannels,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Experiment request failed.');
      }

      const data = (await response.json()) as StartResponse;
      setFeedback({ type: 'success', message: data.message ?? 'Experiment started!' });
      void fetchRuns();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start experiment.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getOutputUrl(runId: string, filename: string) {
    return endpoints.experimentsOutput(runId, filename);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[#1d2a4c] bg-gradient-to-r from-[#0b1222] via-[#0f1934] to-[#1f2f5c] p-6 text-white shadow-lg shadow-[#0b1222]/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.24em] text-[#93b4ff]">ML Pipeline</div>
            <h1 className="text-3xl font-semibold leading-tight">Baseline Experiments</h1>
            <p className="text-sm text-[#d6e1ff]">
              Run GNN experiments on snapshots to generate embeddings and t-SNE visualizations.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-black/20">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[#cfe0ff]">Workflow</div>
              <div className="font-semibold">Snapshot → GNN → t-SNE</div>
              <p className="text-xs text-[#cfe0ff]/80">SAGEConv message passing</p>
            </div>
            <Badge className="border-white/30 bg-white/20 text-white">Active</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-[#dde3f1]">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Run a new experiment</CardTitle>
            <CardDescription>
              Select a snapshot and configure GNN parameters. The pipeline will materialize the
              graph, generate embeddings, and create a t-SNE visualization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form onSubmit={handleStart} className="flex flex-col gap-4">
              <label className="space-y-2 text-sm">
                <div className="font-semibold text-[#0f172a]">Snapshot</div>
                <select
                  value={selectedSnapshotId}
                  onChange={(e) => setSelectedSnapshotId(e.target.value)}
                  className="w-full rounded-lg border border-[#d0d7e2] bg-white px-3 py-2 text-sm text-[#0f172a] shadow-inner shadow-[#dce3f3]/50 focus:border-[#4f7cff] focus:outline-none"
                  disabled={isLoadingSnapshots}
                >
                  {isLoadingSnapshots ? (
                    <option>Loading snapshots...</option>
                  ) : snapshots.length === 0 ? (
                    <option>No snapshots available</option>
                  ) : (
                    snapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.rootPath} ({formatDate(new Date(s.createdAt))})
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <div className="font-semibold text-[#0f172a]">GNN Layers</div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNumLayers(n)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          numLayers === n
                            ? 'border-[#4f7cff] bg-[#4f7cff] text-white'
                            : 'border-[#d0d7e2] bg-white text-[#0f172a] hover:border-[#4f7cff]/50'
                        }`}
                      >
                        {n}-Layer
                      </button>
                    ))}
                  </div>
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-semibold text-[#0f172a]">Hidden Channels</div>
                  <input
                    type="number"
                    value={hiddenChannels}
                    onChange={(e) => setHiddenChannels(Number(e.target.value))}
                    min={32}
                    max={512}
                    step={32}
                    className="w-full rounded-lg border border-[#d0d7e2] bg-white px-3 py-2 text-sm text-[#0f172a] shadow-inner shadow-[#dce3f3]/50 focus:border-[#4f7cff] focus:outline-none"
                  />
                </label>
              </div>

              <Button type="submit" className="w-full sm:w-auto p-3" disabled={isSubmitting || !selectedSnapshotId}>
                {isSubmitting ? (
                  <>
                    <RefreshCcw className="h-4 w-4 animate-spin" /> Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Run Experiment
                  </>
                )}
              </Button>
            </form>

            {feedback ? (
              <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
                <AlertTitle className="flex items-center gap-2">
                  {feedback.type === 'error' ? (
                    <>
                      <AlertTriangle className="h-4 w-4" /> Could not start experiment
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
          </CardContent>
        </Card>

        <Card className="border-[#dde3f1]">
          <CardHeader>
            <CardTitle>Pipeline stages</CardTitle>
            <CardDescription>What happens when you run an experiment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm text-[#0f172a]">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">Materialize</div>
                  <p className="text-[#4b5563]">
                    Load snapshot from PostgreSQL into a frozen NetworkX graph.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">Feature Engineering</div>
                  <p className="text-[#4b5563]">
                    Build `[log1p(in_degree), log1p(out_degree)]` features from graph structure.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">GNN Forward Pass</div>
                  <p className="text-[#4b5563]">
                    Run SAGEConv layers to generate 64-dim node embeddings.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#4f7cff]" />
                <div>
                  <div className="font-semibold">t-SNE Visualization</div>
                  <p className="text-[#4b5563]">
                    Project embeddings to 2D and color points by discovered cluster IDs.
                  </p>
                </div>
              </li>
            </ul>
            <div className="rounded-lg border border-[#e4e7ee] bg-[#f8fafc] p-4 text-sm text-[#0f172a] shadow-inner shadow-[#d5dce9]/30">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#6b7280]">
                <Clock className="h-4 w-4" /> Output artifacts
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-[#e4e7ee] bg-white px-3 py-2">
                  <span className="font-mono text-xs">tensor_bundle.pkl</span>
                </div>
                <div className="rounded border border-[#e4e7ee] bg-white px-3 py-2">
                  <span className="font-mono text-xs">embeddings.pkl</span>
                </div>
                <div className="rounded border border-[#e4e7ee] bg-white px-3 py-2 sm:col-span-2">
                  <span className="font-mono text-xs">tsne_Nlayer.png</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#dde3f1]">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Experiment runs</CardTitle>
            <CardDescription>Track experiment status and view results.</CardDescription>
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
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Snapshot</TableHead>
                <TableHead>Layers</TableHead>
                <TableHead>Nodes/Edges</TableHead>
                <TableHead>Silhouette</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-[#4b5563]">
                    {isLoadingRuns
                      ? 'Loading experiments...'
                      : 'No experiments yet. Run one to see results here.'}
                  </TableCell>
                </TableRow>
              ) : (
                orderedRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs text-[#0f172a]">
                      {run.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <StatusPill status={run.status} />
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-[#0f172a]">
                      {run.snapshot?.rootPath ?? run.snapshotId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm text-[#0f172a]">
                      {run.numLayers}L / {run.hiddenChannels}h
                    </TableCell>
                    <TableCell className="text-sm text-[#0f172a]">
                      {run.nodeCount != null ? `${run.nodeCount} / ${run.edgeCount}` : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[#0f172a]">
                      {formatSilhouetteScore(run.silhouetteScore)}
                    </TableCell>
                    <TableCell className="text-sm text-[#0f172a]">
                      {formatDate(new Date(run.createdAt))}
                    </TableCell>
                    <TableCell>
                      {run.status === 'completed' && run.tsnePlotPath ? (
                        <Button
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            const filename = run.tsnePlotPath!.split('/').pop()!;
                            setPreview({
                              imageUrl: getOutputUrl(run.id, filename),
                              clusterSummary: run.clusterSummary,
                            });
                          }}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View t-SNE
                        </Button>
                      ) : run.status === 'failed' ? (
                        <span className="text-xs text-red-600" title={run.errorMessage ?? ''}>
                          {run.errorMessage?.slice(0, 30) ?? 'Failed'}...
                        </span>
                      ) : (
                        <span className="text-xs text-[#6b7280]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableCaption className="text-left">
              Experiment runs are linked to snapshots. Each run produces embeddings and visualizations.
            </TableCaption>
          </Table>
        </CardContent>
      </Card>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 rounded-full p-1 hover:bg-gray-100"
              onClick={() => setPreview(null)}
            >
              <XCircle className="h-6 w-6 text-gray-500" />
            </button>
            <img src={preview.imageUrl} alt="t-SNE visualization" className="max-h-[80vh]" />
            <div className="mt-4 rounded-lg border border-[#e4e7ee] bg-[#f8fafc] p-4">
              <h3 className="text-sm font-semibold text-[#0f172a]">Cluster Summary</h3>
              {preview.clusterSummary && preview.clusterSummary.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-[#334155]">
                  {preview.clusterSummary.map((line, idx) => (
                    <li key={`${idx}-${line}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[#64748b]">No cluster summary available for this run.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'border-[#d0d7e2] bg-[#f8fafc] text-[#4b5563]' },
    running: { label: 'Running', className: 'border-[#fbbf24] bg-[#fef3c7] text-[#92400e]' },
    completed: { label: 'Completed', className: 'border-[#9fd8b4] bg-[#e7f5eb] text-[#1f4732]' },
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

function formatDate(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSilhouetteScore(score?: number | null) {
  if (typeof score !== 'number' || Number.isNaN(score)) return '—';
  return score.toFixed(3);
}
