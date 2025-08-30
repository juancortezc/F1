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
    <div className="min-h-screen" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-32">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            PARC FERMÉ
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white">QUICK RACE</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>

        {/* Players Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">PILOTOS</h2>
            <span className="text-zinc-400 text-sm">{selectedPlayers.length} seleccionados</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {selectedPlayers.map((player) => (
              <div 
                key={player.id}
                className="relative bg-zinc-900 rounded-lg p-4 text-center border border-zinc-800"
              >
                <button
                  onClick={() => handlePlayerToggle(player)}
                  className="absolute top-2 right-2 w-6 h-6 bg-f1-red rounded-full flex items-center justify-center text-white text-xs hover:bg-red-700"
                  title="No Participa"
                >
                  ×
                </button>
                <UserAvatar
                  imageUrl={player.imageUrl}
                  name={player.name}
                  className="w-16 h-16 mx-auto mb-2 ring-2 ring-f1-red"
                />
                <h3 className="text-white font-semibold text-sm">{player.name}</h3>
                {player.isGuest && (
                  <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded mt-1 inline-block">
                    INVITADO
                  </span>
                )}
              </div>
            ))}

            {/* Add Player Button */}
            <button
              onClick={handleAddPlayer}
              className="bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg p-4 text-center hover:border-zinc-500 hover:bg-zinc-750 transition-colors"
            >
              <div className="w-16 h-16 mx-auto mb-2 bg-zinc-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-zinc-400 text-sm font-medium">Agregar</span>
            </button>
          </div>
        </div>

        {/* Circuits Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">CIRCUITOS</h2>
            <button
              onClick={handleRandomizeCircuits}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md text-zinc-300 text-sm transition-colors"
              title="Aleatorizar circuitos"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Random
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedCircuits.map((circuit, index) => (
              <div 
                key={circuit.id}
                className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                onClick={() => setShowCircuitModal(circuit)}
              >
                <div className="aspect-video bg-zinc-800 relative overflow-hidden">
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
                  <div className="absolute top-2 left-2 bg-zinc-900/80 rounded-full w-8 h-8 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-white font-semibold text-sm mb-1">{circuit.name}</h3>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>VR: {formatTime(circuit.historicalBestLap)}</span>
                    <span>PR: {formatTime(circuit.historicalBestAverage)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="mt-8 mb-6">
          <div 
            className="rounded-lg p-6 border-2 border-f1-red relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #374151 0%, #7f1d1d 100%)' }}
          >
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 to-red-900/40"></div>
            
            <div className="relative z-10">
              <h3 className="text-white font-bold text-lg mb-4 text-center">CONFIGURACIÓN QUICK RACE</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                <div className="bg-black/20 rounded-md p-3 backdrop-blur-sm">
                  <div className="text-zinc-300 text-sm font-medium mb-1">Jugadores</div>
                  <div className="text-xl font-bold">{selectedPlayers.length}</div>
                </div>
                
                <div className="bg-black/20 rounded-md p-3 backdrop-blur-sm">
                  <div className="text-zinc-300 text-sm font-medium mb-1">Circuitos</div>
                  <div className="text-xl font-bold">{selectedCircuits.length}</div>
                </div>
                
                <div className="bg-black/20 rounded-md p-3 backdrop-blur-sm md:col-span-2">
                  <div className="text-zinc-300 text-sm font-medium mb-2">Sistema de Puntuación</div>
                  <div className="space-y-1 text-sm">
                    <div>• Puntos por <strong>Mejor Promedio</strong> por Circuito</div>
                    <div>• Puntos extra <strong>(2)</strong> por Vuelta Rápida por Circuito</div>
                    <div>• <strong>2 turnos</strong> por circuito, <strong>3 vueltas</strong> por turno</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pb-8">
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
              w-full max-w-md mx-auto block py-4 px-8 rounded-xl font-bold text-xl transition-all duration-300
              ${canStart 
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg transform hover:scale-105 shadow-green-500/25' 
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }
            `}
            style={{ minHeight: '60px' }}
          >
            {canStart ? '🏁 INICIAR QUICK RACE' : 'SELECCIONA AL MENOS 2 PILOTOS'}
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