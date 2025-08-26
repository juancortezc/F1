import React, { useState, useEffect } from 'react';
import { Player, Circuit, UserSession } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { useSWRConfig } from 'swr';
import Modal from './Modal';
import CircuitImage from './CircuitImage';
import LoadingSpinner from './LoadingSpinner';

interface AdminViewProps {
    players: Player[];
    circuits: Circuit[];
    onBack?: () => void;
    currentUser?: UserSession | null;
}

type EditingItem = Player | Circuit | 'new-player' | 'new-circuit' | null;
type TabType = 'players' | 'circuits';

interface AdminLock {
    userId: string;
    userName: string;
    lockedAt: Date;
    expiresAt: Date;
}

const AdminView: React.FC<AdminViewProps> = ({ players, circuits, onBack, currentUser }) => {
    const [editingItem, setEditingItem] = useState<EditingItem>(null);
    const [activeTab, setActiveTab] = useState<TabType>('players');
    const [isLocked, setIsLocked] = useState(false);
    const [lockInfo, setLockInfo] = useState<AdminLock | null>(null);
    const [isCheckingLock, setIsCheckingLock] = useState(true);
    const { mutate } = useSWRConfig();

    // Check and acquire admin lock
    useEffect(() => {
        const checkAndAcquireLock = async () => {
            if (!currentUser) return;

            try {
                // Check current lock status
                const checkResponse = await fetch('/api/admin/lock');
                const checkData = await checkResponse.json();

                if (checkData.locked && checkData.lock.userId !== currentUser.userId) {
                    setIsLocked(true);
                    setLockInfo(checkData.lock);
                    setIsCheckingLock(false);
                    return;
                }

                // Try to acquire lock
                const lockResponse = await fetch('/api/admin/lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.userId,
                        userName: currentUser.name
                    })
                });

                if (lockResponse.ok) {
                    setIsLocked(false);
                    setIsCheckingLock(false);
                    
                    // Refresh lock every 4 minutes (before 5 minute expiry)
                    const refreshInterval = setInterval(async () => {
                        await fetch('/api/admin/lock', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: currentUser.userId,
                                userName: currentUser.name
                            })
                        });
                    }, 4 * 60 * 1000);

                    // Cleanup on unmount
                    return () => {
                        clearInterval(refreshInterval);
                        // Release lock
                        fetch('/api/admin/lock', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.userId })
                        });
                    };
                } else {
                    const errorData = await lockResponse.json();
                    setIsLocked(true);
                    setLockInfo(errorData);
                    setIsCheckingLock(false);
                }
            } catch (error) {
                console.error('Error checking admin lock:', error);
                setIsCheckingLock(false);
            }
        };

        checkAndAcquireLock();
    }, [currentUser]);

    // Release lock on window/tab close
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentUser && !isLocked) {
                // Using sendBeacon for reliable cleanup
                const data = new Blob([JSON.stringify({ userId: currentUser.userId })], { type: 'application/json' });
                navigator.sendBeacon('/api/admin/lock', data);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentUser, isLocked]);

    const handleDeletePlayer = async (id: string) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este jugador?')) {
            try {
                const response = await fetch(`/api/players/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const error = await response.json();
                    alert(`Error al eliminar jugador: ${error.error || 'Error desconocido'}`);
                    return;
                }
                mutate('/api/players');
                alert('Jugador eliminado exitosamente');
            } catch (error) {
                alert('Error de red al eliminar jugador');
            }
        }
    }

    const handleDeleteCircuit = async (id: string) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este circuito?')) {
            try {
                const response = await fetch(`/api/circuits/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const error = await response.json();
                    alert(`Error al eliminar circuito: ${error.error || 'Error desconocido'}`);
                    return;
                }
                mutate('/api/circuits');
                alert('Circuito eliminado exitosamente');
            } catch (error) {
                alert('Error de red al eliminar circuito');
            }
        }
    }

    const handleSavePlayer = async (playerData: Partial<Player>) => {
        const isNew = editingItem === 'new-player';
        const url = isNew ? '/api/players' : `/api/players/${(editingItem as Player).id}`;
        const method = isNew ? 'POST' : 'PUT';

        try {
            const response = await fetch(url, { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(playerData) 
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`Error al guardar jugador: ${error.error || 'Error desconocido'}`);
                return;
            }

            mutate('/api/players');
            setEditingItem(null);
            alert(`Jugador ${isNew ? 'creado' : 'actualizado'} exitosamente`);
        } catch (error) {
            alert('Error de red al guardar jugador');
        }
    }

    const handleSaveCircuit = async (circuitData: Partial<Circuit>) => {
        const isNew = editingItem === 'new-circuit';
        const url = isNew ? '/api/circuits' : `/api/circuits/${(editingItem as Circuit).id}`;
        const method = isNew ? 'POST' : 'PUT';

        try {
            const response = await fetch(url, { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(circuitData) 
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`Error al guardar circuito: ${error.error || 'Error desconocido'}`);
                return;
            }

            mutate('/api/circuits');
            setEditingItem(null);
            alert(`Circuito ${isNew ? 'creado' : 'actualizado'} exitosamente`);
        } catch (error) {
            alert('Error de red al guardar circuito');
        }
    }

    // Show loading state
    if (isCheckingLock) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-zinc-400">Verificando acceso...</span>
            </div>
        );
    }

    // Show locked state
    if (isLocked && lockInfo) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 max-w-md text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100 mb-2">Panel de Administración Bloqueado</h2>
                    <p className="text-zinc-400 mb-4">
                        <span className="font-semibold">{lockInfo.userName}</span> está usando el panel de administración.
                    </p>
                    <p className="text-zinc-500 text-sm">
                        Por favor, espera a que termine o intenta más tarde.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex border-b border-zinc-700">
                <button
                    onClick={() => setActiveTab('players')}
                    className={`flex-1 py-3 px-4 font-semibold text-center transition-colors ${
                        activeTab === 'players'
                            ? 'text-f1-red border-b-2 border-f1-red'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Jugadores
                </button>
                <button
                    onClick={() => setActiveTab('circuits')}
                    className={`flex-1 py-3 px-4 font-semibold text-center transition-colors ${
                        activeTab === 'circuits'
                            ? 'text-f1-red border-b-2 border-f1-red'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    Circuitos
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'players' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                    <div className="px-3 py-2 border-b border-zinc-700 flex justify-between items-center bg-zinc-800">
                        <h2 className="text-lg font-bold text-zinc-100">Jugadores ({players.length})</h2>
                        <button 
                            onClick={() => setEditingItem('new-player')} 
                            className="bg-f1-red text-white p-2 rounded hover:bg-red-700 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4"/>
                        </button>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {players.map(player => (
                            <div key={player.id} className="px-3 py-2 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                                <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full"/>
                                <div className="flex-grow">
                                    <div className="text-zinc-100 font-semibold">{player.name}</div>
                                    <div className="text-zinc-400 text-xs font-mono">PIN: ****</div>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setEditingItem(player)} 
                                        className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                                    >
                                        <PencilIcon className="w-4 h-4"/>
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePlayer(player.id)} 
                                        className="p-2 text-zinc-400 hover:text-f1-red transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'circuits' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                    <div className="px-3 py-2 border-b border-zinc-700 flex justify-between items-center bg-zinc-800">
                        <h2 className="text-lg font-bold text-zinc-100">Circuitos ({circuits.length})</h2>
                        <button 
                            onClick={() => setEditingItem('new-circuit')} 
                            className="bg-f1-red text-white p-2 rounded hover:bg-red-700 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4"/>
                        </button>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {circuits.map(circuit => (
                            <div key={circuit.id} className="px-3 py-2 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                                <CircuitImage 
                                    src={circuit.imageUrl} 
                                    alt={circuit.name} 
                                    className="w-12 h-8 object-cover rounded"
                                />
                                <div className="flex-grow text-zinc-100 font-semibold">{circuit.name}</div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setEditingItem(circuit)} 
                                        className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                                    >
                                        <PencilIcon className="w-4 h-4"/>
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteCircuit(circuit.id)} 
                                        className="p-2 text-zinc-400 hover:text-f1-red transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingItem && (
                <Modal isOpen={true} onClose={() => setEditingItem(null)} title={
                    editingItem === 'new-player' ? 'Nuevo Jugador' :
                    editingItem === 'new-circuit' ? 'Nuevo Circuito' :
                    'name' in editingItem ? `Editar ${editingItem.name}` : 'Editar'
                }>
                    <EditForm 
                        item={editingItem} 
                        onSave={(data) => {
                            if (editingItem === 'new-player' || (editingItem && typeof editingItem === 'object' && 'pin' in editingItem)) {
                                handleSavePlayer(data as Partial<Player>);
                            } else {
                                handleSaveCircuit(data as Partial<Circuit>);
                            }
                        }}
                        onCancel={() => setEditingItem(null)}
                    />
                </Modal>
            )}
        </div>
    );
}

// Edit Form Component
const EditForm: React.FC<{
    item: EditingItem;
    onSave: (data: Partial<Player> | Partial<Circuit>) => void;
    onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
    const isPlayer = item === 'new-player' || (item && typeof item === 'object' && 'pin' in item);
    const [formData, setFormData] = useState<Partial<Player> | Partial<Circuit>>(() => {
        if (item === 'new-player') {
            return { name: '', imageUrl: '', pin: '0000' };
        } else if (item === 'new-circuit') {
            return { name: '', imageUrl: '' };
        } else {
            return { ...item };
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input 
                type="text" 
                name="name" 
                value={formData.name || ''} 
                onChange={handleChange} 
                placeholder="Nombre" 
                required 
                className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg touch-target"
            />
            
            {isPlayer && (
                <>
                    <input 
                        type="text" 
                        name="pin" 
                        value={(formData as Player).pin || ''} 
                        onChange={handleChange} 
                        placeholder="PIN (4 dígitos)" 
                        pattern="\d{4}" 
                        maxLength={4}
                        required 
                        className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg touch-target"
                    />
                    <input 
                        type="url" 
                        name="imageUrl" 
                        value={(formData as Player).imageUrl || ''} 
                        onChange={handleChange} 
                        placeholder="URL de imagen" 
                        required 
                        className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg touch-target"
                    />
                </>
            )}
            
            {!isPlayer && (
                <input 
                    type="url" 
                    name="imageUrl" 
                    value={(formData as Circuit).imageUrl || ''} 
                    onChange={handleChange} 
                    placeholder="URL de imagen" 
                    required 
                    className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg touch-target"
                />
            )}
            
            <div className="flex gap-4 pt-4">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="flex-1 bg-zinc-700 text-zinc-100 font-bold py-4 rounded-md hover:bg-zinc-600 touch-target text-lg"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    className="flex-1 bg-f1-red text-white font-bold py-4 rounded-md hover:bg-red-700 touch-target text-lg"
                >
                    Guardar
                </button>
            </div>
        </form>
    );
}

export default AdminView;