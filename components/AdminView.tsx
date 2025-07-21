
import React, { useState } from 'react';
import { Player, Circuit } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { useSWRConfig } from 'swr';
import NavigationBar from './NavigationBar';

interface AdminViewProps {
    players: Player[];
    circuits: Circuit[];
    onBack: () => void;
    pinCode: string;
}

type EditingItem = Player | Circuit | 'new-player' | 'new-circuit' | null;

const UpdatePinForm: React.FC<{currentPin: string}> = ({ currentPin }) => {
    const [inputCurrentPin, setInputCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { mutate } = useSWRConfig();

    const handlePinUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (inputCurrentPin.length !== 4 || !/^\d{4}$/.test(inputCurrentPin)) {
            setError('Current PIN must be exactly 4 digits.');
            return;
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            setError('New PIN must be exactly 4 digits.');
            return;
        }

        if (newPin !== confirmPin) {
            setError('New PINs do not match.');
            return;
        }

        if (inputCurrentPin === newPin) {
            setError('New PIN must be different from current PIN.');
            return;
        }

        try {
            const response = await fetch('/api/admin/pin', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    currentPin: inputCurrentPin, 
                    newPin: newPin 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to update PIN.');
                return;
            }

            mutate('/api/settings'); // revalidate pin
            setSuccess('PIN updated successfully!');
            setInputCurrentPin('');
            setNewPin('');
            setConfirmPin('');
            setTimeout(() => setSuccess(''), 3000);
        } catch(err) {
            setError('Failed to update PIN.');
        }
    };

    return (
        <form onSubmit={handlePinUpdate} className="bg-slate-800 p-4 rounded-lg max-w-sm">
            <div className="space-y-4">
                <div>
                    <label className="block text-slate-400 mb-1 text-sm font-semibold">PIN Actual</label>
                    <input 
                        type="password" 
                        value={inputCurrentPin} 
                        onChange={e => setInputCurrentPin(e.target.value)} 
                        maxLength={4} 
                        placeholder="Enter current PIN"
                        className="w-full p-2 rounded bg-slate-700 text-slate-200" 
                        required
                    />
                </div>
                <div>
                    <label className="block text-slate-400 mb-1 text-sm font-semibold">Nuevo PIN</label>
                    <input 
                        type="password" 
                        value={newPin} 
                        onChange={e => setNewPin(e.target.value)} 
                        maxLength={4} 
                        placeholder="Enter new PIN"
                        className="w-full p-2 rounded bg-slate-700 text-slate-200" 
                        required
                    />
                </div>
                <div>
                    <label className="block text-slate-400 mb-1 text-sm font-semibold">Confirmar Nuevo PIN</label>
                    <input 
                        type="password" 
                        value={confirmPin} 
                        onChange={e => setConfirmPin(e.target.value)} 
                        maxLength={4} 
                        placeholder="Confirm new PIN"
                        className="w-full p-2 rounded bg-slate-700 text-slate-200" 
                        required
                    />
                </div>
            </div>
            {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
            {success && <p className="text-green-500 mt-3 text-sm">{success}</p>}
            <button 
                type="submit" 
                className="w-full bg-[#FF1801] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#E61601] mt-4 disabled:bg-slate-600 disabled:cursor-not-allowed"
                disabled={inputCurrentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
            >
                Update PIN
            </button>
        </form>
    );
}

const AdminView: React.FC<AdminViewProps> = ({ players, circuits, onBack, pinCode }) => {
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
            
            <div className="max-w-4xl mx-auto p-4 md:p-8">
            
            <div className="mb-8 pb-8 border-b border-slate-700">
                <h2 className="text-2xl font-semibold mb-4">Settings Seguridad</h2>
                <UpdatePinForm currentPin={pinCode} />
            </div>

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

const EditModal: React.FC<{item: EditingItem, onSave: (data: Partial<Player | Circuit>, type: 'player' | 'circuit') => void, onCancel: () => void}> = ({ item, onSave, onCancel }) => {
    const isNewPlayer = item === 'new-player';
    const isNewCircuit = item === 'new-circuit';
    const isPlayer = isNewPlayer || (typeof item === 'object' && item && 'id' in item && !isNewCircuit);

    const [formData, setFormData] = useState(() => {
        if (isNewPlayer || isNewCircuit) {
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
            alert('Name is required');
            return;
        }
        
        if (formData.name.trim().length > 50) {
            alert('Name must be 50 characters or less');
            return;
        }
        
        if (!formData.imageUrl) {
            alert('Image URL is required');
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
                    {isNewPlayer ? 'Create Player' : isNewCircuit ? 'Create Circuit' : `Edit ${(formData as Player).name}`}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" required className="w-full p-2 rounded bg-slate-700"/>
                    <input type="url" name="imageUrl" value={(formData as Player).imageUrl} onChange={handleChange} placeholder="Image URL" required className="w-full p-2 rounded bg-slate-700"/>
                    
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Cancel</button>
                        <button type="submit" className="bg-[#FF1801] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#E61601]">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminView;
