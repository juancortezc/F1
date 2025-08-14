import React from 'react';
import { PencilIcon, TrophyIcon, UserGroupIcon, ClockIcon } from './icons';
import NavigationBar from './NavigationBar';
import { UserSession } from '../types';
import useSWR from 'swr';

interface HubScreenProps {
    onNewGame: () => void;
    onAdmin: () => void;
    currentUser: UserSession | null;
    onLogout: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const HubScreen: React.FC<HubScreenProps> = ({ onNewGame, onAdmin, currentUser, onLogout }) => {
    const { data: activeGame } = useSWR('/api/game/active', fetcher);
    const isOrganizer = currentUser?.role === 'organizer';
    
    return (
        <div className="min-h-screen bg-slate-900">
            <NavigationBar 
                title="F1 Night"
                subtitle="Gestión de carreras F1"
                currentUser={currentUser}
                onLogout={onLogout}
                showAdmin={isOrganizer}
                onAdmin={onAdmin}
            />
            
            <div className="max-w-4xl mx-auto p-4">
                {/* Welcome Section */}
                <div className="text-center mb-12 pt-8">
                    <div className="mb-6">
                        <img 
                            src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                            alt="F1 Logo" 
                            className="w-24 h-18 mx-auto object-contain mb-4"
                        />
                        <h1 className="text-4xl font-bold text-slate-100">
                            Bienvenido, <span className="text-[#FF1801]">{currentUser?.name}</span>
                        </h1>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                            isOrganizer 
                                ? 'bg-[#FF1801]/20 text-[#FF1801]' 
                                : 'bg-blue-500/20 text-blue-400'
                        }`}>
                            {isOrganizer ? 'Organizador' : 'Jugador'}
                        </div>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {isOrganizer ? (
                        // Organizer Actions
                        <>
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrophyIcon className="w-8 h-8 text-[#FF1801]" />
                                    <h2 className="text-xl font-bold text-white">Crear Campeonato</h2>
                                </div>
                                <p className="text-slate-400 mb-4">
                                    Configura un nuevo campeonato con circuitos, jugadores y reglas personalizadas.
                                </p>
                                <button
                                    onClick={onNewGame}
                                    className="w-full bg-[#FF1801] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#E61601] transition-all"
                                >
                                    Nuevo Campeonato
                                </button>
                            </div>

                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <PencilIcon className="w-8 h-8 text-blue-400" />
                                    <h2 className="text-xl font-bold text-white">Administración</h2>
                                </div>
                                <p className="text-slate-400 mb-4">
                                    Gestiona jugadores, circuitos y configuraciones del sistema.
                                </p>
                                <button
                                    onClick={onAdmin}
                                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all"
                                >
                                    Panel Admin
                                </button>
                            </div>
                        </>
                    ) : (
                        // Player Actions  
                        <>
                            {activeGame?.game ? (
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <ClockIcon className="w-8 h-8 text-green-400" />
                                        <h2 className="text-xl font-bold text-white">Campeonato Activo</h2>
                                    </div>
                                    <p className="text-slate-400 mb-4">
                                        Hay un campeonato en curso. ¡Únete a la competencia!
                                    </p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-all"
                                    >
                                        Unirse al Campeonato
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <UserGroupIcon className="w-8 h-8 text-slate-400" />
                                        <h2 className="text-xl font-bold text-white">Esperando Campeonato</h2>
                                    </div>
                                    <p className="text-slate-400 mb-4">
                                        No hay campeonatos activos. Espera a que un organizador cree uno nuevo.
                                    </p>
                                    <button
                                        disabled
                                        className="w-full bg-slate-600 text-slate-400 font-bold py-3 px-4 rounded-lg cursor-not-allowed"
                                    >
                                        No Disponible
                                    </button>
                                </div>
                            )}

                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrophyIcon className="w-8 h-8 text-yellow-400" />
                                    <h2 className="text-xl font-bold text-white">Estadísticas</h2>
                                </div>
                                <p className="text-slate-400 mb-4">
                                    Consulta tus récords, estadísticas y el ranking general.
                                </p>
                                <button
                                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                    className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 transition-all"
                                >
                                    Ver Estadísticas
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Information Section */}
                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                        {isOrganizer ? '¿Cómo funciona?' : '¿Cómo participar?'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
                        {isOrganizer ? (
                            <>
                                <div className="flex items-start gap-2">
                                    <span className="text-[#FF1801] font-bold">1.</span>
                                    <span>Crea un campeonato seleccionando circuitos y jugadores</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[#FF1801] font-bold">2.</span>
                                    <span>Configura las reglas y puntos del campeonato</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-[#FF1801] font-bold">3.</span>
                                    <span>Supervisa las carreras y proclama al campeón</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-400 font-bold">1.</span>
                                    <span>Espera a que se cree un campeonato</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-400 font-bold">2.</span>
                                    <span>Únete automáticamente cuando esté disponible</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-400 font-bold">3.</span>
                                    <span>¡Compite por ser el campeón de F1 Night!</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HubScreen;