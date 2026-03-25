import React, { useState, useMemo, useEffect } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import { CheckCircleIcon, ArrowUpIcon, ArrowDownIcon } from './icons';
import { useTournament } from '../contexts/TournamentContext';
import { useSWRConfig } from 'swr';

interface ModernGameSetupProps {
  players: Player[];
  circuits: Circuit[];
  onSetupComplete: (settings: GameSettings & { tournamentMode?: boolean }) => void;
  onCancel?: () => void;
}

// Simple icon components
const SparkIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center text-2xl font-bold`}>⚡</div>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center text-2xl font-bold`}>🏆</div>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center text-2xl font-bold`}>⏱️</div>
);

const CogIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center text-2xl font-bold`}>⚙️</div>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center text-2xl font-bold`}>▶️</div>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold`}>→</div>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold`}>←</div>
);

// Presets para inicio rápido
const QUICK_START_PRESETS = {
  'quick-race': {
    name: 'Carrera Rápida',
    description: '3 circuitos aleatorios, 2 turnos por circuito',
    icon: SparkIcon,
    settings: {
      circuits: 3,
      turnsPerCircuit: 2,  // Changed from 1 to 2
      lapsPerTurn: 3,
      scoringMethod: 'average' as const,
      pointsForBestLap: 2,  // Changed from 0 to 2 (VR bonus)
      pointsForBestAverage: 0
    }
  },
  'torneo': {
    name: 'Torneo',
    description: 'Competencia completa con todos los circuitos',
    icon: TrophyIcon,
    settings: {
      circuits: 3,  // 3 circuits per night, but will track all
      turnsPerCircuit: 2,
      lapsPerTurn: 3,  // Changed from 5 to 3
      scoringMethod: 'average' as const,
      pointsForBestLap: 2,  // 2 pts bonus VR
      pointsForBestAverage: 0
    }
  },
  'practice': {
    name: 'Práctica',
    description: 'Sesión casual con circuitos seleccionados',
    icon: ClockIcon,
    settings: {
      circuits: 5,
      turnsPerCircuit: 1,
      lapsPerTurn: 5,
      scoringMethod: 'lap' as const,
      pointsForBestLap: 0,
      pointsForBestAverage: 0
    }
  }
};

const ModernGameSetup: React.FC<ModernGameSetupProps> = ({
  players,
  circuits,
  onSetupComplete,
  onCancel
}) => {
  const { activeTournament, isInTournamentMode } = useTournament();
  const { mutate } = useSWRConfig();
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [useQuickStart, setUseQuickStart] = useState(true);
  const [continuingTournament, setContinuingTournament] = useState(false);

  // Simplified settings
  const [gameSettings, setGameSettings] = useState({
    selectedPlayers: [] as Player[],
    selectedCircuits: [] as Circuit[],
    scoringMethod: 'average' as 'average' | 'lap' | 'both',
    turnsPerCircuit: 2,
    lapsPerTurn: 5 as 3 | 5,
    pointsForBestLap: 1,
    pointsForBestAverage: 1,
    useBest4Of5: true
  });

  // Refresh players on mount to ensure we have the latest data
  useEffect(() => {
    mutate('/api/players');
  }, [mutate]);

  // Pre-select main players (Berna, BlackMamba, Borgia) by default
  useEffect(() => {
    if (players && players.length > 0 && gameSettings.selectedPlayers.length === 0) {
      const mainPlayerNames = ['Berna', 'BlackMamba', 'Borgia'];
      const mainPlayers = players.filter(p =>
        mainPlayerNames.includes(p.name) && p.isActive
      );
      if (mainPlayers.length > 0) {
        setGameSettings(prev => ({
          ...prev,
          selectedPlayers: mainPlayers
        }));
      }
    }
  }, [players, gameSettings.selectedPlayers.length]);

  // Validation
  const canProceedStep1 = selectedPreset || !useQuickStart;
  const canProceedStep2 = gameSettings.selectedPlayers.length >= 2 && gameSettings.selectedCircuits.length >= 1;
  const canComplete = currentStep === 3;

  // Apply preset
  const applyPreset = (presetKey: string) => {
    const preset = QUICK_START_PRESETS[presetKey as keyof typeof QUICK_START_PRESETS];
    if (!preset) return;

    // For torneo mode, handle differently
    if (presetKey === 'torneo') {
      // If continuing tournament, circuits are already set
      if (continuingTournament) return;
      
      // For new tournament, select 3 random circuits for tonight
      const selectedCircuits = circuits
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      setGameSettings(prev => ({
        ...prev,
        selectedCircuits,
        turnsPerCircuit: preset.settings.turnsPerCircuit,
        lapsPerTurn: preset.settings.lapsPerTurn as 3 | 5,
        scoringMethod: preset.settings.scoringMethod,
        pointsForBestLap: preset.settings.pointsForBestLap,
        pointsForBestAverage: preset.settings.pointsForBestAverage,
        useBest4Of5: false
      }));
    } else {
      const circuitCount = Math.min(preset.settings.circuits as number, circuits.length);
      
      const selectedCircuits = circuits
        .sort(() => Math.random() - 0.5)
        .slice(0, circuitCount);

      setGameSettings(prev => ({
        ...prev,
        selectedCircuits,
        turnsPerCircuit: preset.settings.turnsPerCircuit,
        lapsPerTurn: preset.settings.lapsPerTurn as 3 | 5,
        scoringMethod: preset.settings.scoringMethod,
        pointsForBestLap: preset.settings.pointsForBestLap,
        pointsForBestAverage: preset.settings.pointsForBestAverage
      }));
    }
  };

  // Handle completion
  const handleComplete = () => {
    const finalSettings: GameSettings & { tournamentMode?: boolean } = {
      players: gameSettings.selectedPlayers, // Pass full Player objects
      circuits: gameSettings.selectedCircuits, // Pass full Circuit objects
      controllerIds: gameSettings.selectedPlayers.map(p => p.id), // Controller IDs as separate field
      scoringMethod: gameSettings.scoringMethod,
      turnsPerCircuit: gameSettings.turnsPerCircuit,
      lapsPerTurn: gameSettings.lapsPerTurn,
      useBest4Of5Laps: gameSettings.useBest4Of5,
      pointsForBestLap: gameSettings.pointsForBestLap,
      pointsForBestAverage: gameSettings.pointsForBestAverage,
      awardBestTimeFor: 'turn',
      scoringMultiplier: null, // No multiplier in modern setup
      tournamentMode: selectedPreset === 'torneo' || continuingTournament
    };

    onSetupComplete(finalSettings);
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-f1-2xl font-bold text-f1-pro-platinum mb-4">Inicia tu Campeonato</h2>
        <p className="text-f1-base text-f1-pro-silver">Elige tu experiencia de carrera</p>
      </div>

      {/* Tournament Continuation Option */}
      {isInTournamentMode && activeTournament && (
        <div className="bg-f1-pro-chrome border-2 border-f1-pro-gold rounded-f1-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-f1-large font-bold text-f1-pro-gold">🏆 Torneo Activo</h3>
              <p className="text-f1-base text-f1-pro-silver">{activeTournament.name}</p>
            </div>
            <button
              onClick={() => {
                setContinuingTournament(true);
                setSelectedPreset('torneo');
                // Select next 3 unplayed circuits
                const playedCircuitIds = activeTournament.playedCircuits || [];
                const unplayedCircuits = circuits.filter(c => !playedCircuitIds.includes(c.id));
                const nextCircuits = unplayedCircuits.slice(0, 3).sort(() => Math.random() - 0.5);
                
                setGameSettings(prev => ({
                  ...prev,
                  selectedCircuits: nextCircuits,
                  turnsPerCircuit: 2,
                  lapsPerTurn: 3,
                  scoringMethod: 'average' as const,
                  pointsForBestLap: 2,
                  pointsForBestAverage: 0,
                  useBest4Of5: false
                }));
                setUseQuickStart(false);
                setCurrentStep(2);
              }}
              className="px-6 py-3 bg-f1-pro-gold hover:bg-f1-pro-gold/80 text-black font-bold rounded-f1-lg transition-all"
            >
              Continuar Torneo →
            </button>
          </div>
          <div className="text-f1-small text-f1-pro-aluminum">
            Circuitos jugados: {activeTournament.playedCircuits?.length || 0} / {circuits.length}
          </div>
        </div>
      )}

      {/* Quick Start Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => setUseQuickStart(true)}
          className={`px-6 py-3 rounded-f1-lg font-medium transition-all ${
            useQuickStart 
              ? 'bg-f1-pro-crimson text-white shadow-f1-glow' 
              : 'bg-f1-pro-titanium text-f1-pro-silver hover:bg-f1-pro-steel'
          }`}
        >
          <SparkIcon className="w-5 h-5 inline mr-2" />
          Inicio Rápido
        </button>
        <button
          onClick={() => setUseQuickStart(false)}
          className={`px-6 py-3 rounded-f1-lg font-medium transition-all ${
            !useQuickStart 
              ? 'bg-f1-pro-crimson text-white shadow-f1-glow' 
              : 'bg-f1-pro-titanium text-f1-pro-silver hover:bg-f1-pro-steel'
          }`}
        >
          <CogIcon className="w-5 h-5 inline mr-2" />
          Configuración Manual
        </button>
      </div>

      {useQuickStart ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(QUICK_START_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedPreset(key);
                applyPreset(key);
              }}
              className={`p-6 rounded-f1-xl border-2 transition-all text-left hover:scale-105 ${
                selectedPreset === key
                  ? 'border-f1-pro-gold bg-f1-pro-gold/10 shadow-f1-gold'
                  : 'border-f1-pro-steel bg-f1-pro-chrome hover:border-f1-pro-aluminum'
              }`}
            >
              <preset.icon className="w-12 h-12 text-f1-pro-gold mb-4" />
              <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-2">
                {preset.name}
              </h3>
              <p className="text-f1-small text-f1-pro-silver mb-4">
                {preset.description}
              </p>
              <div className="space-y-2 text-f1-tiny text-f1-pro-aluminum">
                <div>Circuitos: {preset.settings.circuits}</div>
                <div>Turnos: {preset.settings.turnsPerCircuit} por circuito</div>
                <div>Vueltas: {preset.settings.lapsPerTurn} por turno</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border-2 border-dashed border-f1-pro-steel rounded-f1-xl">
          <CogIcon className="w-16 h-16 text-f1-pro-aluminum mx-auto mb-4" />
          <h3 className="text-f1-large font-bold text-f1-pro-silver mb-2">Configuración Manual</h3>
          <p className="text-f1-small text-f1-pro-aluminum">
            Configurarás todos los ajustes manualmente en los siguientes pasos
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-f1-2xl font-bold text-f1-pro-platinum mb-4">Selecciona Participantes y Circuitos</h2>
        <p className="text-f1-base text-f1-pro-silver">Elige quién corre y dónde</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Players Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum">Jugadores</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => mutate('/api/players')}
                className="text-f1-tiny text-f1-pro-aluminum hover:text-f1-pro-platinum flex items-center gap-1"
                title="Refrescar lista de jugadores"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="text-f1-small text-f1-pro-aluminum">
                {gameSettings.selectedPlayers.length} de {players.length}
              </div>
            </div>
          </div>
          
          <div className="space-y-4 max-h-72 overflow-y-auto">
            {/* Main Players Section */}
            <div className="space-y-2">
              <div className="text-f1-tiny text-f1-pro-aluminum uppercase tracking-wider">Pilotos Principales</div>
              {players.filter(p => ['Berna', 'BlackMamba', 'Borgia'].includes(p.name) && p.isActive).map(player => (
                <button
                  key={player.id}
                  onClick={() => {
                    const isSelected = gameSettings.selectedPlayers.find(p => p.id === player.id);
                    setGameSettings(prev => ({
                      ...prev,
                      selectedPlayers: isSelected
                        ? prev.selectedPlayers.filter(p => p.id !== player.id)
                        : [...prev.selectedPlayers, player]
                    }));
                  }}
                  className={`w-full p-4 rounded-f1-lg border-2 transition-all text-left flex items-center space-x-4 ${
                    gameSettings.selectedPlayers.find(p => p.id === player.id)
                      ? 'border-f1-pro-gold bg-f1-pro-gold/10'
                      : 'border-f1-pro-steel bg-f1-pro-chrome hover:border-f1-pro-aluminum'
                  }`}
                >
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="text-f1-medium font-bold text-f1-pro-platinum">
                      {player.name}
                    </div>
                  </div>
                  {gameSettings.selectedPlayers.find(p => p.id === player.id) && (
                    <CheckCircleIcon className="w-6 h-6 text-f1-pro-gold" />
                  )}
                </button>
              ))}
            </div>

            {/* Other Players / Guests Section */}
            {players.filter(p => !['Berna', 'BlackMamba', 'Borgia'].includes(p.name) && p.isActive).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-f1-pro-steel">
                <div className="text-f1-tiny text-f1-pro-aluminum uppercase tracking-wider">Otros Pilotos / Invitados</div>
                {players.filter(p => !['Berna', 'BlackMamba', 'Borgia'].includes(p.name) && p.isActive).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      const isSelected = gameSettings.selectedPlayers.find(p => p.id === player.id);
                      setGameSettings(prev => ({
                        ...prev,
                        selectedPlayers: isSelected
                          ? prev.selectedPlayers.filter(p => p.id !== player.id)
                          : [...prev.selectedPlayers, player]
                      }));
                    }}
                    className={`w-full p-3 rounded-f1-lg border-2 transition-all text-left flex items-center space-x-4 ${
                      gameSettings.selectedPlayers.find(p => p.id === player.id)
                        ? 'border-f1-pro-gold bg-f1-pro-gold/10'
                        : 'border-f1-pro-steel bg-f1-pro-chrome hover:border-f1-pro-aluminum'
                    }`}
                  >
                    <img
                      src={player.imageUrl}
                      alt={player.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-f1-small font-bold text-f1-pro-platinum">
                        {player.name}
                      </div>
                      {player.isGuest && (
                        <div className="text-f1-micro text-f1-pro-aluminum">Invitado</div>
                      )}
                    </div>
                    {gameSettings.selectedPlayers.find(p => p.id === player.id) && (
                      <CheckCircleIcon className="w-5 h-5 text-f1-pro-gold" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Circuits Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum">Circuitos</h3>
            <div className="text-f1-small text-f1-pro-aluminum">
              {gameSettings.selectedCircuits.length} seleccionados
            </div>
          </div>
          
          {!useQuickStart && (
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setGameSettings(prev => ({ ...prev, selectedCircuits: circuits.slice(0, 3).sort(() => Math.random() - 0.5) }))}
                className="px-3 py-1 text-f1-tiny bg-f1-pro-titanium text-f1-pro-silver rounded-f1-sm hover:bg-f1-pro-steel"
              >
                3 Aleatorios
              </button>
              <button
                onClick={() => setGameSettings(prev => ({ ...prev, selectedCircuits: circuits.slice(0, 5).sort(() => Math.random() - 0.5) }))}
                className="px-3 py-1 text-f1-tiny bg-f1-pro-titanium text-f1-pro-silver rounded-f1-sm hover:bg-f1-pro-steel"
              >
                5 Aleatorios
              </button>
              <button
                onClick={() => setGameSettings(prev => ({ ...prev, selectedCircuits: circuits }))}
                className="px-3 py-1 text-f1-tiny bg-f1-pro-titanium text-f1-pro-silver rounded-f1-sm hover:bg-f1-pro-steel"
              >
                Todos los Circuitos
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {circuits.map(circuit => (
              <button
                key={circuit.id}
                onClick={() => {
                  if (useQuickStart && selectedPreset) return; // Don't allow manual selection in quick start
                  
                  const isSelected = gameSettings.selectedCircuits.find(c => c.id === circuit.id);
                  setGameSettings(prev => ({
                    ...prev,
                    selectedCircuits: isSelected
                      ? prev.selectedCircuits.filter(c => c.id !== circuit.id)
                      : [...prev.selectedCircuits, circuit]
                  }));
                }}
                disabled={!!(useQuickStart && selectedPreset)}
                className={`p-3 rounded-f1-md border transition-all text-left ${
                  gameSettings.selectedCircuits.find(c => c.id === circuit.id)
                    ? 'border-f1-pro-gold bg-f1-pro-gold/10'
                    : 'border-f1-pro-steel bg-f1-pro-titanium hover:border-f1-pro-aluminum'
                } ${useQuickStart && selectedPreset ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-f1-small font-bold text-f1-pro-platinum">
                  {circuit.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-f1-2xl font-bold text-f1-pro-platinum mb-4">Revisar y Lanzar</h2>
        <p className="text-f1-base text-f1-pro-silver">Confirma la configuración de tu campeonato</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Summary */}
        <div className="space-y-6">
          <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Configuración</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Tipo</span>
                <span className="text-f1-pro-platinum font-medium">
                  {selectedPreset ? QUICK_START_PRESETS[selectedPreset as keyof typeof QUICK_START_PRESETS].name : 'Personalizado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Circuitos</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.selectedCircuits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Jugadores</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.selectedPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Turnos por Circuito</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.turnsPerCircuit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Vueltas por Turno</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.lapsPerTurn}</span>
              </div>
            </div>
          </div>

          {!useQuickStart && (
            <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
              <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Configuración Avanzada</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-f1-small text-f1-pro-silver mb-2">Método de Puntuación</label>
                  <select
                    value={gameSettings.scoringMethod}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, scoringMethod: e.target.value as any }))}
                    className="w-full bg-f1-pro-titanium border border-f1-pro-steel rounded-f1-md px-3 py-2 text-f1-pro-platinum"
                  >
                    <option value="average">Tiempo Promedio</option>
                    <option value="lap">Mejor Vuelta</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-f1-small text-f1-pro-silver mb-2">Puntos Bonus (Vuelta Rápida)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={gameSettings.pointsForBestLap}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, pointsForBestLap: parseInt(e.target.value) }))}
                    className="w-full bg-f1-pro-titanium border border-f1-pro-steel rounded-f1-md px-3 py-2 text-f1-pro-platinum"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Participants Preview */}
        <div className="space-y-6">
          <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Parrilla de Salida</h3>
            <div className="space-y-3">
              {gameSettings.selectedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-f1-pro-steel rounded-f1-sm flex items-center justify-center text-f1-tiny font-bold text-f1-pro-silver">
                    {index + 1}
                  </div>
                  <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="text-f1-small font-bold text-f1-pro-platinum">{player.name}</div>
                    {player.isGuest && (
                      <div className="text-f1-micro text-f1-pro-aluminum">Invitado</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Calendario de Circuitos</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gameSettings.selectedCircuits.map((circuit, index) => (
                <div key={circuit.id} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-f1-pro-steel rounded-f1-sm flex items-center justify-center text-f1-micro font-bold text-f1-pro-silver">
                    {index + 1}
                  </div>
                  <div className="text-f1-small text-f1-pro-platinum">{circuit.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Launch Button */}
      <div className="text-center">
        <button
          onClick={handleComplete}
          className="px-12 py-4 bg-f1-pro-crimson hover:bg-f1-pro-crimson/80 text-white rounded-f1-xl text-f1-large font-bold transition-all shadow-f1-glow hover:scale-105 inline-flex items-center space-x-3"
        >
          <PlayIcon className="w-6 h-6" />
          <span>Lanzar Campeonato</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-f1-pro-carbon">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Modern Progress Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <React.Fragment key={stepNum}>
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold transition-all ${
                  currentStep === stepNum
                    ? 'border-f1-pro-crimson bg-f1-pro-crimson text-white shadow-f1-glow'
                    : currentStep > stepNum
                    ? 'border-f1-pro-gold bg-f1-pro-gold text-black'
                    : 'border-f1-pro-steel bg-f1-pro-titanium text-f1-pro-silver'
                }`}>
                  {currentStep > stepNum ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    stepNum
                  )}
                </div>
                {stepNum < 3 && (
                  <div className={`w-16 h-0.5 transition-colors ${
                    currentStep > stepNum ? 'bg-f1-pro-gold' : 'bg-f1-pro-steel'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="animate-f1-fade-in">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onCancel?.()}
            className="px-6 py-3 bg-f1-pro-titanium hover:bg-f1-pro-steel text-f1-pro-silver rounded-f1-lg transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{currentStep === 1 ? 'Cancelar' : 'Atrás'}</span>
          </button>

          {currentStep < 3 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
              className="px-6 py-3 bg-f1-pro-crimson hover:bg-f1-pro-crimson/80 disabled:bg-f1-pro-steel disabled:text-f1-pro-aluminum text-white rounded-f1-lg transition-colors inline-flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              <span>Continuar</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernGameSetup;