import React, { useState } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons';
import NavigationBar from './NavigationBar';

interface GameSetupProps {
  players: Player[];
  circuits: Circuit[];
  onSetupComplete: (settings: GameSettings) => void;
  onCancel?: () => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ players: allPlayers, circuits: allCircuits, onSetupComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [orderedPlayers, setOrderedPlayers] = useState<Player[]>([]);
  const [selectedCircuits, setSelectedCircuits] = useState<Circuit[]>([]);
  const [controllerIds, setControllerIds] = useState<string[]>([]);
  
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
    onSetupComplete(settings);
  };
  
  // Don't auto-select all players - let user choose

  const renderStep = () => {
    switch (step) {
      case 1: // Select Players
        // Verificar que hay jugadores disponibles
        if (!allPlayers || allPlayers.length === 0) {
          return (
            <div>
              <h2 className="text-2xl font-bold mb-4">1. Seleccionar Jugadores</h2>
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <p className="text-yellow-300">
                  <strong>Cargando:</strong> Esperando a que se carguen los jugadores... Si el problema persiste, verifica que haya jugadores registrados en el sistema.
                </p>
              </div>
            </div>
          );
        }

        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">1. Seleccionar Jugadores</h2>
              <div className="flex gap-2">
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
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedPlayers.length === allPlayers.length ? '❌ Deseleccionar Todos' : '✅ Seleccionar Todos'}
                </button>
              </div>
            </div>
            <p className="text-slate-400 mb-4">Selecciona los jugadores que participarán en este torneo:</p>
            <div className="space-y-2">
              {allPlayers.map((player) => {
                const isSelected = selectedPlayers.find(p => p.id === player.id);
                return (
                  <div 
                    key={player.id} 
                    onClick={() => handlePlayerToggle(player)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-green-900/50 border-2 border-green-500' 
                        : 'bg-slate-800 border-2 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-grow">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-slate-400">
                        {isSelected ? 'Participará en el torneo' : 'No participará'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
              <p className="text-sm text-blue-300">
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
              <h2 className="text-2xl font-bold mb-4">2. Orden de Inicio</h2>
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                <p className="text-red-300">
                  <strong>Error:</strong> No hay jugadores seleccionados. Por favor regresa al paso anterior y selecciona al menos 2 jugadores.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">2. Orden de Inicio</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
                    setOrderedPlayers(shuffled);
                  }}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🎲 Aleatorio
                </button>
              </div>
            </div>
            <p className="text-slate-400 mb-4">Arrastra o usa las flechas para ordenar a los jugadores seleccionados:</p>
            <div className="space-y-2">
              {orderedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-6">{index + 1}.</span>
                    <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full" />
                    <span className="font-semibold">{player.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => movePlayer(index, 'up')} 
                      disabled={index === 0} 
                      className="p-2 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUpIcon className="w-5 h-5"/>
                    </button>
                    <button 
                      onClick={() => movePlayer(index, 'down')} 
                      disabled={index === orderedPlayers.length-1} 
                      className="p-2 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownIcon className="w-5 h-5"/>
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
              <h2 className="text-2xl font-bold mb-4">3. Registradores de Tiempos</h2>
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                <p className="text-red-300">
                  <strong>Error:</strong> No hay jugadores disponibles. Por favor regresa a los pasos anteriores y selecciona jugadores.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">3. Registradores de Tiempos</h2>
            <p className="text-slate-400 mb-4">Selecciona quiénes pueden registrar tiempos durante las carreras:</p>
            <div className="space-y-2">
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-green-900/50 border-2 border-green-500' 
                        : 'bg-slate-800 border-2 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-grow">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-slate-400">
                        {isSelected ? 'Puede registrar tiempos' : 'Solo espectador'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Info:</strong> Los registradores pueden alternar el control durante las carreras. 
                Otros jugadores aparecerán como espectadores y solo podrán ver el progreso.
              </p>
            </div>
          </div>
        );
      case 4: // Select & Order Circuits
        const availableCircuits = allCircuits.filter(c => !selectedCircuits.find(sc => sc.id === c.id));
        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">4. Selecciona Circuitos</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const shuffled = [...allCircuits].sort(() => Math.random() - 0.5);
                        const randomSelection = shuffled.slice(0, Math.min(3, shuffled.length));
                        setSelectedCircuits(randomSelection);
                      }}
                      className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                      🎲 RANDOM
                    </button>
                    <button
                      onClick={() => setSelectedCircuits([])}
                      className="px-3 py-2 text-sm bg-[#FF1801] text-white rounded-lg hover:bg-[#E61601] transition-colors font-semibold"
                    >
                      ⚙️ MANUAL
                    </button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Circuitos</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
                            {availableCircuits.map(circuit => (
                                <div key={circuit.id} onClick={() => handleCircuitToggle(circuit)} className="p-2 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600">
                                    {circuit.name}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Orden de Carrrera</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
                           {selectedCircuits.map((circuit, index) => (
                                <div key={circuit.id} className="flex items-center justify-between bg-slate-700 p-2 rounded-lg">
                                    <span onClick={() => handleCircuitToggle(circuit)} className="cursor-pointer flex-grow">{index + 1}. {circuit.name}</span>
                                    <div className="flex gap-1 flex-shrink-0 ml-2">
                                        <button onClick={() => moveCircuit(index, 'up')} disabled={index===0} className="p-1 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50"><ArrowUpIcon className="w-4 h-4"/></button>
                                        <button onClick={() => moveCircuit(index, 'down')} disabled={index===selectedCircuits.length-1} className="p-1 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50"><ArrowDownIcon className="w-4 h-4"/></button>
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
            <h2 className="text-2xl font-bold mb-6">5. Configuración</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-slate-400 mb-2">Vueltas por Turno</label>
                <div className="flex gap-4">
                  <button onClick={() => setLapsPerTurn(3)} className={`flex-1 p-3 rounded-lg ${lapsPerTurn === 3 ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>3 Vueltas</button>
                  <button onClick={() => setLapsPerTurn(5)} className={`flex-1 p-3 rounded-lg ${lapsPerTurn === 5 ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>5 Vueltas</button>
                </div>
              </div>
              {lapsPerTurn === 5 && (
                 <div>
                    <label className="block text-slate-400 mb-2">En 5-vueltas, valen:</label>
                     <div className="flex items-center gap-4 bg-slate-700 p-3 rounded-lg">
                        <input type="checkbox" id="best4of5" checked={useBest4Of5Laps} onChange={e => setUseBest4Of5Laps(e.target.checked)} className="h-5 w-5 rounded bg-slate-800 border-slate-600 text-[#FF1801] focus:ring-red-500"/>
                        <label htmlFor="best4of5">Mejores 4 de 5 vueltas para el promedio</label>
                     </div>
                 </div>
              )}
               <div>
                <label className="block text-slate-400 mb-3">Turnos por Circuito</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(turns => (
                    <button
                      key={turns}
                      onClick={() => setTurnsPerCircuit(turns)}
                      className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                        turnsPerCircuit === turns 
                          ? 'bg-[#FF1801] text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
            <h2 className="text-2xl font-bold mb-6">6. Puntaje</h2>
            <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg text-[#FF1801]">Puntaje Principal por Turno</h3>
                <p className="text-sm text-slate-400">Elija como asignar  (1ro: 3, 2do: 2, 3ro: 1) puntos</p>
                <div>
                <label className="block text-slate-400 mb-2">Se entregan puntos en base a:</label>
                <div className="flex gap-2">
                    <button onClick={() => setScoringMethod('average')} className={`flex-1 p-2 rounded-lg ${scoringMethod === 'average' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Mejor Promedio</button>
                    <button onClick={() => setScoringMethod('lap')} className={`flex-1 p-2 rounded-lg ${scoringMethod === 'lap' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Vuelta Rápida</button>
                    <button onClick={() => setScoringMethod('both')} className={`flex-1 p-2 rounded-lg ${scoringMethod === 'both' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Los Dos</button>
                </div>
                </div>

                {scoringMethod === 'both' && (
                <div className="space-y-4 pt-4 border-t border-slate-600/50">
                    <div className="flex gap-4 p-2 bg-slate-800 rounded-lg">
                    <button onClick={() => setUseMultiplier(false)} className={`flex-1 p-2 rounded-lg ${!useMultiplier ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Igual (3-2-1 each)</button>
                    <button onClick={() => setUseMultiplier(true)} className={`flex-1 p-2 rounded-lg ${useMultiplier ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Usar Multiplicador</button>
                    </div>
                    {useMultiplier && (
                    <div className="space-y-4 p-3 bg-slate-800 rounded-lg">
                        <label className="block text-slate-400 mb-2">Apply x{multiplierFactor} multiplicar por:</label>
                        <div className="flex gap-2">
                            <button onClick={() => setMultiplierTarget('average')} className={`flex-1 p-2 rounded-lg ${multiplierTarget === 'average' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Mejor Promedio</button>
                            <button onClick={() => setMultiplierTarget('lap')} className={`flex-1 p-2 rounded-lg ${multiplierTarget === 'lap' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Vuelta Rápida</button>
                        </div>
                        <input type="range" min="2" max="5" value={multiplierFactor} onChange={e => setMultiplierFactor(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FF1801]" />
                    </div>
                    )}
                </div>
                )}
            </div>

            <div className="space-y-4 mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg text-[#FF1801]">Puntos Extra</h3>
                <div>
                    <label className="block text-slate-400 mb-3">Puntos extra por Vuelta Rápida</label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 4, 5].map(points => (
                        <button
                          key={points}
                          onClick={() => setPointsForBestLap(points)}
                          className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                            pointsForBestLap === points 
                              ? 'bg-[#FF1801] text-white' 
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {points}
                        </button>
                      ))}
                    </div>
                </div>
                <div>
                    <label className="block text-slate-400 mb-3">Puntos Extra por Mejor Promedio</label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 4, 5].map(points => (
                        <button
                          key={points}
                          onClick={() => setPointsForBestAverage(points)}
                          className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                            pointsForBestAverage === points 
                              ? 'bg-[#FF1801] text-white' 
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {points}
                        </button>
                      ))}
                    </div>
                </div>
                <div>
                    <label className="block text-slate-400 mb-2">Entregar puntos extra por:</label>
                    <div className="flex gap-2">
                        <button onClick={()=>setAwardBestTimeFor('turn')} className={`flex-1 p-2 rounded-lg ${awardBestTimeFor === 'turn' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Vuelta</button>
                        <button onClick={()=>setAwardBestTimeFor('circuit')} className={`flex-1 p-2 rounded-lg ${awardBestTimeFor === 'circuit' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Circuito</button>
                        <button onClick={()=>setAwardBestTimeFor('both')} className={`flex-1 p-2 rounded-lg ${awardBestTimeFor === 'both' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Los Dos</button>
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
                <h2 className="text-2xl font-bold mb-4">7. Revisión e Inicio</h2>
                <div className="bg-slate-800 p-4 rounded-lg space-y-4 text-slate-300">
                    <div><strong>Orden de Jugadores:</strong>
                        <ol className="list-decimal list-inside pl-4">
                            {orderedPlayers.map(p => <li key={p.id}>{p.name}</li>)}
                        </ol>
                    </div>
                    <div><strong>Registradores de Tiempos:</strong>
                        <ul className="list-disc list-inside pl-4">
                            {controllerIds.map(id => {
                              const player = orderedPlayers.find(p => p.id === id);
                              return <li key={id}>{player?.name}</li>;
                            })}
                        </ul>
                    </div>
                    <div><strong>Circuit Order:</strong> 
                        <ol className="list-decimal list-inside pl-4">
                            {selectedCircuits.map(c => <li key={c.id}>{c.name}</li>)}
                        </ol>
                    </div>
                    <p><strong>Vueltas/Turnos:</strong> {lapsPerTurn} {lapsPerTurn === 5 ? `(Using best 4 laps: ${useBest4Of5Laps ? 'Yes' : 'No'})` : ''}</p>
                    <p><strong>Turnos/Circuito:</strong> {turnsPerCircuit}</p>
                    <p><strong>Sistema de Puntaje:</strong> Basado en {scoringMethod}{scoringMethod === 'both' && scoringMultiplier ? ` (x${scoringMultiplier.factor} on ${scoringMultiplier.appliesTo})` : scoringMethod === 'both' ? ' (Equal points)' : ''}</p>
                    <p><strong>Puntos Extra (Vuelta Rápida):</strong> {pointsForBestLap}</p>
                    <p><strong>Puntos Extra (Mejor Promedio):</strong> {pointsForBestAverage}</p>
                    <p><strong>
                      
                      
                      Entrega Puntos Extra:</strong> Por {awardBestTimeFor}</p>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  const totalSteps = 7;

  return (
    <div className="min-h-screen bg-slate-900">
      <NavigationBar 
        title="Configuración de Carrera"
        subtitle={`Paso ${step} de ${totalSteps}`}
        onBack={step > 1 ? handleBack : undefined}
        onCancel={onCancel}
      />
      
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-slate-700">
          <div className="mb-6">
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <div className="bg-[#FF1801] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
              </div>
          </div>
          <div className="min-h-[350px]">
           {renderStep()}
          </div>
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} disabled={step === 1} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Regresar
            </button>
            {step < totalSteps ? (
              <button 
                onClick={handleNext} 
                disabled={
                  (step === 1 && selectedPlayers.length < 2) ||
                  (step === 3 && controllerIds.length < 1) || 
                  (step === 4 && selectedCircuits.length < 1)
                } 
                className="bg-[#FF1801] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#E61601] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button onClick={handleSubmit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                Iniciar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;