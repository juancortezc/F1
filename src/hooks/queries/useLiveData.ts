/**
 * Hook for fetching live timing data
 * Used on LivePage for real-time updates
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface LiveLapTime {
  id: string;
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapNumber: number;
  timeMs: number;
  createdAt: string;
}

export interface LiveTurnCompletion {
  id: string;
  gameId: string;
  playerId: string;
  circuitId: string;
  turnNumber: number;
  lapTimes: number[];
  averageTimeMs: number;
  bestLapMs: number;
  turnScore: number;
}

export interface LiveDataResponse {
  lapTimes: LiveLapTime[];
  turnCompletions: LiveTurnCompletion[];
  sessionBests?: {
    bestLap: number | null;
    bestLapPlayerId: string | null;
    bestAverage: number | null;
    bestAveragePlayerId: string | null;
  };
}

export interface UseLiveDataOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  enabled?: boolean;
}

export function useLiveData(
  gameId?: string,
  circuitId?: string,
  options: UseLiveDataOptions = {}
) {
  const {
    refreshInterval = 3000,
    revalidateOnFocus = true,
    enabled = true,
  } = options;

  const shouldFetch = enabled && !!(gameId && circuitId);
  const url = shouldFetch
    ? `/api/lap-times/live?gameId=${gameId}&circuitId=${circuitId}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<LiveDataResponse>(
    url,
    fetcher,
    {
      refreshInterval: shouldFetch ? refreshInterval : 0,
      revalidateOnFocus,
      errorRetryCount: 3,
      dedupingInterval: 1000,
      onError: (err) => {
        console.warn('Live data fetch error:', err);
      },
    }
  );

  return {
    data,
    lapTimes: data?.lapTimes ?? [],
    turnCompletions: data?.turnCompletions ?? [],
    sessionBests: data?.sessionBests,
    error,
    isLoading,
    isValidating,
    mutate,
    isEnabled: shouldFetch,
  };
}

export default useLiveData;
