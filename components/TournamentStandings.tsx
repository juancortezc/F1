import React from 'react';
import useSWR from 'swr';
import { Tournament, TournamentStanding } from '../types';
import NavigationBar from './NavigationBar';
import LoadingSpinner from './LoadingSpinner';

interface TournamentStandingsProps {
  tournamentId: string;
  onBack: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const TournamentStandings: React.FC<TournamentStandingsProps> = ({ tournamentId, onBack }) => {
  const { data, error, isLoading } = useSWR(`/api/tournaments/${tournamentId}/standings`, fetcher, {
    refreshInterval: 5000 // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavigationBar onBack={onBack} title="Torneo" />
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavigationBar onBack={onBack} title="Torneo" />
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-red-900/20 border border-red-600 rounded-md p-4 text-center">
            <p className="text-red-300">Error al cargar datos del torneo</p>
          </div>
        </div>
      </div>
    );
  }

  const tournament = data.tournament;
  const standings: TournamentStanding[] = data.standings;
  const summary = data.summary;
  const championships = data.championships;

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-amber-400'; // Gold
      case 2: return 'text-zinc-300';  // Silver
      case 3: return 'text-amber-500'; // Bronze
      default: return 'text-zinc-100';
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return position.toString();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <NavigationBar
        onBack={onBack}
        title={tournament.name}
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Tournament Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-zinc-400 mt-1">{tournament.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  tournament.status === 'ACTIVE' ? 'bg-green-900 text-green-300' : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {tournament.status === 'ACTIVE' ? 'Activo' : 'Completado'}
                </span>
                <span className="text-zinc-400 text-sm">
                  Sistema: {tournament.pointsForFirst}-{tournament.pointsForSecond}-{tournament.pointsForThird}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-100">
                {summary.completedChampionships}/{tournament.maxChampionships}
              </div>
              <div className="text-zinc-400 text-sm">Campeonatos</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-zinc-800 rounded-full h-2">
              <div 
                className="bg-f1-red h-2 rounded-full transition-all duration-300"
                style={{ width: `${(summary.completedChampionships / tournament.maxChampionships) * 100}%` }}
              />
            </div>
            <div className="text-center mt-2 text-sm text-zinc-400">
              {Math.round((summary.completedChampionships / tournament.maxChampionships) * 100)}% completado
            </div>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
          <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700">
            <h2 className="text-lg font-bold text-zinc-100">Clasificación General</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr className="text-xs font-mono uppercase tracking-wide text-zinc-400">
                  <th className="px-3 py-2 text-center">POS</th>
                  <th className="px-3 py-2 text-left">PILOTO</th>
                  <th className="px-3 py-2 text-center">PTS</th>
                  <th className="px-3 py-2 text-center">🥇</th>
                  <th className="px-3 py-2 text-center">🥈</th>
                  <th className="px-3 py-2 text-center">🥉</th>
                  <th className="px-3 py-2 text-center">CAR</th>
                  <th className="px-3 py-2 text-center">PART</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing) => (
                  <tr
                    key={standing.player.id}
                    className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className={`px-3 py-2 text-center font-mono font-bold ${getPositionColor(standing.position)}`}>
                      {getPositionBadge(standing.position)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={standing.player.imageUrl}
                          alt={standing.player.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="font-semibold text-zinc-100">{standing.player.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-zinc-100">
                      {standing.totalPoints}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-zinc-300">
                      {standing.championshipsWon}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-zinc-300">
                      {standing.championshipsSecond}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-zinc-300">
                      {standing.championshipsThird}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-zinc-300">
                      {standing.championshipsTotal}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-zinc-400">
                      {standing.participationRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Championships History */}
        {championships.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md">
            <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700">
              <h2 className="text-lg font-bold text-zinc-100">Historial de Campeonatos</h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                {championships.map((championship: any) => (
                  <div
                    key={championship.id}
                    className="flex items-center justify-between p-3 bg-zinc-800 rounded-md"
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">{championship.name}</div>
                      <div className="text-sm text-zinc-400">
                        Campeonato {championship.position}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        championship.status === 'COMPLETED' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {championship.status === 'COMPLETED' ? 'Completado' : 'En Progreso'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tournament Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Resumen</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-100">{summary.totalParticipants}</div>
              <div className="text-sm text-zinc-400">Participantes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-100">{summary.completedChampionships}</div>
              <div className="text-sm text-zinc-400">Completados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-100">{tournament.maxChampionships - summary.completedChampionships}</div>
              <div className="text-sm text-zinc-400">Restantes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-100">{summary.averagePointsPerChampionship.toFixed(1)}</div>
              <div className="text-sm text-zinc-400">Pts Promedio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentStandings;