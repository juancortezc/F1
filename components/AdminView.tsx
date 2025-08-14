
import React, { useState } from 'react';
import { Player, Circuit } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { useSWRConfig } from 'swr';
import NavigationBar from './NavigationBar';
import Modal from './Modal';

interface AdminViewProps {
    players: Player[];
    circuits: Circuit[];
    onBack: () => void;
}

type EditingItem = Player | Circuit | 'new-player' | 'new-circuit' | null;


const AdminView: React.FC<AdminViewProps> = ({ players, circuits, onBack }) => {
    const [editingItem, setEditingItem] = useState<EditingItem>(null);
    const { mutate } = useSWRConfig();

    const handleDeletePlayer = async (id: string) => {
        if(window.confirm('Are you sure you want to delete this player?')) {
            try {
                const response = await fetch(`/api/players/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const error = await response.json();
                    alert(`Failed to delete player: ${error.error || 'Unknown error'}`);
                    return;
                }
                mutate('/api/players');
            } catch (error) {
                alert('Failed to delete player: Network error');
            }
        }
    }

    const handleDeleteCircuit = async (id: string) => {
        if(window.confirm('Are you sure you want to delete this circuit?')) {
            try {
                const response = await fetch(`/api/circuits/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const error = await response.json();
                    alert(`Failed to delete circuit: ${error.error || 'Unknown error'}`);
                    return;
                }
                mutate('/api/circuits');
            } catch (error) {
                alert('Failed to delete circuit: Network error');
            }
        }
    }


    const handleSave = async (itemData: Partial<Player | Circuit>, type: 'player' | 'circuit') => {
        const isNew = !itemData.id;
        const url = isNew ? `/api/${type}s` : `/api/${type}s/${itemData.id}`;
        const method = isNew ? 'POST' : 'PUT';
        
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                alert(`Failed to save ${type}: ${error.error || 'Unknown error'}`);
                return;
            }

            mutate(`/api/${type}s`);
            setEditingItem(null);
        } catch (error) {
            alert(`Failed to save ${type}: Network error`);
        }
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <NavigationBar 
                title="Administración"
                subtitle="Gestionar jugadores, circuitos y configuración"
                onBack={onBack}
            />
            
            <div className="max-w-6xl mx-auto p-4 md:p-8">

            <div className="grid md:grid-cols-2 gap-8">
                {/* Players Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Jugadores</h2>
                        <button onClick={() => setEditingItem('new-player')} className="bg-[#FF1801] text-white p-2 rounded-full hover:bg-[#E61601]">
                            <PlusIcon className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {players.map(player => (
                            <div key={player.id} className="flex items-center bg-slate-800 p-3 rounded-lg">
                                <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full mr-4"/>
                                <div className="flex-grow">
                                    <div className="font-semibold">{player.name}</div>
                                    <div className="text-sm text-slate-400">PIN: ****</div>
                                </div>
                                <button onClick={() => setEditingItem(player)} className="p-2 text-slate-400 hover:text-white"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeletePlayer(player.id)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Circuits Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Circuitos</h2>
                        <button onClick={() => setEditingItem('new-circuit')} className="bg-[#FF1801] text-white p-2 rounded-full hover:bg-[#E61601]">
                             <PlusIcon className="w-6 h-6"/>
                        </button>
                    </div>
                     <div className="space-y-2">
                        {circuits.map(circuit => (
                            <div key={circuit.id} className="flex items-center bg-slate-800 p-2 rounded-lg">
                                <img src={circuit.imageUrl} alt={circuit.name} className="w-20 h-10 object-cover rounded mr-4"/>
                                <span className="flex-grow font-semibold">{circuit.name}</span>
                                <button onClick={() => setEditingItem(circuit)} className="p-2 text-slate-400 hover:text-white"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeleteCircuit(circuit.id)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
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
        </div>
    );
};

const EditForm: React.FC<{item: EditingItem, onSave: (data: Partial<Player | Circuit>, type: 'player' | 'circuit') => void, onCancel: () => void}> = ({ item, onSave, onCancel }) => {
    const isNewPlayer = item === 'new-player';
    const isNewCircuit = item === 'new-circuit';
    const isPlayer = isNewPlayer || (typeof item === 'object' && item && 'id' in item && 'imageUrl' in item && !isNewCircuit);

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
        <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="Nombre" 
                        required 
                        className="w-full p-2 rounded bg-slate-700 text-slate-200"
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
                                className="w-full p-2 rounded bg-slate-700 text-slate-200"
                            />
                            <input 
                                type="url" 
                                name="imageUrl" 
                                value={(formData as Player).imageUrl || ''} 
                                onChange={handleChange} 
                                placeholder="URL de imagen" 
                                required 
                                className="w-full p-2 rounded bg-slate-700 text-slate-200"
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
                            className="w-full p-2 rounded bg-slate-700 text-slate-200"
                        />
                    )}
                    
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Cancelar</button>
                <button type="submit" className="bg-[#FF1801] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#E61601]">Guardar</button>
            </div>
        </form>
    );
}

export default AdminView;
