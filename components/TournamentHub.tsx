import React, { useEffect, useState } from 'react';
import useSWR from 'swr';

interface Tournament {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pointsForFirst: number;
  pointsForSecond: number;
  pointsForThird: number;
  playedCircuitIds: string[];
  startDate: string;
  endDate?: string;
  participants: TournamentParticipant[];
  games: any[];
}

interface TournamentParticipant {
  id: string;
  playerId: string;
  totalPoints: number;
  championshipsWon: number;
  championshipsSecond: number;
  championshipsThird: number;
  championshipsPlayed: number;
  player?: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

interface TournamentHubProps {
  onBack: () => void;
  onCreateTournament: () => void;
  onContinueTournament: (tournament: Tournament) => void;
  onViewStandings: (tournament: Tournament) => void;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TournamentHub: React.FC<TournamentHubProps> = ({
  onBack,
  onCreateTournament,
  onContinueTournament,
  onViewStandings,
}) => {
  const { data: activeTournament, isLoading: loadingActive } = useSWR<{ tournament: Tournament | null }>(
    '/api/tournaments/active',
    fetcher
  );

  const { data: allTournamentsData, isLoading: loadingAll } = useSWR<{ success: boolean; tournaments: Tournament[] }>(
    '/api/tournaments',
    fetcher
  );

  const [totalCircuits, setTotalCircuits] = useState(0);

  useEffect(() => {
    fetch('/api/circuits')
      .then(r => r.json())
      .then(data => setTotalCircuits(Array.isArray(data) ? data.length : 0));
  }, []);

  const allTournaments = allTournamentsData?.tournaments || [];
  const completedTournaments = allTournaments.filter(t => t.status === 'COMPLETED');
  const cancelledTournaments = allTournaments.filter(t => t.status === 'CANCELLED');

  const isLoading = loadingActive || loadingAll;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold text-white">TORNEOS</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Cargando...</div>
          </div>
        ) : (
          <>
            {/* Active Tournament Section */}
            {activeTournament?.tournament ? (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-zinc-300 mb-4">TORNEO ACTIVO</h2>
                <div
                  className="rounded-lg p-6"
                  style={{
                    background: 'linear-gradient(135deg, #E10600 0%, #AA0400 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{activeTournament.tournament.name}</h3>
                      {activeTournament.tournament.description && (
                        <p className="text-white/70 text-sm mt-1">{activeTournament.tournament.description}</p>
                      )}
                    </div>
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                      EN CURSO
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {activeTournament.tournament.playedCircuitIds.length}
                      </div>
                      <div className="text-white/60 text-xs">Circuitos jugados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {totalCircuits - activeTournament.tournament.playedCircuitIds.length}
                      </div>
                      <div className="text-white/60 text-xs">Restantes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {activeTournament.tournament.participants.length}
                      </div>
                      <div className="text-white/60 text-xs">Participantes</div>
                    </div>
                  </div>

                  {/* Top 3 standings */}
                  {activeTournament.tournament.participants.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-3 mb-4">
                      <div className="text-white/60 text-xs mb-2">CLASIFICACIÓN</div>
                      {[...activeTournament.tournament.participants]
                        .sort((a, b) => b.totalPoints - a.totalPoints)
                        .slice(0, 3)
                        .map((p, i) => (
                          <div key={p.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-300' : 'text-amber-600'}`}>
                                {i + 1}.
                              </span>
                              <span className="text-white text-sm">{p.player?.name || 'Jugador'}</span>
                            </div>
                            <span className="text-white font-bold">{p.totalPoints} pts</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => onContinueTournament(activeTournament.tournament!)}
                      className="flex-1 bg-white text-red-600 font-bold py-3 rounded-lg hover:bg-zinc-100 transition-colors"
                    >
                      CONTINUAR
                    </button>
                    <button
                      onClick={() => onViewStandings(activeTournament.tournament!)}
                      className="flex-1 bg-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/30 transition-colors"
                    >
                      VER DETALLES
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* No Active Tournament - Show Create Button */
              <div className="mb-8">
                <button
                  onClick={onCreateTournament}
                  className="w-full rounded-lg p-8 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #E10600 0%, #AA0400 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 15px rgba(225, 6, 0, 0.3)',
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-4">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-white font-bold text-xl">CREAR NUEVO TORNEO</span>
                    <span className="text-white/60 text-sm">
                      {totalCircuits} circuitos disponibles
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Completed Tournaments */}
            {completedTournaments.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-zinc-300 mb-4">TORNEOS COMPLETADOS</h2>
                <div className="space-y-3">
                  {completedTournaments.map(tournament => (
                    <button
                      key={tournament.id}
                      onClick={() => onViewStandings(tournament)}
                      className="w-full bg-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-semibold">{tournament.name}</h3>
                          <p className="text-zinc-500 text-sm">
                            {tournament.playedCircuitIds.length} circuitos
                            {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled Tournaments */}
            {cancelledTournaments.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-zinc-500 mb-4">TORNEOS CANCELADOS</h2>
                <div className="space-y-3">
                  {cancelledTournaments.map(tournament => (
                    <button
                      key={tournament.id}
                      onClick={() => onViewStandings(tournament)}
                      className="w-full bg-zinc-900/50 rounded-lg p-4 hover:bg-zinc-900 transition-colors text-left opacity-60"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-zinc-400 font-semibold">{tournament.name}</h3>
                          <p className="text-zinc-600 text-sm">
                            {tournament.playedCircuitIds.length} circuitos jugados - Cancelado
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {completedTournaments.length === 0 && cancelledTournaments.length === 0 && !activeTournament?.tournament && (
              <div className="text-center py-12">
                <p className="text-zinc-500">No hay torneos registrados</p>
                <p className="text-zinc-600 text-sm mt-1">Crea tu primer torneo para comenzar</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TournamentHub;
