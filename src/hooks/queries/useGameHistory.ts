/**
 * Hook for fetching game history
 */

import useSWR from 'swr';
import type { GameState } from '../../domain/entities';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface GameHistoryEntry {
  id: string;
  state: GameState;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseGameHistoryOptions {
  limit?: number;
  refreshInterval?: number;
}

export function useGameHistory(options: UseGameHistoryOptions = {}) {
  const { limit = 10, refreshInterval = 0 } = options;

  const url = `/api/game/history?limit=${limit}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<GameHistoryEntry[]>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    games: data ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function useActiveGame() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    game: GameHistoryEntry | null;
    hasActive: boolean;
  }>('/api/game/active', fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    dedupingInterval: 1000,
  });

  return {
    game: data?.game ?? null,
    gameState: data?.game?.state ?? null,
    hasActiveGame: data?.hasActive ?? false,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export default useGameHistory;
