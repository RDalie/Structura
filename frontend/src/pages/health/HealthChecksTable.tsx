import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import type { HealthCheck } from './types';
import { StatusBadge } from './StatusBadge';

type HealthChecksTableProps = {
  checks: HealthCheck[];
  isLoading: boolean;
  hasHealthResponse: boolean;
};

export function HealthChecksTable({
  checks,
  isLoading,
  hasHealthResponse,
}: HealthChecksTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-slate-950/40">
      <Table>
        <TableHeader className="bg-slate-900/80">
          <TableRow className="border-b border-slate-800">
            <TableHead className="w-[280px]">Check</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && !hasHealthResponse
            ? // Initial load skeletons to avoid layout shift.
              Array.from({ length: 3 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full max-w-sm" />
                  </TableCell>
                </TableRow>
              ))
            : checks.length === 0
              ? (
                <TableRow>
                  <TableCell className="text-center text-sm text-slate-400">
                    No health indicators returned.
                  </TableCell>
                </TableRow>
                )
              : checks.map((check) => (
                  <TableRow key={check.name}>
                    <TableCell>
                      <div className="font-medium text-slate-100">{check.name}</div>
                      <div className="text-xs text-slate-400">Registered via NestJS Terminus</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={check.status} />
                    </TableCell>
                    <TableCell>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300">
                        {JSON.stringify(check, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
        </TableBody>
      </Table>
    </div>
  );
}
