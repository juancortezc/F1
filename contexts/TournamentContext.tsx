import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tournament, Championship, TournamentParticipant } from '../types';

interface TournamentContextType {
  activeTournament: Tournament | null;
  isLoading: boolean;
  error: string | null;
  refreshTournament: () => Promise<void>;
  isInTournamentMode: boolean;
  currentChampionshipPosition: number;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

interface TournamentProviderProps {
  children: React.ReactNode;
}

export const TournamentProvider: React.FC<TournamentProviderProps> = ({ children }) => {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTournament = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tournaments/active');
      
      if (response.status === 404) {
        // No active tournament, this is normal
        setActiveTournament(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch active tournament');
      }
      
      const data = await response.json();
      if (data.success && data.tournament) {
        setActiveTournament(data.tournament);
      }
    } catch (err) {
      console.error('Error fetching active tournament:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTournament();
  }, []);

  const refreshTournament = async () => {
    await fetchActiveTournament();
  };

  const isInTournamentMode = activeTournament !== null && activeTournament.status === 'ACTIVE';
  
  const currentChampionshipPosition = activeTournament 
    ? (activeTournament.championships?.filter((c: Championship) => c.status === 'COMPLETED').length || 0) + 1
    : 0;

  return (
    <TournamentContext.Provider
      value={{
        activeTournament,
        isLoading,
        error,
        refreshTournament,
        isInTournamentMode,
        currentChampionshipPosition,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};