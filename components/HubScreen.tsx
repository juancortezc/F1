import React from 'react';
import { PencilIcon } from './icons';

interface HubScreenProps {
    onNewGame: () => void;
    onAdmin: () => void;
}

const HubScreen: React.FC<HubScreenProps> = ({ onNewGame, onAdmin }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md text-center">
                 <h1 className="text-4xl font-bold mt-4 text-slate-100">F1 Night Tracker</h1>
                 <p className="text-slate-400 mt-2 mb-12">What would you like to do?</p>
                 <div className="space-y-4">
                    <button
                        onClick={onNewGame}
                        className="w-full flex items-center justify-center gap-4 bg-[#FF1801] text-white font-bold py-6 px-4 rounded-lg hover:bg-[#E61601] transition-all text-2xl"
                    >
                        <img 
                            src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
                            alt="F1 Logo" 
                            className="w-10 h-8 object-contain"
                        />
                        Start New Game
                    </button>
                    <button
                        onClick={onAdmin}
                        className="w-full flex items-center justify-center gap-4 bg-slate-700 text-white font-bold py-6 px-4 rounded-lg hover:bg-slate-600 transition-all text-2xl"
                    >
                        <PencilIcon className="w-8 h-8" />
                        Administration
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default HubScreen;