import { Badge } from '../../components/ui/badge';

type StatusBadgeProps = {
  status?: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() ?? 'unknown';
  const variant =
    normalized === 'up' || normalized === 'ok'
      ? 'default'
      : normalized === 'down'
        ? 'destructive'
        : 'secondary';
  const label =
    normalized === 'up' || normalized === 'ok' ? 'Ok' : normalized === 'down' ? 'Down' : 'Unknown';
  return (
    <Badge variant={variant} className="min-w-[72px] justify-center">
      {label}
    </Badge>
  );
}
