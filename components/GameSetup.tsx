import React, { useState } from 'react';
import { Player, Circuit, GameSettings } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

interface GameSetupProps {
  players: Player[];
  circuits: Circuit[];
  onSetupComplete: (settings: GameSettings) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ players: allPlayers, circuits: allCircuits, onSetupComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [orderedPlayers, setOrderedPlayers] = useState<Player[]>([]);
  const [selectedCircuits, setSelectedCircuits] = useState<Circuit[]>([]);
  
  const [lapsPerTurn, setLapsPerTurn] = useState<3 | 5>(3);
  const [turnsPerCircuit, setTurnsPerCircuit] = useState(3);
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
    setOrderedPlayers(newSelection); // Keep ordered list in sync
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
    if (orderedPlayers.length < 2) {
      alert("Please select and order at least 2 players.");
      setStep(1);
      return;
    }
    if (selectedCircuits.length < 1) {
      alert("Please select and order at least 1 circuit.");
      setStep(3);
      return;
    }
    const settings: GameSettings = {
      players: orderedPlayers,
      circuits: selectedCircuits,
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
  
  const renderStep = () => {
    switch (step) {
      case 1: // Select Players
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">1. Select Players</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {allPlayers.map(player => (
                <div key={player.id} onClick={() => handlePlayerToggle(player)} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedPlayers.find(p => p.id === player.id) ? 'border-[#FF1801] bg-red-900/50' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'}`}>
                  <img src={player.imageUrl} alt={player.name} className="w-20 h-20 rounded-full mx-auto" />
                  <p className="text-center font-semibold mt-2">{player.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 2: // Order Players
        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">2. Set Player Order</h2>
                <div className="space-y-2">
                    {orderedPlayers.map((player, index) => (
                        <div key={player.id} className="flex items-center justify-between bg-slate-700 p-2 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-lg w-6">{index + 1}.</span>
                                <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full" />
                                <span className="font-semibold">{player.name}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => movePlayer(index, 'up')} disabled={index===0} className="p-2 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUpIcon className="w-5 h-5"/></button>
                                <button onClick={() => movePlayer(index, 'down')} disabled={index===orderedPlayers.length-1} className="p-2 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"><ArrowDownIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
      case 3: // Select & Order Circuits
        const availableCircuits = allCircuits.filter(c => !selectedCircuits.find(sc => sc.id === c.id));
        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">3. Select & Order Circuits</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Available Circuits</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
                            {availableCircuits.map(circuit => (
                                <div key={circuit.id} onClick={() => handleCircuitToggle(circuit)} className="p-2 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600">
                                    {circuit.name}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Selected Race Order</h3>
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
      case 4: // Race Parameters
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">4. Race Parameters</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-slate-400 mb-2">Laps per Turn</label>
                <div className="flex gap-4">
                  <button onClick={() => setLapsPerTurn(3)} className={`flex-1 p-3 rounded-lg ${lapsPerTurn === 3 ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>3 Laps</button>
                  <button onClick={() => setLapsPerTurn(5)} className={`flex-1 p-3 rounded-lg ${lapsPerTurn === 5 ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>5 Laps</button>
                </div>
              </div>
              {lapsPerTurn === 5 && (
                 <div>
                    <label className="block text-slate-400 mb-2">For 5-lap turns, count:</label>
                     <div className="flex items-center gap-4 bg-slate-700 p-3 rounded-lg">
                        <input type="checkbox" id="best4of5" checked={useBest4Of5Laps} onChange={e => setUseBest4Of5Laps(e.target.checked)} className="h-5 w-5 rounded bg-slate-800 border-slate-600 text-[#FF1801] focus:ring-red-500"/>
                        <label htmlFor="best4of5">Best 4 of 5 laps for average</label>
                     </div>
                 </div>
              )}
               <div>
                <label className="block text-slate-400 mb-2">Turns per Circuit ({turnsPerCircuit})</label>
                <input type="range" min="1" max="10" value={turnsPerCircuit} onChange={e => setTurnsPerCircuit(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FF1801]" />
              </div>
            </div>
          </div>
        );
      case 5: // Points System
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">5. Points System</h2>
            <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg text-[#FF1801]">Main Scoring per Turn</h3>
                <p className="text-sm text-slate-400">Choose how base points (1st: 3, 2nd: 2, 3rd: 1) are awarded.</p>
                <div>
                <label className="block text-slate-400 mb-2">Award points based on:</label>
                <div className="flex gap-2">
                    <button onClick={() => setScoringMethod('average')} className={`flex-1 p-2 rounded-lg ${scoringMethod === 'average' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Best Average</button>
                    <button onClick={() => setScoringMethod('lap')} className={`flex-1 p-2 rounded-lg ${scoringMethod === 'lap' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Fastest Lap</button>
                    <button onClick={() => setScoringMethod('both')} className={`flex-1 p-2 rounded-lg ${scoringMethod === 'both' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Both</button>
                </div>
                </div>

                {scoringMethod === 'both' && (
                <div className="space-y-4 pt-4 border-t border-slate-600/50">
                    <div className="flex gap-4 p-2 bg-slate-800 rounded-lg">
                    <button onClick={() => setUseMultiplier(false)} className={`flex-1 p-2 rounded-lg ${!useMultiplier ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Equal (3-2-1 each)</button>
                    <button onClick={() => setUseMultiplier(true)} className={`flex-1 p-2 rounded-lg ${useMultiplier ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Use Multiplier</button>
                    </div>
                    {useMultiplier && (
                    <div className="space-y-4 p-3 bg-slate-800 rounded-lg">
                        <label className="block text-slate-400 mb-2">Apply x{multiplierFactor} multiplier to:</label>
                        <div className="flex gap-2">
                            <button onClick={() => setMultiplierTarget('average')} className={`flex-1 p-2 rounded-lg ${multiplierTarget === 'average' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Best Average</button>
                            <button onClick={() => setMultiplierTarget('lap')} className={`flex-1 p-2 rounded-lg ${multiplierTarget === 'lap' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Fastest Lap</button>
                        </div>
                        <input type="range" min="2" max="5" value={multiplierFactor} onChange={e => setMultiplierFactor(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FF1801]" />
                    </div>
                    )}
                </div>
                )}
            </div>

            <div className="space-y-4 mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg text-[#FF1801]">Extra Points</h3>
                <div>
                    <label className="block text-slate-400 mb-2">Extra Points for Best Lap ({pointsForBestLap})</label>
                    <input type="range" min="0" max="5" value={pointsForBestLap} onChange={e => setPointsForBestLap(parseInt(e.target.value))} className="w-full accent-[#FF1801]" />
                </div>
                <div>
                    <label className="block text-slate-400 mb-2">Extra Points for Best Average ({pointsForBestAverage})</label>
                    <input type="range" min="0" max="5" value={pointsForBestAverage} onChange={e => setPointsForBestAverage(parseInt(e.target.value))} className="w-full accent-[#FF1801]" />
                </div>
                <div>
                    <label className="block text-slate-400 mb-2">Award Extra Points Per:</label>
                    <div className="flex gap-2">
                        <button onClick={()=>setAwardBestTimeFor('turn')} className={`flex-1 p-2 rounded-lg ${awardBestTimeFor === 'turn' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Turn</button>
                        <button onClick={()=>setAwardBestTimeFor('circuit')} className={`flex-1 p-2 rounded-lg ${awardBestTimeFor === 'circuit' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Circuit</button>
                        <button onClick={()=>setAwardBestTimeFor('both')} className={`flex-1 p-2 rounded-lg ${awardBestTimeFor === 'both' ? 'bg-[#FF1801]' : 'bg-slate-700'}`}>Both</button>
                    </div>
                </div>
            </div>
          </div>
        );
       case 6: // Review
        const { scoringMultiplier } = (scoringMethod === 'both' && useMultiplier) 
            ? { scoringMultiplier: { appliesTo: multiplierTarget, factor: multiplierFactor } } 
            : { scoringMultiplier: null };

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">6. Review & Start</h2>
                <div className="bg-slate-800 p-4 rounded-lg space-y-4 text-slate-300">
                    <div><strong>Starting Player Order:</strong>
                        <ol className="list-decimal list-inside pl-4">
                            {orderedPlayers.map(p => <li key={p.id}>{p.name}</li>)}
                        </ol>
                    </div>
                    <div><strong>Circuit Order:</strong> 
                        <ol className="list-decimal list-inside pl-4">
                            {selectedCircuits.map(c => <li key={c.id}>{c.name}</li>)}
                        </ol>
                    </div>
                    <p><strong>Laps/Turn:</strong> {lapsPerTurn} {lapsPerTurn === 5 ? `(Using best 4 laps: ${useBest4Of5Laps ? 'Yes' : 'No'})` : ''}</p>
                    <p><strong>Turns/Circuit:</strong> {turnsPerCircuit}</p>
                    <p><strong>Scoring Method:</strong> Based on {scoringMethod}{scoringMethod === 'both' && scoringMultiplier ? ` (x${scoringMultiplier.factor} on ${scoringMultiplier.appliesTo})` : scoringMethod === 'both' ? ' (Equal points)' : ''}</p>
                    <p><strong>Extra Points (Best Lap):</strong> {pointsForBestLap}</p>
                    <p><strong>Extra Points (Best Avg):</strong> {pointsForBestAverage}</p>
                    <p><strong>Award Extra Points:</strong> Per {awardBestTimeFor}</p>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  const totalSteps = 6;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-slate-700">
        <div className="mb-6">
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="bg-[#FF1801] h-2.5 rounded-full" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
            </div>
        </div>
        <div className="min-h-[350px]">
         {renderStep()}
        </div>
        <div className="flex justify-between mt-8">
          <button onClick={handleBack} disabled={step === 1} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Back
          </button>
          {step < totalSteps ? (
            <button onClick={handleNext} disabled={(step === 1 || step === 2) && selectedPlayers.length < 2 || step === 3 && selectedCircuits.length < 1} className="bg-[#FF1801] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#E61601] disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">
              Start Game!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSetup;