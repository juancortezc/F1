import React, { useState, useEffect } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import UserAvatar from './UserAvatar';

interface F1CustomChampionshipProps {
  players: Player[];
  circuits: Circuit[];
  onBack: () => void;
  onStartRace: (settings: GameSettings) => void;
}

const F1CustomChampionship: React.FC<F1CustomChampionshipProps> = ({
  players,
  circuits,
  onBack,
  onStartRace
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Configuration state (Step 1)
  const [lapsPerTurn, setLapsPerTurn] = useState<3 | 5>(3);
  const [turnsPerCircuit, setTurnsPerCircuit] = useState<number>(2);
  const [scoringMethod, setScoringMethod] = useState<'lap' | 'average' | 'both'>('average');
  const [pointsForBestLap, setPointsForBestLap] = useState<0 | 1 | 2 | 3>(2);
  const [pointsForBestAverage, setPointsForBestAverage] = useState<0 | 1 | 2 | 3>(0);
  const [eliminateWorst, setEliminateWorst] = useState(false);
  
  // Selection state (Step 2)
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedCircuits, setSelectedCircuits] = useState<Circuit[]>([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showCircuitModal, setShowCircuitModal] = useState(false);
  const [selectedPlayerToRemove, setSelectedPlayerToRemove] = useState<Player | null>(null);

  // Auto-populate with main players (Berna, BlackMamba, Borgia) and random circuits on mount
  useEffect(() => {
    // Select the 3 main players: Berna, BlackMamba, Borgia (in random order)
    const mainPlayerNames = ['Berna', 'BlackMamba', 'Borgia'];
    const mainPlayers = players.filter(p =>
      mainPlayerNames.includes(p.name) && p.isActive
    );
    const randomizedPlayers = [...mainPlayers].sort(() => Math.random() - 0.5);
    setSelectedPlayers(randomizedPlayers);

    // Select 3 random circuits
    const randomCircuits = [...circuits].sort(() => Math.random() - 0.5).slice(0, 3);
    setSelectedCircuits(randomCircuits);
  }, [players, circuits]);

  const handleNextStep = () => {
    setCurrentStep(2);
  };

  const handleBackStep = () => {
    setCurrentStep(1);
  };

  const handlePlayerToggle = (player: Player) => {
    setSelectedPlayers(prev => 
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleCircuitToggle = (circuit: Circuit) => {
    setSelectedCircuits(prev => 
      prev.find(c => c.id === circuit.id)
        ? prev.filter(c => c.id !== circuit.id)
        : [...prev, circuit]
    );
  };

  const randomizePlayers = () => {
    // Only shuffle the order of currently selected players
    setSelectedPlayers(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const randomizeCircuits = () => {
    const currentIds = selectedCircuits.map(c => c.id);
    const availableCircuits = circuits.filter(c => !currentIds.includes(c.id));
    
    if (availableCircuits.length >= 3) {
      const newRandom = [...availableCircuits].sort(() => Math.random() - 0.5).slice(0, 3);
      setSelectedCircuits(newRandom);
    } else {
      // Shuffle existing selection
      setSelectedCircuits(prev => [...prev].sort(() => Math.random() - 0.5));
    }
  };

  const handleStartChampionship = () => {
    if (selectedPlayers.length < 2 || selectedCircuits.length < 1) return;

    const settings: GameSettings = {
      players: selectedPlayers,
      circuits: selectedCircuits,
      controllerIds: selectedPlayers.map(p => p.id),
      lapsPerTurn,
      turnsPerCircuit,
      scoringMethod,
      scoringMultiplier: null,
      pointsForBestLap,
      pointsForBestAverage,
      awardBestTimeFor: 'turn',
      useBest4Of5Laps: eliminateWorst && lapsPerTurn === 5
    };

    onStartRace(settings);
  };

  const renderStep1 = () => (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-20">
        {/* Title and Next Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">CUSTOM</h1>
          <button
            onClick={handleNextStep}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-md text-sm transition-colors"
          >
            SIGUIENTE
          </button>
        </div>

        {/* Vueltas Section */}
        <div className="mb-6">
          <h2 className="text-white text-base font-bold mb-3 uppercase tracking-wider">VUELTAS</h2>
          <div className="flex gap-3 items-center">
            {[3, 5].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setLapsPerTurn(num as 3 | 5);
                  // Reset eliminateWorst if switching to 3 laps
                  if (num === 3) {
                    setEliminateWorst(false);
                  }
                }}
                className={`
                  w-14 h-14 rounded-md border-2 font-bold text-lg transition-all
                  ${lapsPerTurn === num 
                    ? 'bg-f1-red border-f1-red text-white' 
                    : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                  }
                `}
              >
                {num}
              </button>
            ))}
            {lapsPerTurn === 5 && (
              <div className="flex items-center gap-2 ml-6">
                <span className="text-white text-sm">ELIMINA 1</span>
                <button
                  onClick={() => setEliminateWorst(!eliminateWorst)}
                  className={`
                    w-8 h-8 rounded border-2 flex items-center justify-center transition-all
                    ${eliminateWorst 
                      ? 'bg-f1-red border-f1-red' 
                      : 'bg-transparent border-zinc-600 hover:border-f1-red'
                    }
                  `}
                >
                  {eliminateWorst && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Turnos Section */}
        <div className="mb-6">
          <h2 className="text-white text-base font-bold mb-3 uppercase tracking-wider">TURNOS</h2>
          <div className="flex gap-3">
            {[1, 2, 3, 5].map((num) => (
              <button
                key={num}
                onClick={() => setTurnsPerCircuit(num)}
                className={`
                  w-14 h-14 rounded-md border-2 font-bold text-lg transition-all
                  ${turnsPerCircuit === num 
                    ? 'bg-f1-red border-f1-red text-white' 
                    : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Clasificacion Por Section */}
        <div className="mb-6">
          <h2 className="text-white text-base font-bold mb-3 uppercase tracking-wider">CLASIFICACION POR</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setScoringMethod('lap')}
              className={`
                px-4 py-2.5 rounded-md border-2 font-semibold text-sm transition-all
                ${scoringMethod === 'lap' 
                  ? 'bg-f1-red border-f1-red text-white' 
                  : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                }
              `}
            >
              VUELTA
            </button>
            <button
              onClick={() => setScoringMethod('average')}
              className={`
                px-4 py-2.5 rounded-md border-2 font-semibold text-sm transition-all
                ${scoringMethod === 'average' 
                  ? 'bg-f1-red border-f1-red text-white' 
                  : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                }
              `}
            >
              PROMEDIO
            </button>
            <button
              onClick={() => setScoringMethod('both')}
              className={`
                px-4 py-2.5 rounded-md border-2 font-semibold text-sm transition-all
                ${scoringMethod === 'both' 
                  ? 'bg-f1-red border-f1-red text-white' 
                  : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                }
              `}
            >
              LOS 2
            </button>
          </div>
        </div>

        {/* Puntos Extra Vuelta Rapida */}
        <div className="mb-6">
          <h2 className="text-white text-base font-bold mb-3 uppercase tracking-wider">PUNTOS EXTRA VUELTA RAPIDA</h2>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setPointsForBestLap(num as 0 | 1 | 2 | 3)}
                className={`
                  w-14 h-14 rounded-md border-2 font-bold text-lg transition-all
                  ${pointsForBestLap === num 
                    ? 'bg-f1-red border-f1-red text-white' 
                    : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Puntos Extra Promedio */}
        <div className="mb-6">
          <h2 className="text-white text-base font-bold mb-3 uppercase tracking-wider">PUNTOS EXTRA PROMEDIO</h2>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setPointsForBestAverage(num as 0 | 1 | 2 | 3)}
                className={`
                  w-14 h-14 rounded-md border-2 font-bold text-lg transition-all
                  ${pointsForBestAverage === num 
                    ? 'bg-f1-red border-f1-red text-white' 
                    : 'bg-transparent border-f1-red text-white hover:bg-f1-red/20'
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-3">
        <div className="max-w-6xl mx-auto flex justify-center">
          <button className="w-16 h-16 bg-f1-red rounded-full flex items-center justify-center text-white font-semibold text-sm">
            LIVE
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-20">
        {/* Title and Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">CUSTOM</h1>
          <button
            onClick={handleBackStep}
            className="bg-zinc-600 hover:bg-zinc-500 text-white font-semibold px-5 py-2 rounded-md text-sm transition-colors"
          >
            PARC FERMÉ
          </button>
        </div>

        {/* Starting Grid Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-base font-bold uppercase tracking-wider">STARTING GRID</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={randomizePlayers}
                className="text-white hover:text-zinc-300 transition-colors"
                title="Randomize players"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowPlayerModal(true)}
                className="text-white hover:text-zinc-300 transition-colors"
                title="Add player"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {selectedPlayers.map((player, index) => (
              <div
                key={player.id}
                onClick={() => setSelectedPlayerToRemove(player)}
                className="bg-zinc-800 border-2 border-f1-red rounded-lg p-4 text-center cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                <UserAvatar 
                  imageUrl={player.imageUrl} 
                  name={player.name} 
                  className="w-20 h-20 mx-auto mb-3"
                />
                <h3 className="text-white font-bold">{player.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Circuits Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">CIRCUITOS</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={randomizeCircuits}
                className="text-white hover:text-zinc-300 transition-colors"
                title="Randomize circuits"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowCircuitModal(true)}
                className="text-white hover:text-zinc-300 transition-colors"
                title="Add circuit"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {selectedCircuits.map((circuit) => (
              <div
                key={circuit.id}
                onClick={() => handleCircuitToggle(circuit)}
                className="bg-zinc-800 border-2 border-f1-red rounded-lg overflow-hidden cursor-pointer hover:bg-zinc-700 transition-colors group relative"
              >
                {/* Remove indicator on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="bg-red-600 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="aspect-video bg-zinc-700 relative">
                  {circuit.imageUrl ? (
                    <img
                      src={circuit.imageUrl}
                      alt={circuit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-white font-bold text-center">{circuit.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-12">
          <button
            onClick={handleStartChampionship}
            disabled={selectedPlayers.length < 2 || selectedCircuits.length < 1}
            className={`
              w-full max-w-md mx-auto block py-5 px-8 rounded-xl font-bold text-2xl transition-all
              ${selectedPlayers.length >= 2 && selectedCircuits.length >= 1
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg transform hover:scale-105' 
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            INICIAR
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-3">
        <div className="max-w-6xl mx-auto flex justify-center">
          <button className="w-16 h-16 bg-f1-red rounded-full flex items-center justify-center text-white font-semibold text-sm">
            LIVE
          </button>
        </div>
      </div>

      {/* Player Selection Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Seleccionar Jugador</h3>
              <button
                onClick={() => setShowPlayerModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              {players.filter(p => p.isActive).map((player) => {
                const isSelected = selectedPlayers.find(p => p.id === player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => {
                      handlePlayerToggle(player);
                      setShowPlayerModal(false);
                    }}
                    disabled={!!isSelected}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                      ${isSelected
                        ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                        : 'bg-zinc-800 hover:bg-zinc-700 cursor-pointer'
                      }
                    `}
                  >
                    <UserAvatar imageUrl={player.imageUrl} name={player.name} className="w-10 h-10" />
                    <span className="text-white font-medium">{player.name}</span>
                    {player.isGuest && <span className="ml-2 text-xs text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded">INVITADO</span>}
                    {isSelected && <span className="ml-auto text-zinc-500 text-sm">Ya seleccionado</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Circuit Selection Modal */}
      {showCircuitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Seleccionar Circuito</h3>
              <button
                onClick={() => setShowCircuitModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {circuits.map((circuit) => {
                const isSelected = selectedCircuits.find(c => c.id === circuit.id);
                return (
                  <button
                    key={circuit.id}
                    onClick={() => {
                      handleCircuitToggle(circuit);
                      setShowCircuitModal(false);
                    }}
                    disabled={!!isSelected}
                    className={`
                      rounded-lg overflow-hidden transition-all
                      ${isSelected 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:transform hover:scale-105 cursor-pointer'
                      }
                    `}
                  >
                    <div className="aspect-video bg-zinc-800 relative">
                      {circuit.imageUrl ? (
                        <img 
                          src={circuit.imageUrl} 
                          alt={circuit.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="bg-zinc-800 p-2">
                      <h4 className="text-white font-medium text-sm">{circuit.name}</h4>
                      {isSelected && <span className="text-zinc-500 text-xs">Ya seleccionado</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Player Remove Confirmation Modal */}
      {selectedPlayerToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-sm w-full">
            <div className="text-center">
              <UserAvatar
                imageUrl={selectedPlayerToRemove.imageUrl}
                name={selectedPlayerToRemove.name}
                className="w-20 h-20 mx-auto mb-4"
              />
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedPlayerToRemove.name}
              </h3>
              <p className="text-zinc-400 mb-6">
                ¿Eliminar del campeonato?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handlePlayerToggle(selectedPlayerToRemove);
                  setSelectedPlayerToRemove(null);
                }}
                className="flex-1 bg-f1-red hover:bg-red-700 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setSelectedPlayerToRemove(null)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return currentStep === 1 ? renderStep1() : renderStep2();
};

export default F1CustomChampionship;