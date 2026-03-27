import React, { useState } from 'react';
import useSWR from 'swr';
import { TournamentStanding } from '../types';
import NavigationBar from './NavigationBar';
import LoadingSpinner from './LoadingSpinner';
import TournamentResults from './TournamentResults';

interface TournamentStandingsProps {
  tournamentId: string;
  onBack: () => void;
}

interface GameSummary {
  id: string;
  status: string;
  position: number;
  gameMode: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const TournamentStandings: React.FC<TournamentStandingsProps> = ({ tournamentId, onBack }) => {
  const [showResults, setShowResults] = useState(false);

  const { data, error, isLoading } = useSWR(`/api/tournaments/${tournamentId}/standings`, fetcher, {
    refreshInterval: 5000 // Refresh every 5 seconds
  });

  // Show detailed results view
  if (showResults) {
    return (
      <TournamentResults
        tournamentId={tournamentId}
        onBack={() => setShowResults(false)}
      />
    );
  }

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
  const games: GameSummary[] = data.games || [];

  // Calculate total circuits from API or use playedCircuitIds length
  const circuitsPlayed = tournament.playedCircuitIds?.length || summary.circuitsPlayed || 0;
  const completedGames = summary.completedGames || games.filter((g: GameSummary) => g.status === 'COMPLETED').length;

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
                {circuitsPlayed}
              </div>
              <div className="text-zinc-400 text-sm">Circuitos jugados</div>
            </div>
          </div>

          {/* Progress info */}
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <span>{completedGames} campeonato{completedGames !== 1 ? 's' : ''} completado{completedGames !== 1 ? 's' : ''}</span>
            {tournament.startDate && (
              <span>Inicio: {new Date(tournament.startDate).toLocaleDateString('es-ES')}</span>
            )}
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
                      {standing.championshipsPlayed}
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

        {/* Games History */}
        {games.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md">
            <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Historial de Campeonatos</h2>
              <button
                onClick={() => setShowResults(true)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
              >
                Ver Detalles
              </button>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {games.map((game: GameSummary, index: number) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 bg-zinc-800 rounded-md cursor-pointer hover:bg-zinc-700 transition-colors"
                    onClick={() => setShowResults(true)}
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">
                        Campeonato {game.position || index + 1}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {new Date(game.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        game.status === 'COMPLETED'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {game.status === 'COMPLETED' ? 'Completado' : 'En Progreso'}
                      </div>
                      <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
              <div className="text-2xl font-bold text-zinc-100">{completedGames}</div>
              <div className="text-sm text-zinc-400">Campeonatos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-100">{circuitsPlayed}</div>
              <div className="text-sm text-zinc-400">Circuitos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-100">
                {summary.averagePointsPerGame?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-zinc-400">Pts Promedio</div>
            </div>
          </div>
        </div>

        {/* View Results Button - Mobile Prominent */}
        {games.length > 0 && (
          <button
            onClick={() => setShowResults(true)}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            VER RESULTADOS DETALLADOS
          </button>
        )}
      </div>
    </div>
  );
};

export default TournamentStandings;
