import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo } from 'react';
import { HealthChecksTable } from './health/HealthChecksTable';
import { HealthErrorBanner } from './health/HealthErrorBanner';
import { HealthHeader } from './health/HealthHeader';
import { HealthSummaryCard } from './health/HealthSummaryCard';
import type { HealthCheck, HealthResponse } from './health/types';

// Build the health endpoint from env, trimming trailing slashes to avoid accidental double slashes.
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const HEALTH_ENDPOINT = `${API_BASE}/health`;

export function HealthStatusPage() {
  const {
    data: health,
    error,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await axios.get<HealthResponse>(HEALTH_ENDPOINT);
      return data;
    },
    // Poll the health endpoint every 20s to keep the view current without manual intervals.
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
  });

  const checks: HealthCheck[] = useMemo(() => {
    // Nest Terminus may return data in details/info/error; merge to render whatever is available.
    const detailSource = health?.details ?? { ...(health?.info ?? {}), ...(health?.error ?? {}) };
    if (!detailSource || Object.keys(detailSource).length === 0) return [];
    return Object.entries(detailSource).map(([name, result]) => ({
      name,
      status: result.status,
      message:
        result.message ?? (typeof result === 'object' ? JSON.stringify(result) : String(result)),
      raw: result,
    }));
  }, [health]);

  const overallStatus = health?.status?.toLowerCase() ?? 'unknown';
  const lastUpdated = health ? new Date(dataUpdatedAt) : null;
  const errorMessage = error
    ? axios.isAxiosError(error)
      ? (error.message ?? 'Request failed')
      : error instanceof Error
        ? error.message
        : 'Unknown error'
    : null;

  return (
    <div className="flex flex-col gap-6">
      <HealthHeader onRefresh={() => void refetch()} isLoading={isFetching} />

      <HealthSummaryCard
        overallStatus={overallStatus}
        endpoint={HEALTH_ENDPOINT}
        lastUpdated={lastUpdated}
        isLoading={isFetching}
        error={errorMessage}
      />

      {errorMessage ? <HealthErrorBanner error={errorMessage} /> : null}

      <HealthChecksTable
        checks={checks}
        isLoading={isLoading || isFetching}
        hasHealthResponse={!!health}
      />
    </div>
  );
}
