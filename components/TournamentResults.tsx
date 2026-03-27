import React, { useState } from 'react';
import useSWR from 'swr';

interface Tournament {
  id: string;
  name: string;
  status: string;
  pointsForFirst: number;
  pointsForSecond: number;
  pointsForThird: number;
}

interface PlayerResult {
  playerId: string;
  playerName: string;
  playerImage?: string;
  totalScore: number;
  position: number;
  bestLaps: number;
  bestAverages: number;
  firsts: number;
  seconds: number;
  thirds: number;
}

interface CircuitResult {
  playerId: string;
  playerName: string;
  bestLap: number | null;
  average: number | null;
  position: number;
  points: number;
}

interface GameCircuit {
  id: string;
  name: string;
  imageUrl: string;
  results: CircuitResult[];
}

interface GameDetails {
  id: string;
  position: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  standings: PlayerResult[];
  circuits: GameCircuit[];
  pointsAwarded: { playerId: string; playerName: string; position: number; points: number }[];
  settings: {
    turnsPerCircuit: number;
    lapsPerTurn: number;
    pointsPerPosition: number[];
    pointsForBestLap: number;
    pointsForBestAverage: number;
  };
}

interface TournamentResultsProps {
  tournamentId: string;
  onBack: () => void;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const formatTime = (ms: number | null): string => {
  if (!ms) return '--:--.---';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const TournamentResults: React.FC<TournamentResultsProps> = ({ tournamentId, onBack }) => {
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);

  const { data, isLoading, error } = useSWR<{
    success: boolean;
    tournament: Tournament;
    games: GameDetails[];
    totalGames: number;
  }>(`/api/tournaments/${tournamentId}/games`, fetcher);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-zinc-400">Cargando resultados...</div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="text-red-500">Error al cargar resultados</div>
        <button onClick={onBack} className="text-zinc-400 hover:text-white">
          Volver
        </button>
      </div>
    );
  }

  const { tournament, games } = data;

  const getPositionColor = (pos: number) => {
    if (pos === 1) return 'text-amber-400';
    if (pos === 2) return 'text-zinc-300';
    if (pos === 3) return 'text-amber-600';
    return 'text-zinc-500';
  };

  const getPositionBg = (pos: number) => {
    if (pos === 1) return 'bg-amber-400/10 border-amber-400/30';
    if (pos === 2) return 'bg-zinc-300/10 border-zinc-300/30';
    if (pos === 3) return 'bg-amber-600/10 border-amber-600/30';
    return 'bg-zinc-800/50 border-zinc-700';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-xl font-bold text-white">RESULTADOS</h1>
          <div className="w-16" />
        </div>

        {/* Tournament Info */}
        <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-1">{tournament.name}</h2>
          <p className="text-zinc-400 text-sm">
            {games.length} campeonato{games.length !== 1 ? 's' : ''} jugado{games.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-zinc-500">
            <span>1°: {tournament.pointsForFirst} pts</span>
            <span>2°: {tournament.pointsForSecond} pts</span>
            <span>3°: {tournament.pointsForThird} pts</span>
          </div>
        </div>

        {/* Games List */}
        {games.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No hay campeonatos completados aún</p>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((game, index) => (
              <div key={game.id} className="bg-zinc-900/50 rounded-lg overflow-hidden">
                {/* Game Header - Clickable */}
                <button
                  onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                  className="w-full p-4 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        Campeonato {game.position || index + 1}
                      </h3>
                      <p className="text-zinc-500 text-sm">
                        {game.circuits.length} circuito{game.circuits.length !== 1 ? 's' : ''} - {' '}
                        {new Date(game.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Winner Badge */}
                      {game.standings[0] && (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-sm font-bold">
                            {game.standings[0].playerName}
                          </span>
                        </div>
                      )}
                      <svg
                        className={`w-5 h-5 text-zinc-500 transition-transform ${
                          expandedGame === game.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Quick Results - Always Visible */}
                  <div className="flex gap-2 mt-3">
                    {game.pointsAwarded.slice(0, 3).map((p) => (
                      <div
                        key={p.playerId}
                        className={`px-3 py-1 rounded border ${getPositionBg(p.position)}`}
                      >
                        <span className={`text-xs font-bold ${getPositionColor(p.position)}`}>
                          {p.position}° {p.playerName.split(' ')[0]}
                        </span>
                        <span className="text-zinc-500 text-xs ml-2">+{p.points}</span>
                      </div>
                    ))}
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedGame === game.id && (
                  <div className="border-t border-zinc-800">
                    {/* Final Standings */}
                    <div className="p-4">
                      <h4 className="text-zinc-400 text-xs font-semibold mb-3 uppercase tracking-wide">
                        Clasificación Final
                      </h4>
                      <div className="space-y-2">
                        {game.standings.map((player) => (
                          <div
                            key={player.playerId}
                            className={`flex items-center justify-between p-3 rounded ${getPositionBg(player.position)}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`font-bold text-lg w-8 ${getPositionColor(player.position)}`}>
                                {player.position}
                              </span>
                              <span className="text-white font-semibold">{player.playerName}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-white font-bold">{player.totalScore} pts</div>
                                <div className="text-zinc-500 text-xs">
                                  VR:{player.bestLaps} PR:{player.bestAverages}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Circuit Results */}
                    <div className="p-4 border-t border-zinc-800">
                      <h4 className="text-zinc-400 text-xs font-semibold mb-3 uppercase tracking-wide">
                        Resultados por Circuito
                      </h4>
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                        {game.circuits.map((circuit) => (
                          <button
                            key={circuit.id}
                            onClick={() => setSelectedCircuit(
                              selectedCircuit === circuit.id ? null : circuit.id
                            )}
                            className={`px-3 py-2 rounded text-sm whitespace-nowrap transition-colors ${
                              selectedCircuit === circuit.id
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                          >
                            {circuit.name}
                          </button>
                        ))}
                      </div>

                      {/* Selected Circuit Details */}
                      {selectedCircuit && (
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          {game.circuits
                            .filter((c) => c.id === selectedCircuit)
                            .map((circuit) => (
                              <div key={circuit.id}>
                                <h5 className="text-white font-semibold mb-3">{circuit.name}</h5>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-zinc-500 text-xs uppercase">
                                        <th className="text-left py-2 px-2">POS</th>
                                        <th className="text-left py-2 px-2">PILOTO</th>
                                        <th className="text-right py-2 px-2">MEJOR</th>
                                        <th className="text-right py-2 px-2">PROM</th>
                                        <th className="text-right py-2 px-2">PTS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {circuit.results.map((result) => (
                                        <tr
                                          key={result.playerId}
                                          className="border-t border-zinc-700/50"
                                        >
                                          <td className={`py-2 px-2 font-bold ${getPositionColor(result.position)}`}>
                                            {result.position}
                                          </td>
                                          <td className="py-2 px-2 text-white">
                                            {result.playerName}
                                          </td>
                                          <td className="py-2 px-2 text-right font-mono text-zinc-300">
                                            {formatTime(result.bestLap)}
                                          </td>
                                          <td className="py-2 px-2 text-right font-mono text-zinc-300">
                                            {formatTime(result.average)}
                                          </td>
                                          <td className="py-2 px-2 text-right text-white font-bold">
                                            {result.points}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Game Settings Info */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                        <span>Turnos: {game.settings?.turnsPerCircuit || '-'}</span>
                        <span>Vueltas: {game.settings?.lapsPerTurn || '-'}</span>
                        <span>VR: +{game.settings?.pointsForBestLap || 0}</span>
                        <span>PR: +{game.settings?.pointsForBestAverage || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentResults;
