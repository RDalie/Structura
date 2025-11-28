import { Button } from '../../components/ui/button';

type HealthHeaderProps = {
  onRefresh: () => void;
  isLoading: boolean;
};

export function HealthHeader({ onRefresh, isLoading }: HealthHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">Operations</div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Health Checks</h1>
        <p className="text-sm text-[#4b5563]">
          Live view of backend checks exposed via the /health endpoint.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="px-3 py-2"
          type="button"
          onClick={onRefresh}
          variant="outline"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
