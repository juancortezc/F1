import React, { useState } from 'react';

interface F1RecalculateScoresProps {
  onBack: () => void;
  onRecalculateScores?: () => Promise<void>;
}

const F1RecalculateScores: React.FC<F1RecalculateScoresProps> = ({
  onBack,
  onRecalculateScores
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState<Date | null>(null);

  const handleRecalculate = async () => {
    if (!onRecalculateScores || isRecalculating) return;
    
    setIsRecalculating(true);
    try {
      await onRecalculateScores();
      setLastRecalculation(new Date());
    } catch (error) {
      console.error('Error during recalculation:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-32">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider">RECALCULAR PUNTOS</h1>
          <button
            onClick={onBack}
            className="bg-zinc-600 hover:bg-zinc-500 text-white font-semibold px-5 py-2 rounded-md text-sm transition-colors"
          >
            PARC FERMÉ
          </button>
        </div>

        {/* Main Recalculate Section */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 md:p-8">
          <div className="text-center space-y-6">
            {/* Recalculate Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-f1-red/10 border-2 border-f1-red rounded-full flex items-center justify-center">
                <svg 
                  className={`w-10 h-10 text-f1-red ${isRecalculating ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" 
                  />
                </svg>
              </div>
            </div>

            {/* Title and Description */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">Recalcular Puntajes</h2>
              <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                Esta función recalcula todos los puntajes del campeonato activo o más reciente, 
                corrigiendo cualquier inconsistencia en los cálculos de puntos, posiciones y récords.
              </p>
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
                <p className="text-green-300 text-sm mt-1">
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

            {/* Warning Information */}
            <div className="bg-amber-900/20 border border-amber-700 rounded-md p-4">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Importante</span>
              </div>
              <p className="text-amber-300 text-sm leading-relaxed">
                Esta operación puede tomar unos segundos. Solo úsala si detectas inconsistencias 
                en los puntajes o después de modificar manualmente datos de campeonatos.
              </p>
            </div>

            {/* Recalculate Button */}
            <div className="pt-4">
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating || !onRecalculateScores}
                className={`
                  w-full max-w-md mx-auto block py-4 px-8 rounded-xl font-bold text-lg transition-all duration-200
                  ${isRecalculating || !onRecalculateScores
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' 
                    : 'bg-f1-red hover:bg-red-700 text-white shadow-lg transform hover:scale-105 active:scale-95'
                  }
                `}
              >
                {isRecalculating ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" />
                    </svg>
                    <span>RECALCULANDO...</span>
                  </div>
                ) : (
                  'INICIAR RECÁLCULO'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-bold text-white">¿Cuándo usar esta función?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-4">
              <h4 className="text-white font-medium mb-2">Corrección de Datos</h4>
              <p className="text-zinc-400 text-sm">
                Después de modificar manualmente tiempos o resultados de campeonatos
              </p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-4">
              <h4 className="text-white font-medium mb-2">Inconsistencias</h4>
              <p className="text-zinc-400 text-sm">
                Si notas puntajes o posiciones que no coinciden con los resultados esperados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default F1RecalculateScores;