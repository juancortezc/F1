/**
 * Hook for fetching circuits
 */

import useSWR from 'swr';
import type { Circuit } from '../../domain/entities';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface CircuitWithHolders extends Circuit {
  bestLapHolder?: { id: string; name: string } | null;
  bestAverageHolder?: { id: string; name: string } | null;
}

export interface UseCircuitsOptions {
  refreshInterval?: number;
  withRecords?: boolean;
}

export function useCircuits(options: UseCircuitsOptions = {}) {
  const { refreshInterval = 0, withRecords = true } = options;

  const url = withRecords ? '/api/circuits?withHolders=true' : '/api/circuits';

  const { data, error, isLoading, isValidating, mutate } = useSWR<CircuitWithHolders[]>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Filter circuits with records
  const circuitsWithRecords = (data ?? []).filter(
    (c) => c.historicalBestLap || c.historicalBestAverage
  );

  return {
    circuits: data ?? [],
    circuitsWithRecords,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function useCircuit(circuitId?: string) {
  const url = circuitId ? `/api/circuits/${circuitId}` : null;

  const { data, error, isLoading, mutate } = useSWR<CircuitWithHolders>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    circuit: data,
    error,
    isLoading,
    mutate,
  };
}

export default useCircuits;
