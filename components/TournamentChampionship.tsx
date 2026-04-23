import React, { useState, useEffect } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import NavigationBar from './NavigationBar';

interface Tournament {
  id: string;
  name: string;
  participants: {
    playerId: string;
    player?: Player;
  }[];
  playedCircuitIds: string[];
  pointsForFirst: number;
  pointsForSecond: number;
  pointsForThird: number;
}

interface AvailableCircuitsResponse {
  tournamentId: string;
  availableCircuits: Circuit[];
  playedCircuits: Circuit[];
  totalCircuits: number;
  availableCount: number;
  playedCount: number;
}

interface TournamentChampionshipProps {
  tournament: Tournament;
  players: Player[];
  onStartRace: (settings: GameSettings, tournamentId: string, position: number) => void;
  onCancel: () => void;
}

const TournamentChampionship: React.FC<TournamentChampionshipProps> = ({
  tournament,
  players,
  onStartRace,
  onCancel,
}) => {
  const [availableCircuits, setAvailableCircuits] = useState<Circuit[]>([]);
  const [playedCircuits, setPlayedCircuits] = useState<Circuit[]>([]);
  const [selectedCircuits, setSelectedCircuits] = useState<Circuit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'circuits' | 'config'>('circuits');

  // Race configuration
  const [lapsPerTurn, setLapsPerTurn] = useState<3 | 5>(3);
  const [turnsPerCircuit, setTurnsPerCircuit] = useState(2);
  const [scoringMethod, setScoringMethod] = useState<'average' | 'lap' | 'both'>('average');
  const [pointsForBestLap, setPointsForBestLap] = useState(2);
  const [pointsForBestAverage, setPointsForBestAverage] = useState(0);

  // Get tournament participants as Player objects
  const tournamentPlayers = tournament.participants
    .map(p => players.find(player => player.id === p.playerId))
    .filter((p): p is Player => p !== undefined);

  useEffect(() => {
    fetchAvailableCircuits();
  }, [tournament.id]);

  const fetchAvailableCircuits = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/available-circuits`);
      const data: AvailableCircuitsResponse = await response.json();
      setAvailableCircuits(data.availableCircuits);
      setPlayedCircuits(data.playedCircuits);
    } catch (error) {
      console.error('Error fetching circuits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCircuitToggle = (circuit: Circuit) => {
    setSelectedCircuits(prev => {
      if (prev.find(c => c.id === circuit.id)) {
        return prev.filter(c => c.id !== circuit.id);
      }
      return [...prev, circuit];
    });
  };

  const handleRandomCircuits = (count: number) => {
    const shuffled = [...availableCircuits].sort(() => Math.random() - 0.5);
    setSelectedCircuits(shuffled.slice(0, count));
  };

  const handleStartRace = () => {
    if (selectedCircuits.length === 0) {
      alert('Selecciona al menos un circuito');
      return;
    }

    const settings: GameSettings = {
      players: tournamentPlayers,
      circuits: selectedCircuits,
      controllerIds: tournamentPlayers.map(p => p.id),
      lapsPerTurn,
      turnsPerCircuit,
      scoringMethod,
      scoringMultiplier: null,
      pointsForBestLap,
      pointsForBestAverage,
      awardBestTimeFor: 'circuit',
      useBest4Of5Laps: lapsPerTurn === 5,
    };

    const position = playedCircuits.length + 1;
    onStartRace(settings, tournament.id, position);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Cargando circuitos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavigationBar
        onBack={onCancel}
        title={`Campeonato #${playedCircuits.length + 1}`}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-6 pb-32">
          {/* Tournament Info */}
          <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-800/50 rounded-lg p-4">
            <h2 className="text-lg font-bold text-white mb-2">{tournament.name}</h2>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Circuitos jugados:</span>
                <span className="text-white font-bold ml-2">{playedCircuits.length}</span>
              </div>
              <div>
                <span className="text-zinc-400">Disponibles:</span>
                <span className="text-white font-bold ml-2">{availableCircuits.length}</span>
              </div>
            </div>
          </div>

          {/* Participants (Read-only) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">PARTICIPANTES DEL TORNEO</h3>
            <div className="flex flex-wrap gap-2">
              {tournamentPlayers.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-1"
                >
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-zinc-200 text-sm">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

          {step === 'circuits' && (
            <>
              {/* Circuit Selection */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-zinc-400">
                    SELECCIONAR CIRCUITOS ({selectedCircuits.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRandomCircuits(1)}
                      className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded"
                    >
                      1 Random
                    </button>
                    <button
                      onClick={() => handleRandomCircuits(3)}
                      className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded"
                    >
                      3 Random
                    </button>
                    <button
                      onClick={() => handleRandomCircuits(5)}
                      className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded"
                    >
                      5 Random
                    </button>
                  </div>
                </div>

                {availableCircuits.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No hay circuitos disponibles. El torneo está completo.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableCircuits.map(circuit => {
                      const isSelected = selectedCircuits.find(c => c.id === circuit.id);
                      return (
                        <button
                          key={circuit.id}
                          onClick={() => handleCircuitToggle(circuit)}
                          className={`relative rounded-lg overflow-hidden transition-all ${
                            isSelected
                              ? 'ring-2 ring-red-500 scale-105'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={circuit.imageUrl}
                            alt={circuit.name}
                            className="w-full h-20 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <span className="text-white text-xs font-semibold">{circuit.name}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Played Circuits (Info) */}
              {playedCircuits.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-zinc-500 mb-3">CIRCUITOS YA JUGADOS</h3>
                  <div className="flex flex-wrap gap-2">
                    {playedCircuits.map(circuit => (
                      <span
                        key={circuit.id}
                        className="text-xs bg-zinc-800 text-zinc-500 px-2 py-1 rounded"
                      >
                        {circuit.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Button */}
              <button
                onClick={() => setStep('config')}
                disabled={selectedCircuits.length === 0}
                className="w-full bg-f1-red text-white font-bold py-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                SIGUIENTE: CONFIGURAR CARRERA
              </button>
            </>
          )}

          {step === 'config' && (
            <>
              {/* Selected Circuits Summary */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-zinc-400">CIRCUITOS SELECCIONADOS</h3>
                  <button
                    onClick={() => setStep('circuits')}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Cambiar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCircuits.map(circuit => (
                    <span
                      key={circuit.id}
                      className="text-sm bg-red-900/30 text-red-300 px-3 py-1 rounded-full"
                    >
                      {circuit.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Race Configuration */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-400">CONFIGURACIÓN DE CARRERA</h3>

                {/* Laps per Turn */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">Vueltas por turno</label>
                  <div className="flex gap-3">
                    {[3, 5].map(num => (
                      <button
                        key={num}
                        onClick={() => setLapsPerTurn(num as 3 | 5)}
                        className={`flex-1 py-2 rounded-md font-bold transition-colors ${
                          lapsPerTurn === num
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {num} vueltas
                      </button>
                    ))}
                  </div>
                </div>

                {/* Turns per Circuit */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">Turnos por circuito</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map(num => (
                      <button
                        key={num}
                        onClick={() => setTurnsPerCircuit(num)}
                        className={`flex-1 py-2 rounded-md font-bold transition-colors ${
                          turnsPerCircuit === num
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scoring Method */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">Clasificación por</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setScoringMethod('average')}
                      className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${
                        scoringMethod === 'average'
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Promedio
                    </button>
                    <button
                      onClick={() => setScoringMethod('lap')}
                      className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${
                        scoringMethod === 'lap'
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Vuelta Rápida
                    </button>
                    <button
                      onClick={() => setScoringMethod('both')}
                      className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${
                        scoringMethod === 'both'
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Ambos
                    </button>
                  </div>
                </div>

                {/* Bonus Points */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">Bonus VR (Vuelta Rápida)</label>
                    <select
                      value={pointsForBestLap}
                      onChange={(e) => setPointsForBestLap(Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100"
                    >
                      <option value={0}>Sin bonus</option>
                      <option value={1}>+1 punto</option>
                      <option value={2}>+2 puntos</option>
                      <option value={3}>+3 puntos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-300 mb-2">Bonus PR (Mejor Promedio)</label>
                    <select
                      value={pointsForBestAverage}
                      onChange={(e) => setPointsForBestAverage(Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100"
                    >
                      <option value={0}>Sin bonus</option>
                      <option value={1}>+1 punto</option>
                      <option value={2}>+2 puntos</option>
                      <option value={3}>+3 puntos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep('circuits')}
                  className="flex-1 bg-zinc-700 text-zinc-100 font-bold py-3 rounded-md hover:bg-zinc-600 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={handleStartRace}
                  className="flex-1 bg-f1-red text-white font-bold py-3 rounded-md hover:bg-red-700 transition-colors"
                >
                  INICIAR CARRERA
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentChampionship;
