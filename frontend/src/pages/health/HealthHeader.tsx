import { Button } from "../../components/ui/button";

type HealthHeaderProps = {
  onRefresh: () => void;
  isLoading: boolean;
};

export function HealthHeader({ onRefresh, isLoading }: HealthHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Operations</div>
        <h1 className="text-2xl font-semibold text-slate-50">Health Checks</h1>
        <p className="text-sm text-slate-300">Live view of backend checks exposed via the /health endpoint.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={onRefresh} variant="outline" disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
