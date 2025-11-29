import { useMemo } from 'react';
import { useHealth } from '../hooks/useHealth';
import { endpoints } from '../lib/endpoints';
import { HealthChecksTable } from './health/HealthChecksTable';
import { HealthErrorBanner } from './health/HealthErrorBanner';
import { HealthHeader } from './health/HealthHeader';
import { HealthSummaryCard } from './health/HealthSummaryCard';
import type { HealthCheck } from './health/types';

export function HealthStatusPage() {
  const { data: health, error, isLoading, isFetching, refetch, dataUpdatedAt } = useHealth();

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
  const errorMessage = error ? (error instanceof Error ? error.message : 'Unknown error') : null;

  return (
    <div className="flex flex-col gap-6">
      <HealthHeader onRefresh={() => void refetch()} isLoading={isFetching} />

      <HealthSummaryCard
        overallStatus={overallStatus}
        endpoint={endpoints.health}
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
