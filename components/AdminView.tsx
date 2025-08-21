
import React, { useState } from 'react';
import { Player, Circuit } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { useSWRConfig } from 'swr';
import Modal from './Modal';
import CircuitImage from './CircuitImage';

interface AdminViewProps {
    players: Player[];
    circuits: Circuit[];
    onBack?: () => void;
}

type EditingItem = Player | Circuit | 'new-player' | 'new-circuit' | null;


const AdminView: React.FC<AdminViewProps> = ({ players, circuits, onBack }) => {
    const [editingItem, setEditingItem] = useState<EditingItem>(null);
    const { mutate } = useSWRConfig();

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


    const handleSave = async (itemData: Partial<Player | Circuit>, type: 'player' | 'circuit') => {
        const isNew = !itemData.id;
        const url = isNew ? `/api/${type}s` : `/api/${type}s/${itemData.id}`;
        const method = isNew ? 'POST' : 'PUT';
        
        console.log(`Saving ${type}:`, { url, method, itemData }); // Debug log
        
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error(`API Error for ${type}:`, error); // Debug log
                alert(`Error al guardar ${type === 'player' ? 'jugador' : 'circuito'}: ${error.error || 'Error desconocido'}`);
                return;
            }

            const result = await response.json();
            console.log(`Successfully saved ${type}:`, result); // Debug log
            
            mutate(`/api/${type}s`);
            setEditingItem(null);
            alert(`${type === 'player' ? 'Jugador' : 'Circuito'} guardado exitosamente`);
        } catch (error) {
            console.error(`Network error for ${type}:`, error); // Debug log
            alert(`Error de red al guardar ${type === 'player' ? 'jugador' : 'circuito'}`);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-4">

            <div className="space-y-8">
                {/* Players Section */}
                <div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                        <div className="px-3 py-2 border-b border-zinc-700 flex justify-between items-center bg-zinc-800">
                            <h2 className="text-lg font-bold text-zinc-100">Jugadores</h2>
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
                </div>

                {/* Circuits Section */}
                <div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md">
                        <div className="px-3 py-2 border-b border-zinc-700 flex justify-between items-center bg-zinc-800">
                            <h2 className="text-lg font-bold text-zinc-100">Circuitos</h2>
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
                                    <div className="flex-grow">
                                        <span className="text-zinc-100 font-semibold">{circuit.name}</span>
                                    </div>
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
                </div>

            </div>

            <Modal 
                isOpen={!!editingItem} 
                onClose={() => setEditingItem(null)}
                title={editingItem === 'new-player' ? 'Crear Jugador' : editingItem === 'new-circuit' ? 'Crear Circuito' : editingItem ? `Editar ${editingItem.name}` : ''}
            >
                {editingItem && <EditForm item={editingItem} onSave={handleSave} onCancel={() => setEditingItem(null)} />}
            </Modal>

            </div>
    );
};

const EditForm: React.FC<{item: EditingItem, onSave: (data: Partial<Player | Circuit>, type: 'player' | 'circuit') => void, onCancel: () => void}> = ({ item, onSave, onCancel }) => {
    const isNewPlayer = item === 'new-player';
    const isNewCircuit = item === 'new-circuit';
    const isPlayer = isNewPlayer || (typeof item === 'object' && item && 'pin' in item); // Players have 'pin' property, circuits don't

    const [formData, setFormData] = useState(() => {
        if (isNewPlayer) {
            return { name: '', imageUrl: '', pin: '', isActive: true };
        }
        if (isNewCircuit) {
            return { name: '', imageUrl: ''};
        }
        return { ...item };
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Client-side validation
        if (!formData.name || !formData.name.trim()) {
            alert('Nombre es requerido');
            return;
        }
        
        if (formData.name.trim().length > 50) {
            alert('El nombre debe tener 50 caracteres o menos');
            return;
        }
        
        if (isPlayer) {
            const playerData = formData as Player;
            if (!playerData.pin || playerData.pin.length !== 4) {
                alert('PIN debe tener exactamente 4 dígitos');
                return;
            }
            if (!/^\d{4}$/.test(playerData.pin)) {
                alert('PIN debe contener solo números');
                return;
            }
            if (!playerData.imageUrl) {
                alert('URL de imagen es requerida');
                return;
            }
            try {
                new URL(playerData.imageUrl);
            } catch {
                alert('Por favor ingresa una URL válida');
                return;
            }
            onSave(formData, 'player');
            return;
        }
        
        if (!formData.imageUrl) {
            alert('URL de imagen es requerida');
            return;
        }
        
        try {
            new URL(formData.imageUrl);
        } catch {
            alert('Por favor ingresa una URL válida');
            return;
        }
        
        onSave(formData, 'circuit');
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Nombre" 
                required 
                className="w-full p-4 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-lg touch-target"
            />
            
            {isPlayer && (
                <>
                    <input 
                        type="password" 
                        name="pin" 
                        value={(formData as Player).pin || ''} 
                        onChange={handleChange} 
                        placeholder="PIN (4 dígitos)" 
                        maxLength={4}
                        pattern="\d{4}"
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
