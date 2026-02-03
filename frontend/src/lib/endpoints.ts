// Centralized API endpoints to keep URLs consistent across features.
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export const endpoints = {
  health: `${API_BASE}/health`,
  ingestionStart: `${API_BASE}/ingestion/start`,
  ingestionSnapshots: `${API_BASE}/ingestion/snapshots`,
  experimentsRun: `${API_BASE}/experiments/run`,
  experimentsList: `${API_BASE}/experiments`,
  experimentsOutput: (runId: string, filename: string) =>
    `${API_BASE}/experiments/outputs/${runId}/${filename}`,
};
