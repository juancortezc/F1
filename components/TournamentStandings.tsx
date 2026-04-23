import React, { useState } from 'react';
import useSWR from 'swr';
import { TournamentStanding } from '../types';
import NavigationBar from './NavigationBar';
import LoadingSpinner from './LoadingSpinner';
import TournamentResults from './TournamentResults';
import UserAvatar from './UserAvatar';

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

  const first = standings[0];
  const second = standings[1];
  const third = standings[2];

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

        {/* Podium Cards */}
        {standings.length > 0 && (
          <div className="flex justify-center items-end gap-4 mb-2">
            {/* Second Place - Left */}
            {second && (
              <div
                className="relative rounded-lg border border-zinc-700 p-4 text-center"
                style={{ backgroundColor: '#242424', minHeight: '160px', width: '110px' }}
              >
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-400 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800">
                  <span className="font-mono font-bold text-sm text-black">2</span>
                </div>
                <div className="relative inline-block">
                  <UserAvatar
                    imageUrl={second.player.imageUrl}
                    name={second.player.name}
                    className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                  />
                </div>
                <h3 className="text-white font-semibold text-sm truncate">{second.player.name}</h3>
                <div className="mt-1 font-mono font-bold text-yellow-400 text-lg">{second.totalPoints}</div>
                <div className="text-xs text-zinc-500">pts</div>
              </div>
            )}

            {/* First Place - Center (Larger) */}
            {first && (
              <div
                className="relative rounded-lg border border-zinc-600 p-6 text-center"
                style={{ backgroundColor: '#242424', minHeight: '185px', width: '130px' }}
              >
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800 shadow-lg">
                  <span className="font-mono font-bold text-base text-black">1</span>
                </div>
                <div className="relative inline-block">
                  <UserAvatar
                    imageUrl={first.player.imageUrl}
                    name={first.player.name}
                    className="w-20 h-20 mx-auto mb-3 ring-2 ring-f1-red"
                  />
                </div>
                <h3 className="text-white font-bold text-base truncate">{first.player.name}</h3>
                <div className="mt-1 font-mono font-bold text-yellow-400 text-xl">{first.totalPoints}</div>
                <div className="text-xs text-zinc-500">pts</div>
              </div>
            )}

            {/* Third Place - Right */}
            {third && (
              <div
                className="relative rounded-lg border border-zinc-700 p-4 text-center"
                style={{ backgroundColor: '#242424', minHeight: '160px', width: '110px' }}
              >
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center z-10 border-2 border-zinc-800">
                  <span className="font-mono font-bold text-sm text-white">3</span>
                </div>
                <div className="relative inline-block">
                  <UserAvatar
                    imageUrl={third.player.imageUrl}
                    name={third.player.name}
                    className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                  />
                </div>
                <h3 className="text-white font-semibold text-sm truncate">{third.player.name}</h3>
                <div className="mt-1 font-mono font-bold text-yellow-400 text-lg">{third.totalPoints}</div>
                <div className="text-xs text-zinc-500">pts</div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Table */}
        <div className="rounded-lg border border-zinc-800" style={{ backgroundColor: '#242424' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#2A2A2A' }}>
                  <th className="px-1 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">POS</th>
                  <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-wider text-zinc-400">JUGADOR</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">PTS</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">1°</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">2°</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">3°</th>
                  <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-wider text-zinc-400">CAR</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => (
                  <tr key={standing.player.id} className="border-t border-zinc-800">
                    <td className="px-1 py-3 text-center">
                      <span className={`font-mono font-bold text-sm
                        ${index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-zinc-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-zinc-300'}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          imageUrl={standing.player.imageUrl}
                          name={standing.player.name}
                          className="w-8 h-8"
                        />
                        <span className="text-white font-semibold text-base">
                          {standing.player.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-yellow-400 text-lg">
                        {standing.totalPoints}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-yellow-500 text-base">
                        {standing.championshipsWon}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-zinc-400 text-base">
                        {standing.championshipsSecond}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono font-bold text-orange-600 text-base">
                        {standing.championshipsThird}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-mono text-zinc-300 text-base">
                        {standing.championshipsPlayed}
                      </span>
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
