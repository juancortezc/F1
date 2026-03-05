/**
 * Hook for fetching players
 */

import useSWR from 'swr';
import type { Player } from '../../domain/entities';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface UsePlayersOptions {
  includeGuests?: boolean;
  includeInactive?: boolean;
  refreshInterval?: number;
}

export function usePlayers(options: UsePlayersOptions = {}) {
  const {
    includeGuests = true,
    includeInactive = false,
    refreshInterval = 0,
  } = options;

  const params = new URLSearchParams();
  if (includeInactive) params.append('includeInactive', 'true');

  const url = `/api/players${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Player[]>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Filter players based on options
  const players = data ?? [];
  const activePlayers = players.filter((p) => !p.isGuest);
  const guestPlayers = players.filter((p) => p.isGuest);

  return {
    players: includeGuests ? players : activePlayers,
    activePlayers,
    guestPlayers,
    allPlayers: players,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

export function usePlayer(playerId?: string) {
  const url = playerId ? `/api/players/${playerId}` : null;

  const { data, error, isLoading, mutate } = useSWR<Player>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    player: data,
    error,
    isLoading,
    mutate,
  };
}

export function usePlayerStats(playerId?: string) {
  const url = playerId ? `/api/players/${playerId}/stats` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    stats: data,
    error,
    isLoading,
    mutate,
  };
}

export default usePlayers;
