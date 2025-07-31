
import React, { useState } from 'react';
import { Player, Circuit, UserWithPin } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';
import NavigationBar from './NavigationBar';

interface AdminViewProps {
    players: Player[];
    circuits: Circuit[];
    onBack: () => void;
}

type EditingItem = Player | Circuit | UserWithPin | 'new-player' | 'new-circuit' | 'new-user' | null;


const AdminView: React.FC<AdminViewProps> = ({ players, circuits, onBack }) => {
    const [editingItem, setEditingItem] = useState<EditingItem>(null);
    const { mutate } = useSWRConfig();
    const { data: users, error: usersError } = useSWR<UserWithPin[]>('/api/users');

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

    const handleDeleteUser = async (id: string) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            try {
                const response = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const error = await response.json();
                    alert(`Failed to delete user: ${error.error || 'Unknown error'}`);
                    return;
                }
                mutate('/api/users');
            } catch (error) {
                alert('Failed to delete user: Network error');
            }
        }
    }

    const handleSave = async (itemData: Partial<Player | Circuit | UserWithPin>, type: 'player' | 'circuit' | 'user') => {
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

            <div className="grid md:grid-cols-3 gap-8">
                {/* Users Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Usuarios</h2>
                        <button onClick={() => setEditingItem('new-user')} className="bg-[#FF1801] text-white p-2 rounded-full hover:bg-[#E61601]">
                            <PlusIcon className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {users?.map(user => (
                            <div key={user.id} className="flex items-center bg-slate-800 p-3 rounded-lg">
                                <div className="flex-grow">
                                    <div className="font-semibold">{user.name}</div>
                                    <div className="text-sm text-slate-400">PIN: ****</div>
                                </div>
                                <button onClick={() => setEditingItem(user)} className="p-2 text-slate-400 hover:text-white"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                    </div>
                </div>

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
                            <div key={player.id} className="flex items-center bg-slate-800 p-2 rounded-lg">
                                <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full mr-4"/>
                                <span className="flex-grow font-semibold">{player.name}</span>
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

            {editingItem && <EditModal item={editingItem} onSave={handleSave} onCancel={() => setEditingItem(null)} />}
            </div>
        </div>
    );
};

const EditModal: React.FC<{item: EditingItem, onSave: (data: Partial<Player | Circuit | UserWithPin>, type: 'player' | 'circuit' | 'user') => void, onCancel: () => void}> = ({ item, onSave, onCancel }) => {
    const isNewPlayer = item === 'new-player';
    const isNewCircuit = item === 'new-circuit';
    const isNewUser = item === 'new-user';
    const isPlayer = isNewPlayer || (typeof item === 'object' && item && 'id' in item && 'imageUrl' in item && !isNewCircuit && !isNewUser);
    const isUser = isNewUser || (typeof item === 'object' && item && 'id' in item && 'pin' in item);

    const [formData, setFormData] = useState(() => {
        if (isNewPlayer || isNewCircuit) {
            return { name: '', imageUrl: ''};
        }
        if (isNewUser) {
            return { name: '', pin: '' };
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
        
        if (isUser) {
            const userData = formData as UserWithPin;
            if (!userData.pin || userData.pin.length !== 4) {
                alert('PIN debe tener exactamente 4 dígitos');
                return;
            }
            if (!/^\d{4}$/.test(userData.pin)) {
                alert('PIN debe contener solo números');
                return;
            }
            onSave(formData, 'user');
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
        
        onSave(formData, isPlayer ? 'player' : 'circuit');
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                    {isNewUser ? 'Crear Usuario' : isNewPlayer ? 'Crear Jugador' : isNewCircuit ? 'Crear Circuito' : `Editar ${formData.name}`}
                </h2>
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
                    
                    {isUser && (
                        <input 
                            type="password" 
                            name="pin" 
                            value={(formData as UserWithPin).pin || ''} 
                            onChange={handleChange} 
                            placeholder="PIN (4 dígitos)" 
                            maxLength={4}
                            pattern="\d{4}"
                            required 
                            className="w-full p-2 rounded bg-slate-700 text-slate-200"
                        />
                    )}
                    
                    {!isUser && (
                        <input 
                            type="url" 
                            name="imageUrl" 
                            value={(formData as Player).imageUrl || ''} 
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
            </div>
        </div>
    );
}

export default AdminView;
