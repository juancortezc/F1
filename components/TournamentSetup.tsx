import React, { useState } from 'react';
import { Player } from '../types';
import NavigationBar from './NavigationBar';

interface TournamentSetupProps {
  players: Player[];
  onTournamentCreated: () => void;
  onCancel: () => void;
}

const TournamentSetup: React.FC<TournamentSetupProps> = ({ players, onTournamentCreated, onCancel }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsForFirst, setPointsForFirst] = useState(3);
  const [pointsForSecond, setPointsForSecond] = useState(2);
  const [pointsForThird, setPointsForThird] = useState(1);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [totalCircuits, setTotalCircuits] = useState(0);

  // Fetch total circuits count
  React.useEffect(() => {
    fetch('/api/circuits')
      .then(r => r.json())
      .then(data => setTotalCircuits(Array.isArray(data) ? data.length : 0));
  }, []);

  const handleParticipantToggle = (playerId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSubmit = async () => {
    if (!tournamentName.trim()) {
      alert('El nombre del torneo es requerido');
      return;
    }

    if (selectedParticipants.length < 2) {
      alert('Selecciona al menos 2 participantes');
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentName,
          description: description || undefined,
          pointsForFirst,
          pointsForSecond,
          pointsForThird,
          participantIds: selectedParticipants
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tournament');
      }

      onTournamentCreated();
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert(`Error al crear el torneo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavigationBar
        onBack={onCancel}
        title="Crear Torneo"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-6 pb-32">
        {/* Tournament Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">Información del Torneo</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nombre del Torneo *
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:border-f1-red focus:ring-1 focus:ring-f1-red"
                placeholder="Ej: Torneo F1 Night 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:border-f1-red focus:ring-1 focus:ring-f1-red"
                rows={3}
                placeholder="Descripción del torneo..."
              />
            </div>

            {/* Info about tournament completion */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-zinc-300 text-sm">
                    El torneo terminará cuando se hayan corrido <strong className="text-white">{totalCircuits} circuitos</strong> (todos los disponibles).
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Los jugadores seleccionados serán fijos durante todo el torneo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Points System */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">Sistema de Puntos</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                1° Lugar
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={pointsForFirst}
                onChange={(e) => setPointsForFirst(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:border-f1-red focus:ring-1 focus:ring-f1-red"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                2° Lugar
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={pointsForSecond}
                onChange={(e) => setPointsForSecond(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:border-f1-red focus:ring-1 focus:ring-f1-red"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                3° Lugar
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={pointsForThird}
                onChange={(e) => setPointsForThird(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:border-f1-red focus:ring-1 focus:ring-f1-red"
              />
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">
            Participantes ({selectedParticipants.length} seleccionados)
          </h2>
          
          <div className="space-y-2">
            {players.map(player => (
              <label
                key={player.id}
                className="flex items-center gap-3 p-3 bg-zinc-800 rounded-md hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(player.id)}
                  onChange={() => handleParticipantToggle(player.id)}
                  className="w-4 h-4 text-f1-red bg-zinc-700 border-zinc-600 rounded focus:ring-f1-red focus:ring-2"
                />
                <img
                  src={player.imageUrl}
                  alt={player.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-zinc-100 font-medium">{player.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={isCreating}
            className="flex-1 bg-zinc-700 text-zinc-100 font-bold py-3 px-6 rounded-md hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isCreating || !tournamentName.trim() || selectedParticipants.length < 2}
            className="flex-1 bg-f1-red text-white font-bold py-3 px-6 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creando...' : 'Crear Torneo'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentSetup;