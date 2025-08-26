import React, { useState, useEffect } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons';
import NavigationBar from './NavigationBar';
import { useTournament } from '../contexts/TournamentContext';

interface GameSetupProps {
  players: Player[];
  circuits: Circuit[];
  onSetupComplete: (settings: GameSettings & { tournamentMode?: boolean }) => void;
  onCancel?: () => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ players: allPlayers, circuits: allCircuits, onSetupComplete, onCancel }) => {
  const { activeTournament, isInTournamentMode, currentChampionshipPosition } = useTournament();
  const [step, setStep] = useState(isInTournamentMode ? 0 : 1);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [orderedPlayers, setOrderedPlayers] = useState<Player[]>([]);
  const [selectedCircuits, setSelectedCircuits] = useState<Circuit[]>([]);
  const [controllerIds, setControllerIds] = useState<string[]>([]);
  
  // Tournament mode selection
  const [tournamentMode, setTournamentMode] = useState(isInTournamentMode);
  
  const [lapsPerTurn, setLapsPerTurn] = useState<3 | 5>(3);
  const [turnsPerCircuit, setTurnsPerCircuit] = useState(2);
  const [pointsForBestLap, setPointsForBestLap] = useState(1);
  const [pointsForBestAverage, setPointsForBestAverage] = useState(1);
  const [awardBestTimeFor, setAwardBestTimeFor] = useState<'turn' | 'circuit' | 'both'>('turn');
  const [useBest4Of5Laps, setUseBest4Of5Laps] = useState(true);
  
  const [scoringMethod, setScoringMethod] = useState<'average' | 'lap' | 'both'>('average');
  const [useMultiplier, setUseMultiplier] = useState(false);
  const [multiplierTarget, setMultiplierTarget] = useState<'average' | 'lap'>('average');
  const [multiplierFactor, setMultiplierFactor] = useState(2);

  const handlePlayerToggle = (player: Player) => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    const newSelection = isSelected
        ? selectedPlayers.filter(p => p.id !== player.id)
        : [...selectedPlayers, player];
    setSelectedPlayers(newSelection);
    
    // Update ordered players list keeping existing order when possible
    if (isSelected) {
      // Remove player from ordered list
      setOrderedPlayers(prev => prev.filter(p => p.id !== player.id));
    } else {
      // Add player to end of ordered list
      setOrderedPlayers(prev => [...prev, player]);
    }
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newOrderedPlayers = [...orderedPlayers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrderedPlayers.length) {
      [newOrderedPlayers[index], newOrderedPlayers[targetIndex]] = [newOrderedPlayers[targetIndex], newOrderedPlayers[index]];
      setOrderedPlayers(newOrderedPlayers);
    }
  };
  
  const moveCircuit = (index: number, direction: 'up' | 'down') => {
    const newOrderedCircuits = [...selectedCircuits];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrderedCircuits.length) {
      [newOrderedCircuits[index], newOrderedCircuits[targetIndex]] = [newOrderedCircuits[targetIndex], newOrderedCircuits[index]];
      setSelectedCircuits(newOrderedCircuits);
    }
  };

  const handleCircuitToggle = (circuit: Circuit) => {
      setSelectedCircuits(prev =>
          prev.find(c => c.id === circuit.id)
          ? prev.filter(c => c.id !== circuit.id)
          : [...prev, circuit]
      );
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    if (selectedPlayers.length < 2) {
      alert("Seleccionar al menos 2 jugadores");
      setStep(1);
      return;
    }
    if (orderedPlayers.length < 2) {
      alert("Ordenar al menos 2 jugadores");
      setStep(2);
      return;
    }
    if (controllerIds.length < 1) {
      alert("Seleccionar al menos 1 registrador de tiempos");
      setStep(3);
      return;
    }
    if (selectedCircuits.length < 1) {
      alert("Seleccionar al menos 1 circuito");
      setStep(4);
      return;
    }
    const settings: GameSettings = {
      players: orderedPlayers,
      circuits: selectedCircuits,
      controllerIds,
      lapsPerTurn,
      turnsPerCircuit,
      scoringMethod,
      scoringMultiplier: (scoringMethod === 'both' && useMultiplier)
        ? { appliesTo: multiplierTarget, factor: multiplierFactor }
        : null,
      pointsForBestLap,
      pointsForBestAverage,
      awardBestTimeFor,
      useBest4Of5Laps,
    };
    onSetupComplete({ ...settings, tournamentMode });
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Tournament Mode Selection (only show if tournament is active)
        if (!isInTournamentMode || !activeTournament) {
          // Skip to player selection if no active tournament
          setStep(1);
          return null;
        }

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-4">Tipo de Campeonato</h2>
              <p className="text-zinc-400 mb-6 text-lg">
                Hay un torneo activo. ¿Este campeonato debe ser parte del torneo o individual?
              </p>
            </div>

            {/* Tournament Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-mono uppercase tracking-wide text-zinc-400">TORNEO ACTIVO</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-4">{activeTournament.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 p-3 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wide text-zinc-400 mb-1">Progreso</div>
                  <div className="font-mono text-lg font-bold text-zinc-100">
                    {((activeTournament.championships?.filter((c: any) => c.status === 'COMPLETED').length) || 0)}/{activeTournament.maxChampionships}
                  </div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wide text-zinc-400 mb-1">Puntos 1°</div>
                  <div className="font-mono text-lg font-bold text-amber-400">{activeTournament.pointsForFirst}</div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wide text-zinc-400 mb-1">Puntos 2°</div>
                  <div className="font-mono text-lg font-bold text-zinc-300">{activeTournament.pointsForSecond}</div>
                </div>
                <div className="bg-zinc-800 p-3 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wide text-zinc-400 mb-1">Puntos 3°</div>
                  <div className="font-mono text-lg font-bold text-amber-500">{activeTournament.pointsForThird}</div>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-4">
              <label className={`flex items-center gap-4 p-6 border-2 rounded-md cursor-pointer transition-all touch-target ${
                tournamentMode 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}>
                <input
                  type="radio"
                  name="tournamentMode"
                  checked={tournamentMode}
                  onChange={() => setTournamentMode(true)}
                  className="w-5 h-5 text-amber-500 bg-zinc-800 border-zinc-600 focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="font-bold text-xl text-zinc-100 mb-2">
                    🏆 Campeonato de Torneo
                  </div>
                  <div className="text-lg text-zinc-400">
                    Será el Campeonato {currentChampionshipPosition} del {activeTournament.name}. Los resultados otorgan puntos para el torneo.
                  </div>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-6 border-2 rounded-md cursor-pointer transition-all touch-target ${
                !tournamentMode 
                  ? 'border-zinc-500 bg-zinc-500/10' 
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}>
                <input
                  type="radio"
                  name="tournamentMode"
                  checked={!tournamentMode}
                  onChange={() => setTournamentMode(false)}
                  className="w-5 h-5 text-zinc-500 bg-zinc-800 border-zinc-600 focus:ring-zinc-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="font-bold text-xl text-zinc-100 mb-2">
                    🎮 Campeonato Individual
                  </div>
                  <div className="text-lg text-zinc-400">
                    Campeonato independiente para práctica o diversión. No afecta el torneo activo.
                  </div>
                </div>
              </label>
            </div>
          </div>
        );
      
      case 1: // Select Players
        // Verificar que hay jugadores disponibles
        if (!allPlayers || allPlayers.length === 0) {
          return (
            <div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-4">1. Seleccionar Jugadores</h2>
              <div className="bg-amber-900/20 border border-amber-600 rounded-md p-6">
                <p className="text-amber-300 text-lg">
                  <strong>Cargando:</strong> Esperando a que se carguen los jugadores...
                </p>
              </div>
            </div>
          );
        }

        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-zinc-100">1. Seleccionar Jugadores</h2>
              <button
                onClick={() => {
                  if (selectedPlayers.length === allPlayers.length) {
                    // Deselect all
                    setSelectedPlayers([]);
                    setOrderedPlayers([]);
                  } else {
                    // Select all
                    setSelectedPlayers([...allPlayers]);
                    setOrderedPlayers([...allPlayers]);
                  }
                }}
                className="px-4 py-3 text-lg font-bold bg-f1-red text-white rounded-md hover:bg-red-700 transition-colors touch-target"
              >
                {selectedPlayers.length === allPlayers.length ? 'DESELECCIONAR TODOS' : 'SELECCIONAR TODOS'}
              </button>
            </div>
            
            <p className="text-zinc-400 mb-6 text-lg">Selecciona los jugadores que participarán:</p>
            
            {/* Regular Players */}
            {allPlayers.filter(p => !p.isGuest).length > 0 && (
              <>
                <h3 className="font-bold text-xl text-zinc-100 mb-4">Jugadores Habituales</h3>
                <div className="space-y-3 mb-6">
                  {allPlayers.filter(p => !p.isGuest).map((player) => {
                    const isSelected = selectedPlayers.find(p => p.id === player.id);
                    return (
                      <div 
                        key={player.id} 
                        onClick={() => handlePlayerToggle(player)}
                        className={`flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all touch-target ${
                          isSelected 
                            ? 'bg-zinc-800 border-2 border-f1-red' 
                            : 'bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <img src={player.imageUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                        <div className="flex-grow">
                          <div className="font-bold text-xl text-zinc-100">{player.name}</div>
                          <div className="text-lg text-zinc-400">
                            {isSelected ? 'Participará en el campeonato' : 'No participará'}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-f1-red">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            {/* Guest Players */}
            {allPlayers.filter(p => p.isGuest).length > 0 && (
              <>
                <h3 className="font-bold text-xl text-zinc-100 mb-4 flex items-center gap-2">
                  <span className="text-amber-400">👤</span>
                  Invitados
                </h3>
                <div className="space-y-3">
                  {allPlayers.filter(p => p.isGuest).map((player) => {
                    const isSelected = selectedPlayers.find(p => p.id === player.id);
                    return (
                      <div 
                        key={player.id} 
                        onClick={() => handlePlayerToggle(player)}
                        className={`flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all touch-target ${
                          isSelected 
                            ? 'bg-zinc-800 border-2 border-amber-500' 
                            : 'bg-zinc-900 border-2 border-zinc-700 hover:border-amber-600/50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                          <span className="text-amber-400 text-xl">👤</span>
                        </div>
                        <div className="flex-grow">
                          <div className="font-bold text-xl text-zinc-100 flex items-center gap-2">
                            {player.name}
                            <span className="text-xs text-amber-500 bg-amber-500/20 px-2 py-1 rounded">INVITADO</span>
                          </div>
                          <div className="text-lg text-zinc-400">
                            {isSelected ? 'Participará en el campeonato' : 'No participará'}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-amber-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            <div className="mt-6 p-4 bg-zinc-800 border border-zinc-700 rounded-md">
              <p className="text-lg text-zinc-100 font-mono">
                <strong>Seleccionados:</strong> {selectedPlayers.length} de {allPlayers.length} jugadores
              </p>
            </div>
          </div>
        );
        
      case 2: // Order Players
        // Verificar que hay jugadores seleccionados
        if (!selectedPlayers || selectedPlayers.length === 0) {
          return (
            <div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-4">2. Orden de Inicio</h2>
              <div className="bg-red-900/20 border border-red-600 rounded-md p-6">
                <p className="text-red-300 text-lg">
                  <strong>Error:</strong> No hay jugadores seleccionados. Regresa al paso anterior.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-zinc-100">2. Orden de Inicio</h2>
              <button
                onClick={() => {
                  const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
                  setOrderedPlayers(shuffled);
                }}
                className="px-4 py-3 text-lg font-bold bg-zinc-700 text-zinc-100 rounded-md hover:bg-zinc-600 transition-colors touch-target"
              >
                🎲 ALEATORIO
              </button>
            </div>
            
            <p className="text-zinc-400 mb-6 text-lg">Usa las flechas para ordenar a los jugadores:</p>
            
            <div className="space-y-3">
              {orderedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-md">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-2xl font-bold text-zinc-100 w-8">{index + 1}.</span>
                    <img src={player.imageUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                    <span className="font-bold text-xl text-zinc-100">{player.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => movePlayer(index, 'up')} 
                      disabled={index === 0} 
                      className="p-3 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target transition-colors"
                    >
                      <ArrowUpIcon className="w-6 h-6 text-zinc-100"/>
                    </button>
                    <button 
                      onClick={() => movePlayer(index, 'down')} 
                      disabled={index === orderedPlayers.length-1} 
                      className="p-3 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target transition-colors"
                    >
                      <ArrowDownIcon className="w-6 h-6 text-zinc-100"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 3: // Select Controllers
        // Verificar que hay jugadores ordenados
        if (!orderedPlayers || orderedPlayers.length === 0) {
          return (
            <div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-4">3. Registradores de Tiempos</h2>
              <div className="bg-red-900/20 border border-red-600 rounded-md p-6">
                <p className="text-red-300 text-lg">
                  <strong>Error:</strong> No hay jugadores disponibles. Regresa a los pasos anteriores.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div>
            <h2 className="text-3xl font-bold text-zinc-100 mb-6">3. Registradores de Tiempos</h2>
            <p className="text-zinc-400 mb-6 text-lg">Selecciona quiénes pueden registrar tiempos durante las carreras:</p>
            
            <div className="space-y-3">
              {orderedPlayers.map(player => {
                const isSelected = controllerIds.includes(player.id);
                return (
                  <div 
                    key={player.id} 
                    onClick={() => {
                      if (isSelected) {
                        setControllerIds(prev => prev.filter(id => id !== player.id));
                      } else {
                        setControllerIds(prev => [...prev, player.id]);
                      }
                    }}
                    className={`flex items-center gap-4 p-4 rounded-md cursor-pointer transition-all touch-target ${
                      isSelected 
                        ? 'bg-zinc-800 border-2 border-f1-red' 
                        : 'bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <img src={player.imageUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-grow">
                      <div className="font-bold text-xl text-zinc-100">{player.name}</div>
                      <div className="text-lg text-zinc-400">
                        {isSelected ? 'Puede registrar tiempos' : 'Solo espectador'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-f1-red">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 bg-zinc-800 border border-zinc-700 rounded-md">
              <p className="text-lg text-zinc-100">
                <strong>Info:</strong> Los registradores pueden alternar el control durante las carreras. 
                Otros jugadores solo pueden ver el progreso.
              </p>
            </div>
          </div>
        );
        
      case 4: // Select & Order Circuits
        const availableCircuits = allCircuits.filter(c => !selectedCircuits.find(sc => sc.id === c.id));
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-zinc-100">4. Seleccionar Circuitos</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const shuffled = [...allCircuits].sort(() => Math.random() - 0.5);
                    const randomSelection = shuffled.slice(0, Math.min(3, shuffled.length));
                    setSelectedCircuits(randomSelection);
                  }}
                  className="px-4 py-3 text-lg font-bold bg-zinc-700 text-zinc-100 rounded-md hover:bg-zinc-600 transition-colors touch-target"
                >
                  🎲 RANDOM
                </button>
                <button
                  onClick={() => setSelectedCircuits([])}
                  className="px-4 py-3 text-lg font-bold bg-f1-red text-white rounded-md hover:bg-red-700 transition-colors touch-target"
                >
                  ⚙️ MANUAL
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-xl text-zinc-100 mb-4">Circuitos Disponibles</h3>
                <div className="space-y-3">
                  {availableCircuits.map(circuit => (
                    <div 
                      key={circuit.id} 
                      onClick={() => handleCircuitToggle(circuit)} 
                      className="p-4 bg-zinc-900 border border-zinc-800 rounded-md cursor-pointer hover:border-zinc-600 transition-colors touch-target"
                    >
                      <div className="font-bold text-lg text-zinc-100">{circuit.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-xl text-zinc-100 mb-4">Orden de Carrera</h3>
                <div className="space-y-3">
                  {selectedCircuits.map((circuit, index) => (
                    <div key={circuit.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-md">
                      <span 
                        onClick={() => handleCircuitToggle(circuit)} 
                        className="cursor-pointer flex-grow font-bold text-lg text-zinc-100"
                      >
                        {index + 1}. {circuit.name}
                      </span>
                      <div className="flex gap-2 ml-4">
                        <button 
                          onClick={() => moveCircuit(index, 'up')} 
                          disabled={index === 0} 
                          className="p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 touch-target transition-colors"
                        >
                          <ArrowUpIcon className="w-5 h-5 text-zinc-100"/>
                        </button>
                        <button 
                          onClick={() => moveCircuit(index, 'down')} 
                          disabled={index === selectedCircuits.length-1} 
                          className="p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 touch-target transition-colors"
                        >
                          <ArrowDownIcon className="w-5 h-5 text-zinc-100"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 5: // Race Parameters
        return (
          <div>
            <h2 className="text-3xl font-bold text-zinc-100 mb-6">5. Configuración de Carrera</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-zinc-400 mb-4 text-lg font-bold">Vueltas por Turno</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setLapsPerTurn(3)} 
                    className={`flex-1 p-4 rounded-md font-bold text-xl touch-target transition-colors ${
                      lapsPerTurn === 3 ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    3 Vueltas
                  </button>
                  <button 
                    onClick={() => setLapsPerTurn(5)} 
                    className={`flex-1 p-4 rounded-md font-bold text-xl touch-target transition-colors ${
                      lapsPerTurn === 5 ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    5 Vueltas
                  </button>
                </div>
              </div>
              
              {lapsPerTurn === 5 && (
                <div>
                  <label className="block text-zinc-400 mb-4 text-lg font-bold">En 5-vueltas, valen:</label>
                  <div className="flex items-center gap-4 bg-zinc-800 p-4 rounded-md">
                    <input 
                      type="checkbox" 
                      id="best4of5" 
                      checked={useBest4Of5Laps} 
                      onChange={e => setUseBest4Of5Laps(e.target.checked)} 
                      className="h-6 w-6 rounded bg-zinc-900 border-zinc-600 text-f1-red focus:ring-f1-red"
                    />
                    <label htmlFor="best4of5" className="text-lg text-zinc-100">
                      Mejores 4 de 5 vueltas para el promedio
                    </label>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-zinc-400 mb-4 text-lg font-bold">Turnos por Circuito</label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(turns => (
                    <button
                      key={turns}
                      onClick={() => setTurnsPerCircuit(turns)}
                      className={`px-6 py-4 rounded-md font-bold text-xl touch-target transition-colors ${
                        turnsPerCircuit === turns 
                          ? 'bg-f1-red text-white' 
                          : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                      }`}
                    >
                      {turns}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 6: // Points System
        return (
          <div>
            <h2 className="text-3xl font-bold text-zinc-100 mb-6">6. Sistema de Puntaje</h2>
            
            <div className="space-y-6">
              {/* Main Scoring */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md">
                <h3 className="font-bold text-xl text-f1-red mb-4">Puntaje Principal por Turno</h3>
                <p className="text-lg text-zinc-400 mb-4">Elige como asignar puntos (1ro: 3, 2do: 2, 3ro: 1):</p>
                
                <label className="block text-zinc-400 mb-4 text-lg font-bold">Se entregan puntos en base a:</label>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setScoringMethod('average')} 
                    className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                      scoringMethod === 'average' ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    Mejor Promedio
                  </button>
                  <button 
                    onClick={() => setScoringMethod('lap')} 
                    className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                      scoringMethod === 'lap' ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    Vuelta Rápida
                  </button>
                  <button 
                    onClick={() => setScoringMethod('both')} 
                    className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                      scoringMethod === 'both' ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    }`}
                  >
                    Los Dos
                  </button>
                </div>

                {scoringMethod === 'both' && (
                  <div className="space-y-4 mt-6 pt-4 border-t border-zinc-700">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setUseMultiplier(false)} 
                        className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                          !useMultiplier ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                        }`}
                      >
                        Igual (3-2-1 each)
                      </button>
                      <button 
                        onClick={() => setUseMultiplier(true)} 
                        className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                          useMultiplier ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                        }`}
                      >
                        Usar Multiplicador
                      </button>
                    </div>
                    
                    {useMultiplier && (
                      <div className="space-y-4 p-4 bg-zinc-800 rounded-md">
                        <label className="block text-zinc-400 mb-2 text-lg">Apply x{multiplierFactor} multiplicar por:</label>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setMultiplierTarget('average')} 
                            className={`flex-1 p-3 rounded-md font-bold text-lg touch-target transition-colors ${
                              multiplierTarget === 'average' ? 'bg-f1-red text-white' : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                            }`}
                          >
                            Mejor Promedio
                          </button>
                          <button 
                            onClick={() => setMultiplierTarget('lap')} 
                            className={`flex-1 p-3 rounded-md font-bold text-lg touch-target transition-colors ${
                              multiplierTarget === 'lap' ? 'bg-f1-red text-white' : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                            }`}
                          >
                            Vuelta Rápida
                          </button>
                        </div>
                        <input 
                          type="range" 
                          min="2" 
                          max="5" 
                          value={multiplierFactor} 
                          onChange={e => setMultiplierFactor(parseInt(e.target.value))} 
                          className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-f1-red" 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extra Points */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md">
                <h3 className="font-bold text-xl text-f1-red mb-4">Puntos Extra</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-zinc-400 mb-4 text-lg font-bold">Puntos extra por Vuelta Rápida</label>
                    <div className="flex gap-3">
                      {[0, 1, 2, 3, 4, 5].map(points => (
                        <button
                          key={points}
                          onClick={() => setPointsForBestLap(points)}
                          className={`px-4 py-3 rounded-md font-bold text-lg touch-target transition-colors ${
                            pointsForBestLap === points 
                              ? 'bg-f1-red text-white' 
                              : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          }`}
                        >
                          {points}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-zinc-400 mb-4 text-lg font-bold">Puntos Extra por Mejor Promedio</label>
                    <div className="flex gap-3">
                      {[0, 1, 2, 3, 4, 5].map(points => (
                        <button
                          key={points}
                          onClick={() => setPointsForBestAverage(points)}
                          className={`px-4 py-3 rounded-md font-bold text-lg touch-target transition-colors ${
                            pointsForBestAverage === points 
                              ? 'bg-f1-red text-white' 
                              : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          }`}
                        >
                          {points}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-zinc-400 mb-4 text-lg font-bold">Entregar puntos extra por:</label>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setAwardBestTimeFor('turn')} 
                        className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                          awardBestTimeFor === 'turn' ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                        }`}
                      >
                        Por Turno
                      </button>
                      <button 
                        onClick={() => setAwardBestTimeFor('circuit')} 
                        className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                          awardBestTimeFor === 'circuit' ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                        }`}
                      >
                        Por Circuito
                      </button>
                      <button 
                        onClick={() => setAwardBestTimeFor('both')} 
                        className={`flex-1 p-4 rounded-md font-bold text-lg touch-target transition-colors ${
                          awardBestTimeFor === 'both' ? 'bg-f1-red text-white' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                        }`}
                      >
                        Los Dos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
       case 7: // Review
        const { scoringMultiplier } = (scoringMethod === 'both' && useMultiplier) 
            ? { scoringMultiplier: { appliesTo: multiplierTarget, factor: multiplierFactor } } 
            : { scoringMultiplier: null };

        return (
          <div>
            <h2 className="text-3xl font-bold text-zinc-100 mb-6">7. Revisión e Inicio</h2>
            
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-6">
              <div>
                <h3 className="font-bold text-xl text-zinc-100 mb-3">Orden de Jugadores:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {orderedPlayers.map(p => (
                    <li key={p.id} className="text-lg text-zinc-300 font-mono">{p.name}</li>
                  ))}
                </ol>
              </div>
              
              <div>
                <h3 className="font-bold text-xl text-zinc-100 mb-3">Registradores de Tiempos:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {controllerIds.map(id => {
                    const player = orderedPlayers.find(p => p.id === id);
                    return <li key={id} className="text-lg text-zinc-300 font-mono">{player?.name}</li>;
                  })}
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-xl text-zinc-100 mb-3">Orden de Circuitos:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {selectedCircuits.map(c => (
                    <li key={c.id} className="text-lg text-zinc-300 font-mono">{c.name}</li>
                  ))}
                </ol>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-zinc-700">
                <div className="space-y-3">
                  <p className="text-lg text-zinc-100">
                    <strong>Vueltas/Turnos:</strong> <span className="font-mono text-zinc-300">{lapsPerTurn} {lapsPerTurn === 5 ? `(Best 4 of 5: ${useBest4Of5Laps ? 'Sí' : 'No'})` : ''}</span>
                  </p>
                  <p className="text-lg text-zinc-100">
                    <strong>Turnos/Circuito:</strong> <span className="font-mono text-zinc-300">{turnsPerCircuit}</span>
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-lg text-zinc-100">
                    <strong>Sistema de Puntaje:</strong> <span className="font-mono text-zinc-300">
                      {scoringMethod}{scoringMethod === 'both' && scoringMultiplier ? ` (x${scoringMultiplier.factor} on ${scoringMultiplier.appliesTo})` : scoringMethod === 'both' ? ' (Puntos iguales)' : ''}
                    </span>
                  </p>
                  <p className="text-lg text-zinc-100">
                    <strong>Puntos Extra:</strong> <span className="font-mono text-zinc-300">Vuelta Rápida: {pointsForBestLap}, Mejor Promedio: {pointsForBestAverage}</span>
                  </p>
                  <p className="text-lg text-zinc-100">
                    <strong>Entrega Extra Por:</strong> <span className="font-mono text-zinc-300">{awardBestTimeFor}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const totalSteps = 7;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <NavigationBar 
        title="Configuración de Campeonato"
        subtitle={`Paso ${step} de ${totalSteps}`}
        onBack={step > (isInTournamentMode ? 0 : 1) ? handleBack : undefined}
        onCancel={onCancel}
      />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 pb-32">
          <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-md shadow-2xl">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full bg-zinc-700 rounded-full h-3">
                <div 
                  className="bg-f1-red h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Step Content */}
            <div>
              {renderStep()}
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-zinc-700">
              {onCancel && (
                <button 
                  onClick={onCancel} 
                  className="bg-zinc-700 text-zinc-100 font-bold py-4 px-8 rounded-md hover:bg-zinc-600 transition-colors touch-target text-lg"
                >
                  Cancelar
                </button>
              )}
              
              {step > (isInTournamentMode ? 0 : 1) && (
                <button 
                  onClick={handleBack} 
                  className="bg-zinc-700 text-zinc-100 font-bold py-4 px-8 rounded-md hover:bg-zinc-600 transition-colors touch-target text-lg"
                >
                  Regresar
                </button>
              )}
              
              <div className="ml-auto">
                {step < totalSteps ? (
                  <button 
                    onClick={handleNext} 
                    disabled={
                      (step === 1 && selectedPlayers.length < 2) ||
                      (step === 3 && controllerIds.length < 1) || 
                      (step === 4 && selectedCircuits.length < 1)
                    } 
                    className="bg-f1-red text-white font-bold py-4 px-8 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target text-lg"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit} 
                    className="bg-green-600 text-white font-bold py-4 px-8 rounded-md hover:bg-green-700 transition-colors touch-target text-lg"
                  >
                    INICIAR CAMPEONATO!
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;