import React from 'react';
import useSWR from 'swr';
import NavigationBar from './NavigationBar';
import LoadingSpinner from './LoadingSpinner';
import { UserSession } from '../types';

interface PlayerStatsProps {
  currentUser: UserSession | null;
  onBack: () => void;
}

interface PlayerStatistics {
  totalGames: number;
  totalWins: number;
  fastestLaps: number;
  bestAverages: number;
  circuitVictories: number;
  circuitRecords: Array<{
    circuitName: string;
    bestLap: number | null;
    bestAverage: number | null;
  }>;
  recentResults: Array<{
    date: string;
    position: number;
    totalPlayers: number;
  }>;
}

const formatTime = (ms: number | null): string => {
  if (ms === null || ms === undefined || ms === Infinity || !isFinite(ms)) return '-:--.---';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

const PlayerStats: React.FC<PlayerStatsProps> = ({ currentUser, onBack }) => {
  const { data: stats, error, isLoading } = useSWR<PlayerStatistics>(
    currentUser ? `/api/players/${currentUser.userId}/stats` : null,
    fetcher
  );

  if (!currentUser) {
    return <div className="min-h-screen bg-f1-black flex items-center justify-center">
      <p className="text-f1-red">Error: Usuario no autenticado</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-f1-black">
      <NavigationBar 
        title="Estadísticas"
        subtitle={currentUser.name}
        onBack={onBack}
      />
      
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center text-f1-red p-8">
            Error al cargar estadísticas
          </div>
        ) : stats ? (
          <>
            {/* Resumen General */}
            <div className="surface-primary border border-subtle rounded-md p-4">
              <h2 className="text-f1-lg font-bold text-primary mb-4">Resumen General</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-secondary text-f1-sm">Campeonatos</p>
                  <p className="text-f1-yellow text-f1-2xl font-bold">{stats.totalWins}</p>
                </div>
                <div>
                  <p className="text-secondary text-f1-sm">Partidos Jugados</p>
                  <p className="text-primary text-f1-2xl font-bold">{stats.totalGames}</p>
                </div>
                <div>
                  <p className="text-secondary text-f1-sm">Victorias V.Rápidas</p>
                  <p className="text-f1-green text-f1-2xl font-bold">{stats.fastestLaps}</p>
                </div>
                <div>
                  <p className="text-secondary text-f1-sm">Victorias Promedios</p>
                  <p className="text-purple-400 text-f1-2xl font-bold">{stats.bestAverages}</p>
                </div>
                <div>
                  <p className="text-secondary text-f1-sm">Total Victorias</p>
                  <p className="text-f1-red text-f1-2xl font-bold">{stats.circuitVictories}</p>
                </div>
              </div>
            </div>

            {/* Récords por Circuito */}
            {stats.circuitRecords.length > 0 && (
              <div className="surface-primary border border-subtle rounded-md">
                <div className="p-4 border-b border-subtle">
                  <h2 className="text-f1-lg font-bold text-primary">Récords por Circuito</h2>
                </div>
                <div className="divide-y divide-subtle">
                  {stats.circuitRecords.map((record, index) => (
                    <div key={index} className="p-4">
                      <h3 className="text-primary font-semibold mb-2">{record.circuitName}</h3>
                      <div className="grid grid-cols-2 gap-4 text-f1-sm">
                        <div>
                          <span className="text-secondary">Mejor Vuelta</span>
                          <p className="text-primary font-mono font-bold">
                            {formatTime(record.bestLap)}
                          </p>
                        </div>
                        <div>
                          <span className="text-secondary">Mejor Promedio</span>
                          <p className="text-primary font-mono font-bold">
                            {formatTime(record.bestAverage)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resultados Recientes */}
            {stats.recentResults.length > 0 && (
              <div className="surface-primary border border-subtle rounded-md">
                <div className="p-4 border-b border-subtle">
                  <h2 className="text-f1-lg font-bold text-primary">Últimos Resultados</h2>
                </div>
                <div className="divide-y divide-subtle">
                  {stats.recentResults.map((result, index) => (
                    <div key={index} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-primary font-semibold">
                          Posición {result.position} de {result.totalPlayers}
                        </p>
                        <p className="text-secondary text-f1-sm">
                          {new Date(result.date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className={`text-f1-2xl font-bold ${
                        result.position === 1 ? 'text-f1-yellow' :
                        result.position <= 3 ? 'text-primary' :
                        'text-secondary'
                      }`}>
                        P{result.position}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sin datos */}
            {stats.totalGames === 0 && (
              <div className="surface-primary border border-subtle rounded-md p-8 text-center">
                <p className="text-secondary text-f1-base">
                  Aún no has participado en ningún campeonato
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PlayerStats;