import React, { useState, useMemo } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import { CheckCircleIcon, ArrowUpIcon, ArrowDownIcon } from './icons';

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

// Presets modernos para quick start
const QUICK_START_PRESETS = {
  'quick-race': {
    name: 'Quick Race',
    description: 'Fast 3-circuit race for immediate action',
    icon: SparkIcon,
    settings: {
      circuits: 3,
      turnsPerCircuit: 1,
      lapsPerTurn: 3,
      scoringMethod: 'average' as const,
      pointsForBestLap: 0,
      pointsForBestAverage: 0
    }
  },
  'championship': {
    name: 'Championship',
    description: 'Full F1 experience with all circuits',
    icon: TrophyIcon,
    settings: {
      circuits: 'all',
      turnsPerCircuit: 2,
      lapsPerTurn: 5,
      scoringMethod: 'both' as const,
      pointsForBestLap: 1,
      pointsForBestAverage: 1
    }
  },
  'practice': {
    name: 'Practice Session',
    description: 'Casual practice with selected circuits',
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
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [useQuickStart, setUseQuickStart] = useState(true);
  
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

  // Validation
  const canProceedStep1 = selectedPreset || !useQuickStart;
  const canProceedStep2 = gameSettings.selectedPlayers.length >= 2 && gameSettings.selectedCircuits.length >= 1;
  const canComplete = currentStep === 3;

  // Apply preset
  const applyPreset = (presetKey: string) => {
    const preset = QUICK_START_PRESETS[presetKey as keyof typeof QUICK_START_PRESETS];
    if (!preset) return;

    const circuitCount = preset.settings.circuits === 'all' 
      ? circuits.length 
      : Math.min(preset.settings.circuits as number, circuits.length);
    
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
  };

  // Handle completion
  const handleComplete = () => {
    const finalSettings: GameSettings = {
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
    };

    onSetupComplete(finalSettings);
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-f1-2xl font-bold text-f1-pro-platinum mb-4">Start Your Championship</h2>
        <p className="text-f1-base text-f1-pro-silver">Choose your racing experience</p>
      </div>

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
          Quick Start
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
          Custom Setup
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
                <div>Circuits: {preset.settings.circuits === 'all' ? 'All' : preset.settings.circuits}</div>
                <div>Turns: {preset.settings.turnsPerCircuit} per circuit</div>
                <div>Laps: {preset.settings.lapsPerTurn} per turn</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border-2 border-dashed border-f1-pro-steel rounded-f1-xl">
          <CogIcon className="w-16 h-16 text-f1-pro-aluminum mx-auto mb-4" />
          <h3 className="text-f1-large font-bold text-f1-pro-silver mb-2">Custom Configuration</h3>
          <p className="text-f1-small text-f1-pro-aluminum">
            You'll configure all settings manually in the next steps
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-f1-2xl font-bold text-f1-pro-platinum mb-4">Select Participants & Circuits</h2>
        <p className="text-f1-base text-f1-pro-silver">Choose who races and where</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Players Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum">Players</h3>
            <div className="text-f1-small text-f1-pro-aluminum">
              {gameSettings.selectedPlayers.length} selected
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {players.map(player => (
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
                  {player.isGuest && (
                    <div className="text-f1-tiny text-f1-pro-aluminum">Guest Player</div>
                  )}
                </div>
                {gameSettings.selectedPlayers.find(p => p.id === player.id) && (
                  <CheckCircleIcon className="w-6 h-6 text-f1-pro-gold" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Circuits Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum">Circuits</h3>
            <div className="text-f1-small text-f1-pro-aluminum">
              {gameSettings.selectedCircuits.length} selected
            </div>
          </div>
          
          {!useQuickStart && (
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setGameSettings(prev => ({ ...prev, selectedCircuits: circuits.slice(0, 3) }))}
                className="px-3 py-1 text-f1-tiny bg-f1-pro-titanium text-f1-pro-silver rounded-f1-sm hover:bg-f1-pro-steel"
              >
                3 Random
              </button>
              <button
                onClick={() => setGameSettings(prev => ({ ...prev, selectedCircuits: circuits.slice(0, 5) }))}
                className="px-3 py-1 text-f1-tiny bg-f1-pro-titanium text-f1-pro-silver rounded-f1-sm hover:bg-f1-pro-steel"
              >
                5 Random
              </button>
              <button
                onClick={() => setGameSettings(prev => ({ ...prev, selectedCircuits: circuits }))}
                className="px-3 py-1 text-f1-tiny bg-f1-pro-titanium text-f1-pro-silver rounded-f1-sm hover:bg-f1-pro-steel"
              >
                All Circuits
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
        <h2 className="text-f1-2xl font-bold text-f1-pro-platinum mb-4">Review & Launch</h2>
        <p className="text-f1-base text-f1-pro-silver">Confirm your championship settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Summary */}
        <div className="space-y-6">
          <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Preset</span>
                <span className="text-f1-pro-platinum font-medium">
                  {selectedPreset ? QUICK_START_PRESETS[selectedPreset as keyof typeof QUICK_START_PRESETS].name : 'Custom'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Circuits</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.selectedCircuits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Players</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.selectedPlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Turns per Circuit</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.turnsPerCircuit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-f1-pro-silver">Laps per Turn</span>
                <span className="text-f1-pro-platinum font-medium">{gameSettings.lapsPerTurn}</span>
              </div>
            </div>
          </div>

          {!useQuickStart && (
            <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
              <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Advanced Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-f1-small text-f1-pro-silver mb-2">Scoring Method</label>
                  <select
                    value={gameSettings.scoringMethod}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, scoringMethod: e.target.value as any }))}
                    className="w-full bg-f1-pro-titanium border border-f1-pro-steel rounded-f1-md px-3 py-2 text-f1-pro-platinum"
                  >
                    <option value="average">Average Time</option>
                    <option value="lap">Best Lap</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-f1-small text-f1-pro-silver mb-2">Bonus Points (Best Lap)</label>
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
            <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Racing Grid</h3>
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
                      <div className="text-f1-micro text-f1-pro-aluminum">Guest</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-f1-pro-chrome rounded-f1-lg p-6 border border-f1-pro-steel">
            <h3 className="text-f1-large font-bold text-f1-pro-platinum mb-4">Circuit Calendar</h3>
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
          <span>Launch Championship</span>
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
            <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {currentStep < 3 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
              className="px-6 py-3 bg-f1-pro-crimson hover:bg-f1-pro-crimson/80 disabled:bg-f1-pro-steel disabled:text-f1-pro-aluminum text-white rounded-f1-lg transition-colors inline-flex items-center space-x-2 disabled:cursor-not-allowed"
            >
              <span>Continue</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernGameSetup;