import React from 'react';
import { UserSession } from '../types';
import useSWR from 'swr';
import { useTournament } from '../contexts/TournamentContext';

// F1 Management Icon
const ManagementIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2ZM4 7V9H20V7H4ZM13 16.5V20H11V16.5H8V14.5H16V16.5H13ZM6 11H18V13H6V11Z"/>
    </svg>
);

// Trophy Icon for tournaments
const TrophyIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V4H20C20.5523 4 21 4.44772 21 5V8C21 10.2091 19.2091 12 17 12H16.5C16.1867 12 15.9 11.84 15.7324 11.5547L12 6L8.26756 11.5547C8.09997 11.84 7.81326 12 7.5 12H7C4.79086 12 3 10.2091 3 8V5C3 4.44772 3.44772 4 4 4H7ZM9 3V5H15V3H9ZM5 6V8C5 9.10457 5.89543 10 7 10H7.17157L10.1716 6H5ZM17 10C18.1046 10 19 9.10457 19 8V6H13.8284L16.8284 10H17ZM8 14H16C16.5523 14 17 14.4477 17 15V19C17 20.1046 16.1046 21 15 21H9C7.89543 21 7 20.1046 7 19V15C7 14.4477 7.44772 14 8 14ZM9 16V19H15V16H9Z"/>
    </svg>
);

// Settings Gear Icon
const SettingsIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L21.5 6.5V17.5L12 23L2.5 17.5V6.5L12 1ZM12 3.311L4.5 7.653V16.347L12 20.689L19.5 16.347V7.653L12 3.311ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14Z"/>
    </svg>
);

// Live Timing Icon
const LiveIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM13 12V7H11V14H17V12H13Z"/>
    </svg>
);

interface AdminHubProps {
    onNewGame: () => void;
    onAdmin: () => void;
    onTournamentSetup?: () => void;
    onTournamentManagement?: () => void;
    onBackToLive: () => void;
    currentUser: UserSession | null;
    onLogout: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const AdminHub: React.FC<AdminHubProps> = ({ 
    onNewGame, 
    onAdmin, 
    onTournamentSetup,
    onTournamentManagement, 
    onBackToLive,
    currentUser, 
    onLogout 
}) => {
    const { data: activeGame } = useSWR('/api/game/active', fetcher);
    const { activeTournament, isInTournamentMode } = useTournament();
    
    // Helper function to check if user has admin privileges
    const hasAdminPrivileges = (user: UserSession | null): boolean => {
        if (!user) return false;
        if (user.role === 'organizer') return true;
        return user.name === 'Juan' || user.name === 'Berna';
    };
    
    const isOrganizer = hasAdminPrivileges(currentUser);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-sm w-full space-y-8">
                {/* F1 Luxury Header */}
                <div className="text-center">
                    <img 
                        src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                        alt="F1" 
                        className="h-16 mx-auto mb-6 opacity-90"
                    />
                    <h1 className="text-3xl font-bold text-white tracking-wide mb-2 font-mono">
                        F1 CONTROL TOWER
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-transparent via-f1-red to-transparent mx-auto mb-4"></div>
                    <div className="text-center mb-6">
                        <p className="text-xl font-semibold text-zinc-100 mb-1">
                            {currentUser?.name}
                        </p>
                        <p className="text-sm font-mono uppercase tracking-widest text-zinc-400">
                            {isOrganizer ? 'RACE DIRECTOR' : 'PILOTO'}
                        </p>
                    </div>
                </div>

                {/* Tournament Status */}
                {isInTournamentMode && activeTournament && (
                    <div className="bg-zinc-900 border-l-4 border-amber-500 p-4 rounded-r-md">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-mono uppercase tracking-wide text-amber-400">TORNEO ACTIVO</span>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-100 mb-1">{activeTournament.name}</h3>
                        <p className="text-sm text-zinc-400 mb-3">
                            Campeonato {((activeTournament.championships?.filter((c: any) => c.status === 'COMPLETED').length) || 0) + 1} de {activeTournament.maxChampionships}
                        </p>
                        {onTournamentManagement && (
                            <button
                                onClick={onTournamentManagement}
                                className="w-full relative overflow-hidden group min-h-[40px] bg-amber-800 border border-amber-600 text-amber-100 rounded-md py-2 px-4 transition-all duration-300 hover:bg-amber-700 hover:border-amber-500 transform hover:scale-[1.02] active:scale-[0.98] text-sm font-semibold"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <SettingsIcon className="w-4 h-4" />
                                    <span className="tracking-wide">GESTIONAR TORNEO</span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-400/20 to-amber-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            </button>
                        )}
                    </div>
                )}

                {/* Main Action Buttons */}
                <div className="space-y-4">
                    {/* Crear Campeonato - Primary Action */}
                    <button
                        onClick={onNewGame}
                        className="w-full relative overflow-hidden group min-h-[48px] bg-f1-red border-2 border-red-700 text-white rounded-lg py-4 px-6 transition-all duration-300 hover:bg-red-700 hover:border-red-600 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <ManagementIcon className="w-6 h-6" />
                            <span className="text-lg font-bold tracking-wide">CREAR CAMPEONATO</span>
                        </div>
                        {/* Luxury hover effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-400/20 to-red-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </button>

                    {/* Administración - Secondary Action */}
                    <button
                        onClick={onAdmin}
                        className="w-full relative overflow-hidden group min-h-[48px] bg-zinc-900 border-2 border-zinc-700 text-zinc-100 rounded-lg py-4 px-6 transition-all duration-300 hover:bg-zinc-800 hover:border-zinc-600 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <SettingsIcon className="w-6 h-6" />
                            <span className="text-lg font-semibold tracking-wide">ADMINISTRACIÓN</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-600/0 via-zinc-600/10 to-zinc-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </button>

                    {/* Crear Torneo - Tournament Action */}
                    {!isInTournamentMode && onTournamentSetup && (
                        <button
                            onClick={onTournamentSetup}
                            className="w-full relative overflow-hidden group min-h-[48px] bg-amber-700 border-2 border-amber-600 text-white rounded-lg py-4 px-6 transition-all duration-300 hover:bg-amber-600 hover:border-amber-500 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <TrophyIcon className="w-6 h-6" />
                                <span className="text-lg font-semibold tracking-wide">CREAR TORNEO</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-400/20 to-amber-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        </button>
                    )}

                    {/* Menú Principal - Back to Live */}
                    <button
                        onClick={onBackToLive}
                        className="w-full relative overflow-hidden group min-h-[48px] bg-transparent border-2 border-zinc-600 text-zinc-300 rounded-lg py-4 px-6 transition-all duration-300 hover:bg-zinc-800/50 hover:border-zinc-500 hover:text-zinc-100 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <LiveIcon className="w-6 h-6" />
                            <span className="text-lg font-semibold tracking-wide">MENÚ PRINCIPAL</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-600/0 via-zinc-600/5 to-zinc-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </button>
                </div>

                {/* Game Status Info */}
                {activeGame?.game && (
                    <div className="bg-green-900/20 border border-green-800 rounded-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-mono uppercase tracking-wide text-green-400">CAMPEONATO ACTIVO</span>
                        </div>
                        <p className="text-sm text-zinc-300">
                            Hay un campeonato en curso. Los pilotos pueden unirse desde el Menú Principal.
                        </p>
                    </div>
                )}

                {/* Logout */}
                <div className="pt-4 border-t border-zinc-800">
                    <button
                        onClick={onLogout}
                        className="w-full min-h-[44px] bg-transparent border border-zinc-700 text-zinc-400 font-medium text-base rounded-md py-3 transition-all duration-300 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900/30"
                    >
                        <span className="font-mono uppercase tracking-wider">CERRAR SESIÓN</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs">
                        <div className="w-6 h-px bg-zinc-800"></div>
                        <span className="font-mono tracking-wider">F1 NIGHT SYSTEM</span>
                        <div className="w-6 h-px bg-zinc-800"></div>
                    </div>
                    <div className="text-zinc-700 text-xs font-mono mt-1">RACING MANAGEMENT</div>
                </div>
            </div>
        </div>
    );
};

export default AdminHub;