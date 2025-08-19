import React from 'react';
import NavigationBar from './NavigationBar';
import { UserSession } from '../types';
import useSWR from 'swr';

interface HubScreenProps {
    onNewGame: () => void;
    onAdmin: () => void;
    currentUser: UserSession | null;
    onLogout: () => void;
    onViewStats?: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const HubScreen: React.FC<HubScreenProps> = ({ onNewGame, onAdmin, currentUser, onLogout, onViewStats }) => {
    const { data: activeGame } = useSWR('/api/game/active', fetcher);
    const isOrganizer = currentUser?.role === 'organizer';
    
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-sm w-full space-y-8">
                {/* Logo and Welcome */}
                <div className="text-center">
                    <img 
                        src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                        alt="F1" 
                        className="h-20 mx-auto mb-6"
                    />
                    <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                        Bienvenido, {currentUser?.name}
                    </h1>
                    <p className="text-lg text-zinc-300">
                        {isOrganizer ? 'Organizador' : 'Jugador'}
                    </p>
                </div>

                {/* Main Actions */}
                <div className="space-y-4">
                    {isOrganizer ? (
                        <>
                            <button
                                onClick={onNewGame}
                                className="w-full touch-target bg-red-600 text-white font-bold text-xl rounded-md py-4 transition-all hover:bg-red-700"
                            >
                                CREAR CAMPEONATO
                            </button>

                            <button
                                onClick={onAdmin}
                                className="w-full touch-target bg-zinc-800 border border-zinc-600 text-zinc-100 font-semibold text-lg rounded-md py-4 transition-all hover:bg-zinc-700"
                            >
                                Administración
                            </button>
                        </>
                    ) : (
                        <>
                            {activeGame?.game ? (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full touch-target bg-green-600 text-white font-bold text-xl rounded-md py-4 transition-all hover:bg-green-700"
                                >
                                    UNIRSE AL CAMPEONATO
                                </button>
                            ) : (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-6 text-center">
                                    <p className="text-zinc-300 text-lg mb-2">
                                        No hay campeonatos activos
                                    </p>
                                    <p className="text-zinc-400">
                                        Espera a que un organizador cree uno
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                {/* Logout */}
                <div className="pt-4 border-t border-zinc-800">
                    <button
                        onClick={onLogout}
                        className="w-full touch-target bg-transparent border border-zinc-600 text-zinc-300 font-medium text-lg rounded-md py-3 transition-all hover:text-zinc-100 hover:border-zinc-500"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HubScreen;