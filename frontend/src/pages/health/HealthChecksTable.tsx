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
    <div className="overflow-hidden rounded-xl border border-[#e4e7ee] bg-white shadow-lg shadow-[#d5dce9]/25">
      <Table>
        <TableHeader className="bg-[#f8fafc]">
          <TableRow className="border-b border-[#e4e7ee]">
            <TableHead className="w-[280px]">Check</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && !hasHealthResponse ? (
            // Initial load skeletons to avoid layout shift.
            Array.from({ length: 3 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                <TableCell>
                  <Skeleton className="h-4 w-32 bg-[#e5e7eb]" />
                  <Skeleton className="mt-2 h-3 w-24 bg-[#e5e7eb]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 bg-[#e5e7eb]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-full max-w-sm bg-[#e5e7eb]" />
                </TableCell>
              </TableRow>
            ))
          ) : checks.length === 0 ? (
            <TableRow>
              <TableCell className="text-center text-sm text-[#6b7280]">
                No health indicators returned.
              </TableCell>
            </TableRow>
          ) : (
            checks.map((check) => (
              <TableRow key={check.name}>
                <TableCell>
                  <div className="font-medium text-[#0f172a]">{check.name}</div>
                  <div className="text-xs text-[#6b7280]">Registered via NestJS Terminus</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={check.status} />
                </TableCell>
                <TableCell>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-[#f8fafc] px-3 py-2 text-[11px] text-[#111827]">
                    {JSON.stringify(check, null, 2)}
                  </pre>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
