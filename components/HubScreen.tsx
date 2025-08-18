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
        <div className="min-h-screen bg-f1-black">
            <NavigationBar 
                title="F1 NIGHT"
                subtitle=""
                currentUser={currentUser}
                onLogout={onLogout}
                showAdmin={false}
                onAdmin={onAdmin}
            />
            
            <div className="max-w-md mx-auto p-4 pt-8">
                {/* Welcome */}
                <div className="text-center mb-8">
                    <h1 className="text-f1-2xl font-bold text-primary mb-2">
                        {currentUser?.name}
                    </h1>
                    <div className="text-f1-base text-secondary">
                        {isOrganizer ? 'Organizador' : 'Jugador'}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    {isOrganizer ? (
                        <>
                            <button
                                onClick={onNewGame}
                                className="w-full touch-target bg-f1-red text-white font-bold text-f1-lg rounded-md transition-opacity hover:opacity-90"
                            >
                                CREAR CAMPEONATO
                            </button>

                            <button
                                onClick={onAdmin}
                                className="w-full touch-target surface-primary border border-subtle text-primary font-semibold text-f1-base rounded-md transition-opacity hover:opacity-90"
                            >
                                Administración
                            </button>
                        </>
                    ) : (
                        <>
                            {activeGame?.game ? (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full touch-target bg-f1-green text-white font-bold text-f1-lg rounded-md transition-opacity hover:opacity-90"
                                >
                                    UNIRSE AL CAMPEONATO
                                </button>
                            ) : (
                                <div className="surface-primary border border-subtle rounded-md p-6 text-center">
                                    <p className="text-secondary text-f1-base mb-2">
                                        No hay campeonatos activos
                                    </p>
                                    <p className="text-muted text-f1-sm">
                                        Espera a que un organizador cree uno
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={onViewStats || (() => onLogout())}
                                className="w-full touch-target surface-secondary border border-subtle text-primary font-semibold text-f1-base rounded-md transition-opacity hover:opacity-90"
                            >
                                Ver Estadísticas
                            </button>
                        </>
                    )}
                    
                    <button
                        onClick={onLogout}
                        className="w-full touch-target surface-primary border border-subtle text-secondary font-medium text-f1-base rounded-md transition-opacity hover:text-primary hover:border-f1-border"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HubScreen;