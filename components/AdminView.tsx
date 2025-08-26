import React, { useState, useEffect } from 'react';
import { Player, Circuit, UserSession } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, UserGroupIcon } from './icons';
import { useSWRConfig } from 'swr';
import Modal from './Modal';
import CircuitImage from './CircuitImage';
import LoadingSpinner from './LoadingSpinner';

// Arrow Left Icon for navigation
const ArrowLeftIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3639L11.7782 19.7781L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z"/>
    </svg>
);

// Road Circuit Icon for circuits tab  
const CircuitIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 4C7.59 4 4 7.59 4 12C4 16.41 7.59 20 12 20C16.41 20 20 16.41 20 12C20 7.59 16.41 4 12 4ZM12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6Z"/>
    </svg>
);

// Guest User Icon
const GuestIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2ZM21 9V7H15C14.4477 7 14 7.44772 14 8V10C14 10.5523 14.4477 11 15 11H16V19H8V11H9C9.55228 11 10 10.5523 10 10V8C10 7.44772 9.55228 7 9 7H3V9H8V19H6V21H18V19H16V9H21Z"/>
    </svg>
);

interface AdminViewProps {
    players: Player[];
    circuits: Circuit[];
    onBack?: () => void;
    currentUser?: UserSession | null;
}

type EditingItem = Player | Circuit | 'new-player' | 'new-circuit' | 'new-guest' | null;
type TabType = 'players' | 'circuits' | 'guests';

interface AdminLock {
    userId: string;
    userName: string;
    lockedAt: Date;
    expiresAt: Date;
}

const AdminView: React.FC<AdminViewProps> = ({ players, circuits, onBack, currentUser }) => {
    const [editingItem, setEditingItem] = useState<EditingItem>(null);
    const [activeTab, setActiveTab] = useState<TabType>('players');
    
    // Separate regular players and guests
    const regularPlayers = players.filter(p => !p.isGuest);
    const guestPlayers = players.filter(p => p.isGuest);
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
        const isNew = editingItem === 'new-player' || editingItem === 'new-guest';
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
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <LoadingSpinner size="lg" className="mx-auto mb-4" />
                        <div className="text-zinc-100 font-semibold text-lg mb-2">
                            Verificando Acceso al Sistema
                        </div>
                        <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                            Panel de Administración • F1 Night
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                            <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                            <span>Validando permisos de administrador</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                            <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                            <span>Verificando bloqueos activos</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show locked state
    if (isLocked && lockInfo) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-red-800 rounded-md p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-900/30 border-2 border-red-700 flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-zinc-100 mb-2 font-mono uppercase tracking-wide">
                            Sistema Bloqueado
                        </h2>
                        <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-4">
                            Panel de Administración • F1 Night
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-900/20 border border-red-800 rounded-md">
                            <p className="text-zinc-300 text-sm mb-2">
                                <span className="font-bold text-red-400">{lockInfo.userName}</span> está administrando el sistema
                            </p>
                            <p className="text-zinc-500 text-xs font-mono">
                                Sesión iniciada: {new Date(lockInfo.lockedAt).toLocaleTimeString()}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                                <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                                <span>Solo un administrador puede usar el panel</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
                                <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                                <span>Por favor espera o intenta más tarde</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* F1 Luxury Navigation Header */}
            <div className="bg-zinc-900 border-b-2 border-f1-red sticky top-0 z-20 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button 
                                    onClick={onBack}
                                    className="flex items-center justify-center w-12 h-12 rounded-md bg-f1-red border border-red-700 text-white hover:bg-red-700 transition-colors duration-200 shadow-md"
                                    title="Volver al menú principal"
                                >
                                    <ArrowLeftIcon className="w-6 h-6" />
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-wide">PANEL DE ADMINISTRACIÓN</h1>
                                <p className="text-sm font-mono text-zinc-300 uppercase tracking-widest">
                                    Sistema de Gestión • F1 Night
                                </p>
                            </div>
                        </div>
                        {currentUser && (
                            <div className="text-right">
                                <div className="text-lg font-bold text-white">{currentUser.name}</div>
                                <div className="text-sm font-mono text-zinc-300 uppercase tracking-wide">Administrador</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 space-y-6">
                {/* Luxury Tab Navigation - Mobile First */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex-1 min-w-[120px] px-4 py-4 flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wide transition-all duration-200 ${
                                activeTab === 'players'
                                    ? 'bg-f1-red text-white shadow-lg'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                            }`}
                        >
                            <UserGroupIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Jugadores</span>
                            <span className="sm:hidden">({regularPlayers.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('guests')}
                            className={`flex-1 min-w-[120px] px-4 py-4 flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wide transition-all duration-200 ${
                                activeTab === 'guests'
                                    ? 'bg-amber-600 text-white shadow-lg'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                            }`}
                        >
                            <GuestIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Invitados</span>
                            <span className="sm:hidden">({guestPlayers.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('circuits')}
                            className={`flex-1 min-w-[120px] px-4 py-4 flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wide transition-all duration-200 ${
                                activeTab === 'circuits'
                                    ? 'bg-f1-red text-white shadow-lg'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                            }`}
                        >
                            <CircuitIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Circuitos</span>
                            <span className="sm:hidden">({circuits.length})</span>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'players' && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                        {/* Luxury Table Header */}
                        <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
                                        JUGADORES HABITUALES
                                    </h2>
                                    <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                                        {regularPlayers.length} Registrados • Acceso con PIN
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setEditingItem('new-player')} 
                                    className="flex items-center gap-2 px-4 py-2 bg-f1-red text-white font-bold text-sm uppercase tracking-wide rounded hover:bg-red-700 transition-colors duration-200 min-h-[48px]"
                                >
                                    <PlusIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">NUEVO</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800 border-b border-zinc-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Avatar</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Jugador</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">PIN</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Estado</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {regularPlayers.map(player => (
                                        <tr key={player.id} className="hover:bg-zinc-800/30 transition-colors duration-200">
                                            <td className="px-4 py-3">
                                                <img 
                                                    src={player.imageUrl} 
                                                    alt={player.name} 
                                                    className="w-12 h-12 rounded-full border-2 border-zinc-700"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-zinc-100 text-lg">{player.name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-3 py-1 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm text-zinc-300">
                                                    ••••
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                                    player.isActive 
                                                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                                                        : 'bg-red-900/30 text-red-400 border border-red-800'
                                                }`}>
                                                    {player.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => setEditingItem(player)} 
                                                        className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors duration-200"
                                                        title="Editar jugador"
                                                    >
                                                        <PencilIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeletePlayer(player.id)} 
                                                        className="p-2 text-zinc-400 hover:text-f1-red hover:bg-red-900/20 rounded transition-colors duration-200"
                                                        title="Eliminar jugador"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-zinc-800">
                            {regularPlayers.map(player => (
                                <div key={player.id} className="p-4 hover:bg-zinc-800/30 transition-colors duration-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <img 
                                            src={player.imageUrl} 
                                            alt={player.name} 
                                            className="w-14 h-14 rounded-full border-2 border-zinc-700"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-zinc-100 text-lg">{player.name}</div>
                                            <div className="text-zinc-400 text-sm font-mono">PIN: ••••</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                            player.isActive 
                                                ? 'bg-green-900/30 text-green-400 border border-green-800'
                                                : 'bg-red-900/30 text-red-400 border border-red-800'
                                        }`}>
                                            {player.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                                        <button 
                                            onClick={() => setEditingItem(player)} 
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:bg-zinc-700 transition-colors duration-200 min-h-[48px]"
                                        >
                                            <PencilIcon className="w-4 h-4"/>
                                            <span className="font-semibold text-sm">Editar</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePlayer(player.id)} 
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:bg-red-900/50 hover:text-f1-red hover:border-f1-red transition-colors duration-200 min-h-[48px]"
                                        >
                                            <TrashIcon className="w-4 h-4"/>
                                            <span className="font-semibold text-sm">Eliminar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {regularPlayers.length === 0 && (
                            <div className="p-8 text-center">
                                <div className="text-zinc-500 mb-4">
                                    <UserGroupIcon className="w-16 h-16 mx-auto opacity-50" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-400 mb-2">No hay jugadores registrados</h3>
                                <p className="text-zinc-500 text-sm">Crear el primer jugador para empezar</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'guests' && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                        {/* Luxury Table Header */}
                        <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-amber-400 font-mono uppercase tracking-wide">
                                        JUGADORES INVITADOS
                                    </h2>
                                    <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                                        {guestPlayers.length} Temporales • Acceso directo sin PIN
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setEditingItem('new-guest')} 
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold text-sm uppercase tracking-wide rounded hover:bg-amber-700 transition-colors duration-200 min-h-[48px]"
                                >
                                    <PlusIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">NUEVO</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800 border-b border-zinc-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Avatar</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Invitado</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Tipo</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Acceso</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {guestPlayers.map(player => (
                                        <tr key={player.id} className="hover:bg-zinc-800/30 transition-colors duration-200">
                                            <td className="px-4 py-3">
                                                <div className="w-12 h-12 rounded-full bg-zinc-700 border-2 border-amber-600/50 flex items-center justify-center">
                                                    <GuestIcon className="w-6 h-6 text-amber-400" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-zinc-100 text-lg">{player.name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-2 py-1 bg-amber-900/30 text-amber-400 border border-amber-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                                    Invitado
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-3 py-1 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm text-zinc-300">
                                                    Sin PIN
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => setEditingItem(player)} 
                                                        className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors duration-200"
                                                        title="Editar invitado"
                                                    >
                                                        <PencilIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeletePlayer(player.id)} 
                                                        className="p-2 text-zinc-400 hover:text-f1-red hover:bg-red-900/20 rounded transition-colors duration-200"
                                                        title="Eliminar invitado"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-zinc-800">
                            {guestPlayers.map(player => (
                                <div key={player.id} className="p-4 hover:bg-zinc-800/30 transition-colors duration-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-14 h-14 rounded-full bg-zinc-700 border-2 border-amber-600/50 flex items-center justify-center">
                                            <GuestIcon className="w-7 h-7 text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-zinc-100 text-lg">{player.name}</div>
                                            <div className="text-zinc-400 text-sm font-mono">Sin PIN • Acceso directo</div>
                                        </div>
                                        <span className="px-2 py-1 bg-amber-900/30 text-amber-400 border border-amber-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                            Invitado
                                        </span>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                                        <button 
                                            onClick={() => setEditingItem(player)} 
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:bg-zinc-700 transition-colors duration-200 min-h-[48px]"
                                        >
                                            <PencilIcon className="w-4 h-4"/>
                                            <span className="font-semibold text-sm">Editar</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePlayer(player.id)} 
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:bg-red-900/50 hover:text-f1-red hover:border-f1-red transition-colors duration-200 min-h-[48px]"
                                        >
                                            <TrashIcon className="w-4 h-4"/>
                                            <span className="font-semibold text-sm">Eliminar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {guestPlayers.length === 0 && (
                            <div className="p-8 text-center">
                                <div className="text-zinc-500 mb-4">
                                    <GuestIcon className="w-16 h-16 mx-auto opacity-50" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-400 mb-2">No hay invitados registrados</h3>
                                <p className="text-zinc-500 text-sm">Los invitados pueden participar temporalmente sin PIN</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'circuits' && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                        {/* Luxury Table Header */}
                        <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
                                        CIRCUITOS F1
                                    </h2>
                                    <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                                        {circuits.length} Pistas • Layouts oficiales
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setEditingItem('new-circuit')} 
                                    className="flex items-center gap-2 px-4 py-2 bg-f1-red text-white font-bold text-sm uppercase tracking-wide rounded hover:bg-red-700 transition-colors duration-200 min-h-[48px]"
                                >
                                    <PlusIcon className="w-4 h-4"/>
                                    <span className="hidden sm:inline">NUEVO</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800 border-b border-zinc-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Layout</th>
                                        <th className="px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Circuito</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Récord Vuelta</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Récord Promedio</th>
                                        <th className="px-4 py-3 text-center text-xs font-mono font-bold uppercase tracking-wide text-zinc-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {circuits.map(circuit => (
                                        <tr key={circuit.id} className="hover:bg-zinc-800/30 transition-colors duration-200">
                                            <td className="px-4 py-3">
                                                <CircuitImage 
                                                    src={circuit.imageUrl} 
                                                    alt={circuit.name} 
                                                    className="w-16 h-12 object-cover rounded border border-zinc-700"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-zinc-100 text-lg">{circuit.name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-3 py-1 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm text-zinc-300">
                                                    {circuit.historicalBestLap ? `${Math.floor(circuit.historicalBestLap / 1000 / 60)}:${String(Math.floor((circuit.historicalBestLap / 1000) % 60)).padStart(2, '0')}.${String(circuit.historicalBestLap % 1000).padStart(3, '0')}` : 'Sin récord'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-3 py-1 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm text-zinc-300">
                                                    {circuit.historicalBestAverage ? `${Math.floor(circuit.historicalBestAverage / 1000 / 60)}:${String(Math.floor((circuit.historicalBestAverage / 1000) % 60)).padStart(2, '0')}.${String(circuit.historicalBestAverage % 1000).padStart(3, '0')}` : 'Sin récord'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => setEditingItem(circuit)} 
                                                        className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors duration-200"
                                                        title="Editar circuito"
                                                    >
                                                        <PencilIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCircuit(circuit.id)} 
                                                        className="p-2 text-zinc-400 hover:text-f1-red hover:bg-red-900/20 rounded transition-colors duration-200"
                                                        title="Eliminar circuito"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-zinc-800">
                            {circuits.map(circuit => (
                                <div key={circuit.id} className="p-4 hover:bg-zinc-800/30 transition-colors duration-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <CircuitImage 
                                            src={circuit.imageUrl} 
                                            alt={circuit.name} 
                                            className="w-20 h-14 object-cover rounded border-2 border-zinc-700"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-zinc-100 text-lg mb-1">{circuit.name}</div>
                                            <div className="text-zinc-400 text-sm font-mono">
                                                {circuit.historicalBestLap ? `Récord: ${Math.floor(circuit.historicalBestLap / 1000 / 60)}:${String(Math.floor((circuit.historicalBestLap / 1000) % 60)).padStart(2, '0')}.${String(circuit.historicalBestLap % 1000).padStart(3, '0')}` : 'Sin récord de vuelta'}
                                            </div>
                                            <div className="text-zinc-500 text-sm font-mono">
                                                {circuit.historicalBestAverage ? `Promedio: ${Math.floor(circuit.historicalBestAverage / 1000 / 60)}:${String(Math.floor((circuit.historicalBestAverage / 1000) % 60)).padStart(2, '0')}.${String(circuit.historicalBestAverage % 1000).padStart(3, '0')}` : 'Sin récord promedio'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                                        <button 
                                            onClick={() => setEditingItem(circuit)} 
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:bg-zinc-700 transition-colors duration-200 min-h-[48px]"
                                        >
                                            <PencilIcon className="w-4 h-4"/>
                                            <span className="font-semibold text-sm">Editar</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteCircuit(circuit.id)} 
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:bg-red-900/50 hover:text-f1-red hover:border-f1-red transition-colors duration-200 min-h-[48px]"
                                        >
                                            <TrashIcon className="w-4 h-4"/>
                                            <span className="font-semibold text-sm">Eliminar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {circuits.length === 0 && (
                            <div className="p-8 text-center">
                                <div className="text-zinc-500 mb-4">
                                    <CircuitIcon className="w-16 h-16 mx-auto opacity-50" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-400 mb-2">No hay circuitos registrados</h3>
                                <p className="text-zinc-500 text-sm">Crear el primer circuito para empezar las carreras</p>
                            </div>
                        )}
                    </div>
                )}

            {/* Edit Modal */}
            {editingItem && (
                <Modal isOpen={true} onClose={() => setEditingItem(null)} title={
                    editingItem === 'new-player' ? 'Nuevo Jugador' :
                    editingItem === 'new-guest' ? 'Nuevo Invitado' :
                    editingItem === 'new-circuit' ? 'Nuevo Circuito' :
                    'name' in editingItem ? `Editar ${editingItem.name}` : 'Editar'
                }>
                    <EditForm 
                        item={editingItem} 
                        onSave={(data) => {
                            if (editingItem === 'new-player' || editingItem === 'new-guest' || (editingItem && typeof editingItem === 'object' && 'pin' in editingItem)) {
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
        </div>
    );
}

// Edit Form Component
const EditForm: React.FC<{
    item: EditingItem;
    onSave: (data: Partial<Player> | Partial<Circuit>) => void;
    onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
    const isGuest = item === 'new-guest' || (item && typeof item === 'object' && 'isGuest' in item && item.isGuest);
    const isPlayer = (item === 'new-player' || (item && typeof item === 'object' && 'pin' in item)) && !isGuest;
    const [formData, setFormData] = useState<Partial<Player> | Partial<Circuit>>(() => {
        if (item === 'new-player') {
            return { name: '', imageUrl: '', pin: '0000' };
        } else if (item === 'new-guest') {
            return { name: '', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest&backgroundColor=zinc', isGuest: true };
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
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wide text-zinc-400 mb-2">
                    {isPlayer ? 'Nombre del Jugador' : 'Nombre del Circuito'}
                </label>
                <input 
                    type="text" 
                    name="name" 
                    value={formData.name || ''} 
                    onChange={handleChange} 
                    placeholder={isPlayer ? "Ingresa el nombre del jugador" : "Ingresa el nombre del circuito"}
                    required 
                    className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg focus:border-f1-red focus:outline-none transition-colors duration-200 min-h-[48px]"
                />
            </div>
            
            {isPlayer && !isGuest && (
                <>
                    {/* PIN Field */}
                    <div>
                        <label className="block text-xs font-mono font-bold uppercase tracking-wide text-zinc-400 mb-2">
                            PIN de Acceso
                        </label>
                        <input 
                            type="text" 
                            name="pin" 
                            value={(formData as Player).pin || ''} 
                            onChange={handleChange} 
                            placeholder="0000"
                            pattern="\d{4}" 
                            maxLength={4}
                            required 
                            className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg font-mono tracking-widest text-center focus:border-f1-red focus:outline-none transition-colors duration-200 min-h-[48px]"
                        />
                        <p className="text-xs text-zinc-500 mt-1">Exactamente 4 dígitos para el acceso del jugador</p>
                    </div>
                    
                    {/* Avatar URL Field */}
                    <div>
                        <label className="block text-xs font-mono font-bold uppercase tracking-wide text-zinc-400 mb-2">
                            Avatar (URL)
                        </label>
                        <input 
                            type="url" 
                            name="imageUrl" 
                            value={(formData as Player).imageUrl || ''} 
                            onChange={handleChange} 
                            placeholder="https://ejemplo.com/avatar.jpg"
                            required 
                            className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg focus:border-f1-red focus:outline-none transition-colors duration-200 min-h-[48px]"
                        />
                        <p className="text-xs text-zinc-500 mt-1">URL de la imagen del avatar del jugador</p>
                    </div>
                </>
            )}
            
            {isGuest && (
                <div className="p-6 bg-amber-900/20 border border-amber-700 rounded-md">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-700 border-2 border-amber-600/50 flex items-center justify-center">
                            <GuestIcon className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wide">
                                Jugador Invitado
                            </h3>
                            <p className="text-zinc-400 text-xs font-mono">Configuración automática</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                            <span>Avatar genérico automático</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                            <span>Acceso directo sin PIN</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                            <span>Participa normalmente en campeonatos</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                            <span>No aparece en estadísticas históricas</span>
                        </div>
                    </div>
                </div>
            )}
            
            {!isPlayer && !isGuest && (
                <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wide text-zinc-400 mb-2">
                        Layout del Circuito (URL)
                    </label>
                    <input 
                        type="url" 
                        name="imageUrl" 
                        value={(formData as Circuit).imageUrl || ''} 
                        onChange={handleChange} 
                        placeholder="https://ejemplo.com/circuito-layout.jpg"
                        required 
                        className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg focus:border-f1-red focus:outline-none transition-colors duration-200 min-h-[48px]"
                    />
                    <p className="text-xs text-zinc-500 mt-1">URL de la imagen del layout del circuito</p>
                </div>
            )}
            
            {/* Form Actions */}
            <div className="flex gap-4 pt-6 border-t border-zinc-700">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 border border-zinc-600 text-zinc-100 font-bold py-4 rounded-md hover:bg-zinc-600 transition-colors duration-200 min-h-[48px] text-sm uppercase tracking-wide"
                >
                    <span>CANCELAR</span>
                </button>
                <button 
                    type="submit" 
                    className="flex-1 flex items-center justify-center gap-2 bg-f1-red border border-red-600 text-white font-bold py-4 rounded-md hover:bg-red-700 transition-colors duration-200 min-h-[48px] text-sm uppercase tracking-wide shadow-lg"
                >
                    <span>GUARDAR</span>
                </button>
            </div>
        </form>
    );
}

export default AdminView;