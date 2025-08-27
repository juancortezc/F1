import React, { useState } from 'react';
import { Tournament } from '../types';

interface TournamentManagementProps {
  tournament: Tournament;
  onTournamentUpdated: () => Promise<void>;
  onClose: () => void;
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({ 
  tournament, 
  onTournamentUpdated, 
  onClose 
}) => {
  const [action, setAction] = useState<'cancel' | 'complete' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    if (confirmation !== 'CANCELAR') {
      setError('Debes escribir exactamente "CANCELAR" para confirmar');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar torneo');
      }

      await onTournamentUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (confirmation !== 'TERMINAR') {
      setError('Debes escribir exactamente "TERMINAR" para confirmar');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al completar torneo');
      }

      await onTournamentUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  const completedChampionships = tournament.championships?.filter((c: any) => c.status === 'COMPLETED').length || 0;

  if (action === null) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <div className="bg-zinc-900 border-2 border-zinc-700 rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-100">Gestionar Torneo</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-8 h-8 rounded-md flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-zinc-100 mb-2">{tournament.name}</h3>
            <div className="text-sm text-zinc-400 space-y-1">
              <div>Estado: <span className="text-green-400">ACTIVO</span></div>
              <div>Progreso: {completedChampionships}/{tournament.maxChampionships} campeonatos</div>
              <div>Puntos: {tournament.pointsForFirst}-{tournament.pointsForSecond}-{tournament.pointsForThird}</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setAction('complete')}
              className="w-full bg-amber-700 text-white font-bold py-3 px-4 rounded-md hover:bg-amber-600 transition-colors"
            >
              🏆 Terminar Torneo
            </button>
            <p className="text-xs text-zinc-400 text-center">
              Completa el torneo con los campeonatos actuales
            </p>

            <button
              onClick={() => setAction('cancel')}
              className="w-full bg-red-700 text-white font-bold py-3 px-4 rounded-md hover:bg-red-600 transition-colors"
            >
              ❌ Cancelar Torneo
            </button>
            <p className="text-xs text-zinc-400 text-center">
              Cancela el torneo completamente
            </p>

            <button
              onClick={onClose}
              className="w-full bg-zinc-700 text-zinc-100 font-bold py-3 px-4 rounded-md hover:bg-zinc-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCancel = action === 'cancel';
  const expectedWord = isCancel ? 'CANCELAR' : 'TERMINAR';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-100">
            {isCancel ? '❌ Cancelar Torneo' : '🏆 Terminar Torneo'}
          </h2>
          <button
            onClick={() => {
              setAction(null);
              setConfirmation('');
              setError('');
            }}
            className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-8 h-8 rounded-md flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-red-900/20 border border-red-600 rounded-md p-4 mb-4">
            <p className="text-red-300 font-semibold mb-2">
              ⚠️ {isCancel ? 'Cancelación' : 'Finalización'} Irreversible
            </p>
            <p className="text-red-200 text-sm">
              {isCancel 
                ? 'Esta acción cancelará el torneo permanentemente. Todos los datos se conservarán pero no se podrán agregar más campeonatos.'
                : `Esta acción completará el torneo con ${completedChampionships} campeonatos disputados de ${tournament.maxChampionships} programados.`
              }
            </p>
          </div>

          <p className="text-zinc-300 mb-3">
            Para confirmar, escribe exactamente: <strong className="text-f1-red">{expectedWord}</strong>
          </p>

          <input
            type="text"
            value={confirmation}
            onChange={(e) => {
              setConfirmation(e.target.value);
              setError('');
            }}
            placeholder={`Escribe "${expectedWord}"`}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:border-f1-red focus:ring-1 focus:ring-f1-red"
            disabled={isProcessing}
          />

          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setAction(null);
              setConfirmation('');
              setError('');
            }}
            disabled={isProcessing}
            className="flex-1 bg-zinc-700 text-zinc-100 font-bold py-3 px-4 rounded-md hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={isCancel ? handleCancel : handleComplete}
            disabled={isProcessing || confirmation !== expectedWord}
            className={`flex-1 font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isCancel
                ? 'bg-red-700 text-white hover:bg-red-600'
                : 'bg-amber-700 text-white hover:bg-amber-600'
            }`}
          >
            {isProcessing ? 'Procesando...' : (isCancel ? 'Cancelar Torneo' : 'Terminar Torneo')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentManagement;