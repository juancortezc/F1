import React from 'react';
import { PencilIcon } from './icons';
import NavigationBar from './NavigationBar';

interface HubScreenProps {
    onNewGame: () => void;
    onAdmin: () => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ onNewGame, onAdmin }) => {
    return (
        <div className="min-h-screen bg-slate-900">
            <NavigationBar 
                title="F1 Night"
                subtitle="Gestión de carreras F1"
            />
            
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
                <div className="w-full max-w-md text-center">
                     <div className="mb-8">
                        <img 
                            src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
                            alt="F1 Logo" 
                            className="w-24 h-18 mx-auto object-contain mb-4"
                        />
                        <h1 className="text-4xl font-bold text-slate-100">F1 Night </h1>
                        <p className="text-slate-400 mt-2">¿Cómo empezamos?</p>
                     </div>
                     <div className="space-y-4">
                        <button
                            onClick={onNewGame}
                            className="w-full flex items-center justify-center gap-4 bg-[#FF1801] text-white font-bold py-6 px-4 rounded-lg hover:bg-[#E61601] transition-all text-xl shadow-lg"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Nuevo Campeonato
                        </button>
                        <button
                            onClick={onAdmin}
                            className="w-full flex items-center justify-center gap-4 bg-slate-700 text-white font-bold py-6 px-4 rounded-lg hover:bg-slate-600 transition-all text-xl shadow-lg"
                        >
                            <PencilIcon className="w-8 h-8" />
                            Administración
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default HubScreen;