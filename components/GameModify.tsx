import React, { useState } from 'react';
import { GameState, Player, Circuit } from '../types';
import { PlusIcon, TrashIcon } from './icons';
import { useSWRConfig } from 'swr';
import Modal from './Modal';
import CircuitImage from './CircuitImage';

interface GameModifyProps {
    gameState: GameState;
    players: Player[];
    circuits: Circuit[];
    gameId: string;
    onBack: () => void;
    onCancelGame: () => void;
}

const GameModify: React.FC<GameModifyProps> = ({ gameState, players, circuits, gameId, onBack, onCancelGame }) => {
    const [activeSection, setActiveSection] = useState<'players' | 'circuits' | 'settings' | 'danger'>('players');
    const [pendingChanges, setPendingChanges] = useState<{
        players?: string[];
        circuits?: string[];
        settings?: Partial<GameState['settings']>;
    }>({});
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showCircuitModal, setShowCircuitModal] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    
    const { mutate } = useSWRConfig();

    // Get current values (gameState + pending changes)
    const currentPlayers = pendingChanges.players || gameState.settings.players.map(p => p.id);
    const currentCircuits = pendingChanges.circuits || gameState.settings.circuits.map(c => c.id);
    const currentSettings = { ...gameState.settings, ...pendingChanges.settings };
    
    const availablePlayers = players.filter(p => !currentPlayers.includes(p.id));
    const availableCircuits = circuits.filter(c => !currentCircuits.includes(c.id));
    
    const hasChanges = Object.keys(pendingChanges).length > 0;

    const handleAddPlayer = (playerId: string) => {
        setPendingChanges(prev => ({
            ...prev,
            players: [...currentPlayers, playerId]
        }));
        setShowPlayerModal(false);
    };

    const handleRemovePlayer = (playerId: string) => {
        setPendingChanges(prev => ({
            ...prev,
            players: currentPlayers.filter(id => id !== playerId)
        }));
    };

    const handleAddCircuit = (circuitId: string) => {
        setPendingChanges(prev => ({
            ...prev,
            circuits: [...currentCircuits, circuitId]
        }));
        setShowCircuitModal(false);
    };

    const handleRemoveCircuit = (circuitId: string) => {
        // Only allow removing circuits that haven't been completed
        const originalCircuitIds = gameState.settings.circuits.map(c => c.id);
        const circuitIndex = originalCircuitIds.indexOf(circuitId);
        if (circuitIndex !== -1 && circuitIndex < gameState.currentCircuitIndex) {
            alert('No puedes eliminar circuitos que ya han sido completados.');
            return;
        }
        
        setPendingChanges(prev => ({
            ...prev,
            circuits: currentCircuits.filter(id => id !== circuitId)
        }));
    };

    const handleSettingsChange = (key: keyof GameState['settings'], value: any) => {
        setPendingChanges(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [key]: value
            }
        }));
    };

    const handleApplyChanges = async () => {
        if (!hasChanges) return;

        try {
            const updatedGameState = {
                ...gameState,
                settings: currentSettings
            };

            if (pendingChanges.players) {
                updatedGameState.settings.players = currentPlayers.map(id => players.find(p => p.id === id)!);
            }
            if (pendingChanges.circuits) {
                updatedGameState.settings.circuits = currentCircuits.map(id => circuits.find(c => c.id === id)!);
            }

            const response = await fetch(`/api/game/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: gameId,
                    state: updatedGameState,
                    status: 'ACTIVE'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`Error al actualizar el campeonato: ${error.error || 'Error desconocido'}`);
                return;
            }

            // Refresh data
            mutate('/api/game/active');
            
            setPendingChanges({});
            setShowConfirmation(false);
            setConfirmationText('');
            
            alert('Cambios aplicados exitosamente al campeonato.');

        } catch (error) {
            alert('Error de red al actualizar el campeonato');
        }
    };

    const handleCancelGame = () => {
        if (window.confirm('¿Estás seguro de que quieres CANCELAR TODO el campeonato? Todo el progreso se perderá permanentemente.')) {
            if (window.confirm('Esta acción NO se puede deshacer. ¿Confirmas que quieres cancelar el campeonato completo?')) {
                onCancelGame();
            }
        }
    };

    const resetChanges = () => {
        setPendingChanges({});
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-2xl mx-auto p-4">
                {/* Back button */}
                <div className="mb-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-700 text-zinc-100 font-bold rounded hover:bg-zinc-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver
                    </button>
                </div>

                {/* Changes notification */}
                {hasChanges && (
                    <div className="bg-amber-900/20 border border-amber-700 rounded-md p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-amber-300 font-semibold">Tienes cambios pendientes</p>
                                <p className="text-amber-200 text-sm">Los cambios no se aplicarán hasta que los apruebes</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={resetChanges}
                                    className="px-3 py-1 text-sm bg-zinc-700 text-zinc-100 rounded hover:bg-zinc-600"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={() => setShowConfirmation(true)}
                                    className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                                >
                                    Aprobar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Section Navigation */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-md mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4">
                        <button
                            onClick={() => setActiveSection('players')}
                            className={`p-4 text-sm font-semibold transition-colors ${
                                activeSection === 'players' 
                                    ? 'bg-f1-red text-white' 
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                            }`}
                        >
                            Jugadores
                        </button>
                        <button
                            onClick={() => setActiveSection('circuits')}
                            className={`p-4 text-sm font-semibold transition-colors ${
                                activeSection === 'circuits' 
                                    ? 'bg-f1-red text-white' 
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                            }`}
                        >
                            Circuitos
                        </button>
                        <button
                            onClick={() => setActiveSection('settings')}
                            className={`p-4 text-sm font-semibold transition-colors ${
                                activeSection === 'settings' 
                                    ? 'bg-f1-red text-white' 
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                            }`}
                        >
                            Configuración
                        </button>
                        <button
                            onClick={() => setActiveSection('danger')}
                            className={`p-4 text-sm font-semibold transition-colors ${
                                activeSection === 'danger' 
                                    ? 'bg-red-600 text-white' 
                                    : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                            }`}
                        >
                            Peligro
                        </button>
                    </div>
                </div>

                {/* Section Content */}
                <div className="space-y-6">
                    {activeSection === 'players' && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-zinc-100">Jugadores del Campeonato</h3>
                                <button
                                    onClick={() => setShowPlayerModal(true)}
                                    disabled={availablePlayers.length === 0}
                                    className="bg-f1-red text-white p-2 rounded hover:bg-red-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-4 h-4"/>
                                </button>
                            </div>
                            <div className="divide-y divide-zinc-800">
                                {currentPlayers.map(playerId => {
                                    const player = players.find(p => p.id === playerId);
                                    if (!player) return null;
                                    const isChanged = pendingChanges.players && !gameState.settings.players.map(p => p.id).includes(playerId);
                                    return (
                                        <div key={player.id} className={`p-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors ${isChanged ? 'bg-green-900/20' : ''}`}>
                                            <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full"/>
                                            <div className="flex-grow">
                                                <span className="text-zinc-100 font-semibold">{player.name}</span>
                                                {isChanged && <span className="text-green-400 text-xs ml-2">+ Agregado</span>}
                                            </div>
                                            <button
                                                onClick={() => handleRemovePlayer(playerId)}
                                                className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                                                title="Quitar jugador"
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {currentPlayers.length === 0 && (
                                <div className="p-6 text-center text-zinc-400">
                                    No hay jugadores en el campeonato
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'circuits' && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-zinc-100">Circuitos del Campeonato</h3>
                                <button
                                    onClick={() => setShowCircuitModal(true)}
                                    disabled={availableCircuits.length === 0}
                                    className="bg-f1-red text-white p-2 rounded hover:bg-red-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-4 h-4"/>
                                </button>
                            </div>
                            <div className="divide-y divide-zinc-800">
                                {currentCircuits.map((circuitId, index) => {
                                    const circuit = circuits.find(c => c.id === circuitId);
                                    const isCompleted = index < gameState.currentCircuitIndex;
                                    const isChanged = pendingChanges.circuits && !gameState.settings.circuits.map(c => c.id).includes(circuitId);
                                    if (!circuit) return null;
                                    return (
                                        <div key={circuit.id} className={`p-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors ${
                                            isCompleted ? 'bg-green-900/20' : ''
                                        } ${isChanged ? 'bg-blue-900/20' : ''}`}>
                                            <CircuitImage 
                                                src={circuit.imageUrl} 
                                                alt={circuit.name} 
                                                className="w-12 h-8 object-cover rounded"
                                            />
                                            <div className="flex-grow">
                                                <span className="text-zinc-100 font-semibold">{circuit.name}</span>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-zinc-400 text-xs">#{index + 1}</span>
                                                    {isCompleted && <span className="text-green-400 text-xs">✓ Completado</span>}
                                                    {isChanged && <span className="text-blue-400 text-xs">+ Agregado</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveCircuit(circuitId)}
                                                disabled={isCompleted}
                                                className="p-2 text-zinc-400 hover:text-red-400 transition-colors disabled:text-zinc-600 disabled:cursor-not-allowed"
                                                title={isCompleted ? "No puedes eliminar circuitos completados" : "Quitar circuito"}
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {currentCircuits.length === 0 && (
                                <div className="p-6 text-center text-zinc-400">
                                    No hay circuitos en el campeonato
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'settings' && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6">
                            <h3 className="text-lg font-bold text-zinc-100 mb-6">Configuración del Campeonato</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-zinc-400 text-sm mb-2">Turnos por Circuito</label>
                                    <select
                                        value={currentSettings.turnsPerCircuit}
                                        onChange={(e) => handleSettingsChange('turnsPerCircuit', parseInt(e.target.value))}
                                        className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                                    >
                                        <option value={1}>1 turno</option>
                                        <option value={2}>2 turnos</option>
                                        <option value={3}>3 turnos</option>
                                        <option value={4}>4 turnos</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-zinc-400 text-sm mb-2">Vueltas por Turno</label>
                                    <select
                                        value={currentSettings.lapsPerTurn}
                                        onChange={(e) => handleSettingsChange('lapsPerTurn', parseInt(e.target.value))}
                                        className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                                    >
                                        <option value={3}>3 vueltas</option>
                                        <option value={5}>5 vueltas</option>
                                        <option value={10}>10 vueltas</option>
                                    </select>
                                </div>
                                <div className="pt-4 border-t border-zinc-700">
                                    <p className="text-zinc-400 text-sm">
                                        ⚠️ Cambiar la configuración puede afectar los resultados del campeonato en curso.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'danger' && (
                        <div className="bg-red-900/20 border border-red-700 rounded-md p-6">
                            <h3 className="text-lg font-bold text-red-400 mb-4">Zona Peligrosa</h3>
                            <p className="text-zinc-300 mb-6">
                                Estas acciones son irreversibles y afectarán permanentemente el campeonato.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="bg-red-900/30 border border-red-600 rounded p-4">
                                    <h4 className="text-red-300 font-semibold mb-2">Cancelar Todo el Campeonato</h4>
                                    <p className="text-zinc-400 text-sm mb-4">
                                        Esta acción eliminará completamente el campeonato actual. Todo el progreso, tiempos y estadísticas se perderán permanentemente.
                                    </p>
                                    <button
                                        onClick={handleCancelGame}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition-colors"
                                    >
                                        CANCELAR TODO EL CAMPEONATO
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Player Selection Modal */}
            {showPlayerModal && (
                <Modal
                    isOpen={showPlayerModal}
                    onClose={() => setShowPlayerModal(false)}
                    maxWidth="md"
                >
                    <div className="bg-zinc-900 rounded-md">
                        <div className="px-6 py-4 border-b border-zinc-700">
                            <h2 className="text-xl font-bold text-zinc-100">Agregar Jugador</h2>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <div className="space-y-2">
                                {availablePlayers.map(player => (
                                    <button
                                        key={player.id}
                                        onClick={() => handleAddPlayer(player.id)}
                                        className="w-full p-3 flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                                    >
                                        <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full"/>
                                        <span className="text-zinc-100 font-semibold">{player.name}</span>
                                    </button>
                                ))}
                            </div>
                            {availablePlayers.length === 0 && (
                                <p className="text-center text-zinc-400 py-6">
                                    No hay jugadores disponibles para agregar
                                </p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Circuit Selection Modal */}
            {showCircuitModal && (
                <Modal
                    isOpen={showCircuitModal}
                    onClose={() => setShowCircuitModal(false)}
                    maxWidth="md"
                >
                    <div className="bg-zinc-900 rounded-md">
                        <div className="px-6 py-4 border-b border-zinc-700">
                            <h2 className="text-xl font-bold text-zinc-100">Agregar Circuito</h2>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <div className="space-y-2">
                                {availableCircuits.map(circuit => (
                                    <button
                                        key={circuit.id}
                                        onClick={() => handleAddCircuit(circuit.id)}
                                        className="w-full p-3 flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                                    >
                                        <CircuitImage 
                                            src={circuit.imageUrl} 
                                            alt={circuit.name} 
                                            className="w-16 h-10 object-cover rounded"
                                        />
                                        <span className="text-zinc-100 font-semibold">{circuit.name}</span>
                                    </button>
                                ))}
                            </div>
                            {availableCircuits.length === 0 && (
                                <p className="text-center text-zinc-400 py-6">
                                    No hay circuitos disponibles para agregar
                                </p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && (
                <Modal
                    isOpen={showConfirmation}
                    onClose={() => {
                        setShowConfirmation(false);
                        setConfirmationText('');
                    }}
                    maxWidth="lg"
                >
                    <div className="bg-zinc-900 rounded-md">
                        <div className="px-6 py-4 border-b border-zinc-700">
                            <h2 className="text-xl font-bold text-zinc-100">Confirmar Cambios al Campeonato</h2>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Changes Summary */}
                            <div className="bg-zinc-800 rounded-md p-4 space-y-4">
                                <h3 className="text-lg font-bold text-zinc-100 mb-4">Resumen de Cambios:</h3>
                                
                                {/* Player Changes */}
                                {pendingChanges.players && (
                                    <div>
                                        <h4 className="text-zinc-400 font-mono text-sm uppercase mb-2">JUGADORES</h4>
                                        <div className="space-y-1">
                                            {/* Added players */}
                                            {currentPlayers.filter(id => !gameState.settings.players.map(p => p.id).includes(id)).map(playerId => {
                                                const player = players.find(p => p.id === playerId);
                                                return player && (
                                                    <div key={playerId} className="flex items-center gap-2 text-green-400">
                                                        <span className="text-lg">+</span>
                                                        <span className="font-semibold">{player.name}</span>
                                                    </div>
                                                );
                                            })}
                                            {/* Removed players */}
                                            {gameState.settings.players.map(p => p.id).filter(id => !currentPlayers.includes(id)).map(playerId => {
                                                const player = players.find(p => p.id === playerId);
                                                return player && (
                                                    <div key={playerId} className="flex items-center gap-2 text-red-400">
                                                        <span className="text-lg">−</span>
                                                        <span className="font-semibold">{player.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Circuit Changes */}
                                {pendingChanges.circuits && (
                                    <div>
                                        <h4 className="text-zinc-400 font-mono text-sm uppercase mb-2">CIRCUITOS</h4>
                                        <div className="space-y-1">
                                            {/* Added circuits */}
                                            {currentCircuits.filter(id => !gameState.settings.circuits.map(c => c.id).includes(id)).map(circuitId => {
                                                const circuit = circuits.find(c => c.id === circuitId);
                                                return circuit && (
                                                    <div key={circuitId} className="flex items-center gap-2 text-green-400">
                                                        <span className="text-lg">+</span>
                                                        <span className="font-semibold">{circuit.name}</span>
                                                    </div>
                                                );
                                            })}
                                            {/* Removed circuits */}
                                            {gameState.settings.circuits.map(c => c.id).filter(id => !currentCircuits.includes(id)).map(circuitId => {
                                                const circuit = circuits.find(c => c.id === circuitId);
                                                return circuit && (
                                                    <div key={circuitId} className="flex items-center gap-2 text-red-400">
                                                        <span className="text-lg">−</span>
                                                        <span className="font-semibold">{circuit.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Settings Changes */}
                                {pendingChanges.settings && (
                                    <div>
                                        <h4 className="text-zinc-400 font-mono text-sm uppercase mb-2">CONFIGURACIÓN</h4>
                                        <div className="space-y-1">
                                            {pendingChanges.settings.turnsPerCircuit && pendingChanges.settings.turnsPerCircuit !== gameState.settings.turnsPerCircuit && (
                                                <div className="text-amber-400">
                                                    <span className="text-zinc-400">Turnos por circuito:</span> {gameState.settings.turnsPerCircuit} → {pendingChanges.settings.turnsPerCircuit}
                                                </div>
                                            )}
                                            {pendingChanges.settings.lapsPerTurn && pendingChanges.settings.lapsPerTurn !== gameState.settings.lapsPerTurn && (
                                                <div className="text-amber-400">
                                                    <span className="text-zinc-400">Vueltas por turno:</span> {gameState.settings.lapsPerTurn} → {pendingChanges.settings.lapsPerTurn}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Confirmation Input */}
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-sm">
                                    Para confirmar los cambios, escribe <span className="font-mono font-bold text-zinc-100">MODIFICAR</span> en el campo:
                                </label>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder="Escribe MODIFICAR para confirmar"
                                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 font-mono"
                                    autoFocus
                                />
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmation(false);
                                        setConfirmationText('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-zinc-700 text-zinc-100 font-bold rounded hover:bg-zinc-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleApplyChanges}
                                    disabled={confirmationText !== 'MODIFICAR'}
                                    className="flex-1 px-4 py-3 bg-f1-red text-white font-bold rounded hover:bg-red-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
                                >
                                    Aplicar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GameModify;