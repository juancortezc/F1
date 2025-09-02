import React, { useState, useEffect } from 'react';
import { Player, Circuit } from '../types';
import UserAvatar from './UserAvatar';

interface F1QuickRaceProps {
  players: Player[];
  circuits: Circuit[];
  onBack: () => void;
  onStartRace: (selectedPlayers: Player[], selectedCircuits: Circuit[]) => void;
}

const F1QuickRace: React.FC<F1QuickRaceProps> = ({
  players,
  circuits,
  onBack,
  onStartRace
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedCircuits, setSelectedCircuits] = useState<Circuit[]>([]);
  const [showCircuitModal, setShowCircuitModal] = useState<Circuit | null>(null);

  // Auto-configure on mount: random order players (no guests) + 3 random circuits
  useEffect(() => {
    // Select only non-guest players in random order
    const eligiblePlayers = players.filter(p => !p.isGuest && p.isActive);
    const randomizedPlayers = [...eligiblePlayers].sort(() => Math.random() - 0.5);
    setSelectedPlayers(randomizedPlayers);

    // Select 3 random circuits
    const randomCircuits = [...circuits].sort(() => Math.random() - 0.5).slice(0, 3);
    setSelectedCircuits(randomCircuits);
  }, [players, circuits]);

  const handlePlayerToggle = (player: Player) => {
    setSelectedPlayers(prev => 
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    );
  };

  const handleAddPlayer = () => {
    // Show available players (including guests) not in selection
    const availablePlayers = players.filter(p => 
      p.isActive && !selectedPlayers.find(sp => sp.id === p.id)
    );
    // For now, add first available player - later we'll show a modal
    if (availablePlayers.length > 0) {
      setSelectedPlayers(prev => [...prev, availablePlayers[0]]);
    }
  };

  const handleRandomizeCircuits = () => {
    const randomCircuits = [...circuits].sort(() => Math.random() - 0.5).slice(0, 3);
    setSelectedCircuits(randomCircuits);
  };

  const handleCircuitChange = (oldCircuit: Circuit) => {
    // For now, replace with a random different circuit
    const availableCircuits = circuits.filter(c => 
      c.id !== oldCircuit.id && !selectedCircuits.find(sc => sc.id === c.id)
    );
    if (availableCircuits.length > 0) {
      const newCircuit = availableCircuits[Math.floor(Math.random() * availableCircuits.length)];
      setSelectedCircuits(prev => prev.map(c => c.id === oldCircuit.id ? newCircuit : c));
    }
  };

  const formatTime = (milliseconds: number | null) => {
    if (!milliseconds) return '-';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const canStart = selectedPlayers.length >= 2 && selectedCircuits.length >= 1;

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-32">
        {/* Title and Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">QUICK RACE</h1>
          <button
            onClick={onBack}
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
                onClick={() => {
                  // Shuffle existing players
                  setSelectedPlayers(prev => [...prev].sort(() => Math.random() - 0.5));
                }}
                className="text-white hover:text-zinc-300 transition-colors"
                title="Randomize players"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleAddPlayer}
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
            {selectedPlayers.slice(0, 3).map((player, index) => (
              <div
                key={player.id}
                onClick={() => handlePlayerToggle(player)}
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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-base font-bold uppercase tracking-wider">CIRCUITOS</h2>
            <button
              onClick={handleRandomizeCircuits}
              className="text-white hover:text-zinc-300 transition-colors"
              title="Randomize circuits"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {selectedCircuits.map((circuit) => (
              <div
                key={circuit.id}
                className="bg-zinc-800 border-2 border-f1-red rounded-lg overflow-hidden"
              >
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


        {/* Configuration Summary */}
        <div className="mb-6">
          <div className="bg-zinc-800 border-2 border-f1-red rounded-lg p-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-zinc-400 text-xs font-bold uppercase">Turnos</div>
                <div className="text-white font-bold text-sm">2</div>
              </div>
              
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-zinc-400 text-xs font-bold uppercase">Vueltas</div>
                <div className="text-white font-bold text-sm">3</div>
              </div>
              
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-zinc-400 text-xs font-bold uppercase">VR</div>
                <div className="text-white font-bold text-sm">+2</div>
              </div>
              
              <div className="bg-zinc-900 rounded p-2">
                <div className="text-zinc-400 text-xs font-bold uppercase">Prom</div>
                <div className="text-white font-bold text-sm">✓</div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-8 mb-8">
          <button
            onClick={() => {
              if (canStart) {
                console.log('🏁 Starting Quick Race with:', {
                  players: selectedPlayers.map(p => p.name),
                  circuits: selectedCircuits.map(c => c.name)
                });
                onStartRace(selectedPlayers, selectedCircuits);
              }
            }}
            disabled={!canStart}
            className={`
              w-full max-w-md mx-auto block py-5 px-8 rounded-xl font-bold text-2xl transition-all
              ${canStart
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg transform hover:scale-105' 
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            INICIAR
          </button>
        </div>

        {/* Circuit Info Modal */}
        {showCircuitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{showCircuitModal.name}</h3>
                <button
                  onClick={() => setShowCircuitModal(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {showCircuitModal.imageUrl && (
                <img 
                  src={showCircuitModal.imageUrl} 
                  alt={showCircuitModal.name}
                  className="w-full h-32 object-cover rounded mb-4"
                />
              )}

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Récord VR:</span>
                  <div className="text-right">
                    <div className="text-white font-mono">
                      {formatTime(showCircuitModal.historicalBestLap)}
                    </div>
                    {showCircuitModal.bestLapHolderId && (
                      <div className="text-xs text-zinc-500">
                        {players.find(p => p.id === showCircuitModal.bestLapHolderId)?.name || 'Desconocido'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-zinc-400">Récord PR:</span>
                  <div className="text-right">
                    <div className="text-white font-mono">
                      {formatTime(showCircuitModal.historicalBestAverage)}
                    </div>
                    {showCircuitModal.bestAverageHolderId && (
                      <div className="text-xs text-zinc-500">
                        {players.find(p => p.id === showCircuitModal.bestAverageHolderId)?.name || 'Desconocido'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleCircuitChange(showCircuitModal);
                    setShowCircuitModal(null);
                  }}
                  className="flex-1 bg-f1-red hover:bg-red-700 text-white py-2 px-4 rounded font-medium transition-colors"
                >
                  Cambiar Circuito
                </button>
                <button
                  onClick={() => setShowCircuitModal(null)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-4 rounded font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default F1QuickRace;