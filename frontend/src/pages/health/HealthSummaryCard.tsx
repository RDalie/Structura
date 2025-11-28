import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { StatusBadge } from './StatusBadge';

type HealthSummaryCardProps = {
  overallStatus: string;
  endpoint: string;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
};

export function HealthSummaryCard({
  overallStatus,
  endpoint,
  lastUpdated,
  isLoading,
  error,
}: HealthSummaryCardProps) {
  return (
    <Card className="bg-linear-to-br from-[#f9fafb] to-[#ffffff]">
      <CardHeader className="border-none pb-0">
        <CardTitle className="text-base text-[#4b5563]">Overall status</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={overallStatus} />
            <div>
              <div className="text-sm font-semibold text-[#0f172a]">
                {overallStatus === 'ok' ? 'All systems nominal' : 'Attention required'}
              </div>
              <div className="text-xs text-[#6b7280]">
                Endpoint {endpoint || '/health'} •{' '}
                {lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : 'Awaiting first response'}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-[#6b7280]">
            Auto-refreshes every 20s
            <div>{error ? 'Retrying on manual refresh' : isLoading ? 'Syncing...' : 'Live'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
