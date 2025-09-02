import React, { useState } from 'react';
import { GameState } from '../types';
import useSWR from 'swr';

interface F1DangerZoneProps {
  onBack: () => void;
  onRecalculateScores?: () => Promise<void>;
  onCancelGame?: () => Promise<void>;
}

type DangerTab = 'cancelar' | 'recalcular' | 'corte';

const F1DangerZone: React.FC<F1DangerZoneProps> = ({
  onBack,
  onRecalculateScores,
  onCancelGame
}) => {
  const [activeTab, setActiveTab] = useState<DangerTab>('cancelar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState<Date | null>(null);
  const [cutoffDate, setCutoffDate] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Fetch active game
  const { data: activeGameData } = useSWR<{game: {id: string, state: GameState} | null}>('/api/game/active');
  const activeGame = activeGameData?.game;

  // Tab content components
  const renderCancelarTab = () => (
    <div className="space-y-6">
      {/* Warning Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-red-900/20 border-2 border-red-600 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-white">Cancelar Campeonato Activo</h2>
        {activeGame ? (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Esta acción cancelará el campeonato en curso. Los datos no se perderán pero el campeonato 
              se marcará como completado sin ganador.
            </p>
            
            {/* Current Game Info */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-4">
              <h3 className="text-white font-medium mb-2">Campeonato Actual:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500">Circuito:</span>
                  <span className="text-white ml-2">
                    {activeGame.state.circuits[activeGame.state.currentCircuitIndex]?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Turno:</span>
                  <span className="text-white ml-2">{activeGame.state.currentTurn}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Jugadores:</span>
                  <span className="text-white ml-2">{activeGame.state.settings.players.length}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Progreso:</span>
                  <span className="text-white ml-2">
                    {activeGame.state.currentCircuitIndex + 1}/{activeGame.state.circuits.length} circuitos
                  </span>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isProcessing}
              className="w-full max-w-md mx-auto block py-4 px-8 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200"
            >
              CANCELAR CAMPEONATO
            </button>
          </div>
        ) : (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-8 text-center">
            <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-zinc-400">No hay campeonato activo para cancelar</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecalcularTab = () => (
    <div className="space-y-6">
      {/* Recalculate Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-amber-900/20 border-2 border-amber-600 rounded-full flex items-center justify-center">
          <svg 
            className={`w-10 h-10 text-amber-600 ${isProcessing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-white">Recalcular Puntajes</h2>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Recalcula todos los puntajes del campeonato activo o más reciente, 
          corrigiendo cualquier inconsistencia en los cálculos.
        </p>
      </div>

      {/* F1 Style Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-amber-600/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-bold">Corrección Rápida</h3>
          </div>
          <p className="text-zinc-400 text-sm">
            Procesa todos los datos en segundos y actualiza las posiciones automáticamente
          </p>
        </div>

        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-amber-600/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-bold">Integridad de Datos</h3>
          </div>
          <p className="text-zinc-400 text-sm">
            Garantiza que todos los puntajes y récords estén correctamente calculados
          </p>
        </div>
      </div>

      {/* Status Information */}
      {lastRecalculation && (
        <div className="bg-green-900/20 border border-green-700 rounded-md p-4">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Última recalculación exitosa</span>
          </div>
          <p className="text-green-300 text-sm mt-1 text-center">
            {lastRecalculation.toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </p>
        </div>
      )}

      {/* Recalculate Button */}
      <button
        onClick={handleRecalculate}
        disabled={isProcessing || !onRecalculateScores}
        className={`
          w-full max-w-md mx-auto block py-4 px-8 rounded-xl font-bold text-lg transition-all duration-200
          ${isProcessing || !onRecalculateScores
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' 
            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg transform hover:scale-105 active:scale-95'
          }
        `}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-3">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>RECALCULANDO...</span>
          </div>
        ) : (
          'INICIAR RECÁLCULO'
        )}
      </button>
    </div>
  );

  const renderCorteTab = () => (
    <div className="space-y-6">
      {/* Cut Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-purple-900/20 border-2 border-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-white">Corte de Datos Históricos</h2>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Define desde qué fecha se tomarán en cuenta los resultados para las estadísticas históricas, 
          Hall of Fame y récords.
        </p>
      </div>

      {/* Date Selection */}
      <div className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Fecha de Corte
          </label>
          <input
            type="date"
            value={cutoffDate}
            onChange={(e) => setCutoffDate(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:border-purple-600 focus:outline-none transition-colors"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Solo se considerarán los datos desde esta fecha en adelante
          </p>
        </div>

        {/* Preview Section */}
        {cutoffDate && (
          <div className="bg-purple-900/20 border border-purple-700 rounded-md p-4">
            <h3 className="text-purple-400 font-medium mb-2">Vista Previa del Corte</h3>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-300">
                <span className="text-purple-400">•</span> Datos desde: {new Date(cutoffDate).toLocaleDateString('es-ES')}
              </p>
              <p className="text-zinc-300">
                <span className="text-purple-400">•</span> Afectará: Hall of Fame, Récords, Estadísticas
              </p>
              <p className="text-zinc-300">
                <span className="text-purple-400">•</span> Esta acción es reversible
              </p>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-zinc-400">
              <p className="font-medium text-zinc-300 mb-1">Función en Desarrollo</p>
              <p>Esta funcionalidad estará disponible cuando se carguen datos históricos en la base de datos.</p>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <button
          disabled={!cutoffDate}
          className={`
            w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-200
            ${cutoffDate
              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg transform hover:scale-105 active:scale-95'
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            }
          `}
        >
          APLICAR CORTE
        </button>
      </div>
    </div>
  );

  const handleRecalculate = async () => {
    if (!onRecalculateScores || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onRecalculateScores();
      setLastRecalculation(new Date());
    } catch (error) {
      console.error('Error during recalculation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelGame = async () => {
    if (!onCancelGame || isProcessing || !activeGame) return;
    
    setIsProcessing(true);
    setShowConfirmDialog(false);
    try {
      await onCancelGame();
    } catch (error) {
      console.error('Error canceling game:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-32">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider flex items-center gap-3">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            ZONA DE PELIGRO
          </h1>
          <button
            onClick={onBack}
            className="bg-zinc-600 hover:bg-zinc-500 text-white font-semibold px-5 py-2 rounded-md text-sm transition-colors"
          >
            PARC FERMÉ
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg mb-8 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab('cancelar')}
              className={`
                flex-1 px-4 py-4 font-bold text-sm uppercase tracking-wide transition-all duration-200
                ${activeTab === 'cancelar'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                }
              `}
            >
              CANCELAR
            </button>
            <button
              onClick={() => setActiveTab('recalcular')}
              className={`
                flex-1 px-4 py-4 font-bold text-sm uppercase tracking-wide transition-all duration-200
                ${activeTab === 'recalcular'
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                }
              `}
            >
              RECALCULAR
            </button>
            <button
              onClick={() => setActiveTab('corte')}
              className={`
                flex-1 px-4 py-4 font-bold text-sm uppercase tracking-wide transition-all duration-200
                ${activeTab === 'corte'
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                }
              `}
            >
              CORTE
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 md:p-8">
          <div className="text-center">
            {activeTab === 'cancelar' && renderCancelarTab()}
            {activeTab === 'recalcular' && renderRecalcularTab()}
            {activeTab === 'corte' && renderCorteTab()}
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-red-800">
              <h3 className="text-xl font-bold text-white mb-4 text-center">⚠️ Confirmar Cancelación</h3>
              <p className="text-zinc-400 mb-6 text-center">
                ¿Estás seguro de que quieres cancelar el campeonato activo? 
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded font-medium transition-colors"
                >
                  VOLVER
                </button>
                <button
                  onClick={handleCancelGame}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded font-medium transition-colors"
                >
                  SÍ, CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default F1DangerZone;