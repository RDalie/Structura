import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { endpoints } from '../lib/endpoints';
import type { HealthResponse } from '../pages/health/types';

// Central TanStack Query hook to fetch and poll health status from the backend.
export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const { data } = await axios.get<HealthResponse>(endpoints.health);
        return data;
      } catch (err) {
        // Normalize errors so consumers can display a readable message.
        const message = axios.isAxiosError(err)
          ? err.message ?? 'Request failed'
          : err instanceof Error
            ? err.message
            : 'Unknown error';
        throw new Error(message);
      }
    },
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
  });
}
