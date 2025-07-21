
import React, { useState, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useToast } from '../components/Toast';

import LoginScreen from '../components/LoginScreen';
import GameSetup from '../components/GameSetup';
import RaceView from '../components/RaceView';
import ResultsView from '../components/ResultsView';
import HubScreen from '../components/HubScreen';
import AdminView from '../components/AdminView';
import RaceProgress from '../components/RaceProgress';
import { GameSettings, GameState, PlayerStats, Circuit, Player, GameHistoryEntry } from '../types';

type GamePhase = 'login' | 'hub' | 'setup' | 'admin' | 'race' | 'results' | 'loading';

// API data fetching hook
function useApiData() {
    const { data: players, error: playersError, isLoading: playersLoading } = useSWR<Player[]>('/api/players');
    const { data: circuits, error: circuitsError, isLoading: circuitsLoading } = useSWR<Circuit[]>('/api/circuits');
    const { data: activeGame, error: gameError, isLoading: gameLoading } = useSWR<{game: {id: string, state: GameState} | null}>('/api/game/active');
    const { data: settings, error: settingsError, isLoading: settingsLoading } = useSWR<{pin: string}>('/api/settings');
    const { data: history, error: historyError, isLoading: historyLoading } = useSWR<GameHistoryEntry[]>('/api/game/history');
    
    const isLoading = playersLoading || circuitsLoading || gameLoading || settingsLoading || historyLoading;
    const error = playersError || circuitsError || gameError || settingsError || historyError;

    return { players, circuits, activeGame: activeGame?.game, pinCode: settings?.pin, gameHistory: history, isLoading, error };
}


function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('login');
  const [activeTab, setActiveTab] = useState<'race' | 'progress' | 'results'>('race');
  
  const { mutate } = useSWRConfig();
  const { addToast } = useToast();
  const { players, circuits, activeGame, pinCode, gameHistory, isLoading, error } = useApiData();

  const handleLoginSuccess = () => {
    if (activeGame) {
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      setGamePhase(isFinished ? 'results' : 'race');
      setActiveTab(isFinished ? 'results' : 'race');
    } else {
      setGamePhase('hub');
    }
  };

  const handleSetupComplete = async (settings: GameSettings) => {
    try {
      addToast({
        type: 'info',
        title: 'Creando juego...',
        message: 'Configurando la nueva carrera'
      });

      const playerStats: Record<string, PlayerStats> = {};
      settings.players.forEach(p => {
          playerStats[p.id] = { totalScore: 0, bestLaps: 0, bestAverages: 0 };
      });

      const newGameState: GameState = {
        settings,
        circuits: settings.circuits,
        playerOrder: settings.players.map(p => p.id),
        currentCircuitIndex: 0,
        currentTurn: 1,
        currentPlayerIndex: 0,
        circuitResults: Array(settings.circuits.length).fill(null).map((_, i) => ({ circuitId: settings.circuits[i].id, turns: [] })),
        playerStats,
        sessionBestLap: Infinity,
        sessionBestAverage: Infinity,
        lapTimesLog: [],
      };
      
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newGameState }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      await mutate('/api/game/active');
      setGamePhase('race');
      
      addToast({
        type: 'success',
        title: '¡Juego creado!',
        message: `Carrera iniciada con ${settings.players.length} pilotos`
      });
    } catch(err) {
      console.error("Failed to create game", err);
      addToast({
        type: 'error',
        title: 'Error al crear juego',
        message: 'No se pudo iniciar la nueva carrera. Inténtalo de nuevo.'
      });
    }
  };
  
  const handleNewGame = async () => {
      // Starting a new game means marking the old one as complete if it exists
      if (activeGame) {
          try {
              await fetch(`/api/game/update`, {
                  method: 'PUT',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ id: activeGame.id, status: 'COMPLETED' })
              });
              await mutate('/api/game/active'); // This should now return null
              await mutate('/api/game/history'); // This should now have the new entry
          } catch(err) {
              console.error("Failed to archive game", err);
          }
      }
      setGamePhase('setup');
  };
  
  const handleCancelGame = async () => {
      // Cancel current game and go to hub
      if (activeGame) {
          try {
              await fetch(`/api/game/update`, {
                  method: 'PUT',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ id: activeGame.id, status: 'COMPLETED' })
              });
              await mutate('/api/game/active');
              await mutate('/api/game/history');
          } catch(err) {
              console.error("Failed to cancel game", err);
          }
      }
      setGamePhase('hub');
  };
  
  const handleAdmin = () => setGamePhase('admin');
  const handleExitAdmin = () => {
    if (activeGame) {
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      setGamePhase(isFinished ? 'results' : 'race');
      setActiveTab(isFinished ? 'results' : 'race');
    } else {
      setGamePhase('hub');
    }
  };

  const updateGameState = async (newState: GameState) => {
      if (!activeGame) return;
      try {
          // Optimistic update
          mutate('/api/game/active', { game: { ...activeGame, state: newState } }, false);
          
          const response = await fetch(`/api/game/update`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: activeGame.id, state: newState, status: 'ACTIVE' })
          });

          if (!response.ok) {
            throw new Error('Failed to update game state');
          }
          
          // Revalidate
          mutate('/api/game/active');
      } catch (err) {
          console.error("Failed to update game state:", err);
          addToast({
            type: 'error',
            title: 'Error de sincronización',
            message: 'No se pudo guardar el progreso del juego'
          });
          // Revert optimistic update
          mutate('/api/game/active');
      }
  };

  const handleTurnComplete = useCallback(async (playerId: string, lapTimes: number[]) => {
    if (!activeGame) return;
    const gameState = activeGame.state;
    
    let newSessionBestLap = gameState.sessionBestLap;
    lapTimes.forEach(time => {
        if(time < newSessionBestLap) newSessionBestLap = time;
    });

    const timesToAverage = (gameState.settings.lapsPerTurn === 5 && gameState.settings.useBest4Of5Laps)
        ? [...lapTimes].sort((a,b) => a - b).slice(0, 4)
        : lapTimes;
    
    const averageTime = Math.round(timesToAverage.reduce((a, b) => a + b, 0) / timesToAverage.length);
    
    let newSessionBestAverage = gameState.sessionBestAverage;
    if (averageTime < newSessionBestAverage) {
        newSessionBestAverage = averageTime;
    }
    
    const newCircuitResults = [...gameState.circuitResults];
    if (!newCircuitResults[gameState.currentCircuitIndex]) {
        newCircuitResults[gameState.currentCircuitIndex] = { circuitId: gameState.circuits[gameState.currentCircuitIndex].id, turns: [] };
    }
    if (!newCircuitResults[gameState.currentCircuitIndex].turns[gameState.currentTurn - 1]) {
        newCircuitResults[gameState.currentCircuitIndex].turns[gameState.currentTurn - 1] = [];
    }
    
    newCircuitResults[gameState.currentCircuitIndex].turns[gameState.currentTurn - 1].push({
        playerId,
        lapTimes,
        averageTime,
        turnScore: 0,
    });

    const newLapTimesLog = [...gameState.lapTimesLog];
    lapTimes.forEach((time, index) => {
        newLapTimesLog.push({
            playerId,
            circuitName: gameState.circuits[gameState.currentCircuitIndex].name,
            turn: gameState.currentTurn,
            lap: index + 1,
            time,
        });
    });

    const isLastPlayerOfTurn = gameState.currentPlayerIndex === gameState.settings.players.length - 1;
    let nextPlayerIndex = gameState.currentPlayerIndex + 1;
    let nextTurn = gameState.currentTurn;
    let newPlayerOrder = gameState.playerOrder;
    let finalPlayerStats = gameState.playerStats;

    if (isLastPlayerOfTurn) {
        const turnResults = newCircuitResults[gameState.currentCircuitIndex].turns[gameState.currentTurn - 1];
        const newPlayerStats: Record<string, PlayerStats> = JSON.parse(JSON.stringify(gameState.playerStats));
        const { scoringMethod, scoringMultiplier } = gameState.settings;

        const getPoints = (rank: number): number => {
            if (rank === 0) return 3;
            if (rank === 1) return 2;
            if (rank === 2) return 1;
            return 0;
        };

        const pointsThisTurn = new Map<string, number>();
        gameState.settings.players.forEach(p => pointsThisTurn.set(p.id, 0));
        
        turnResults.forEach(r => r.turnScore = 0);

        if (scoringMethod === 'average' || scoringMethod === 'both') {
            const sortedByAverage = [...turnResults].sort((a, b) => (a.averageTime ?? Infinity) - (b.averageTime ?? Infinity));
            sortedByAverage.forEach((result, rank) => {
                let points = getPoints(rank);
                if (scoringMethod === 'both' && scoringMultiplier?.appliesTo === 'average') {
                    points *= scoringMultiplier.factor;
                }
                pointsThisTurn.set(result.playerId, (pointsThisTurn.get(result.playerId) || 0) + points);
            });
        }

        if (scoringMethod === 'lap' || scoringMethod === 'both') {
            const playerBests = turnResults.map(tr => ({
                playerId: tr.playerId,
                bestLap: Math.min(...tr.lapTimes)
            }));
            const sortedByLap = playerBests.sort((a, b) => a.bestLap - b.bestLap);
            
            sortedByLap.forEach((lapResult, rank) => {
                let points = getPoints(rank);
                if (scoringMethod === 'both' && scoringMultiplier?.appliesTo === 'lap') {
                    points *= scoringMultiplier.factor;
                }
                pointsThisTurn.set(lapResult.playerId, (pointsThisTurn.get(lapResult.playerId) || 0) + points);
            });
        }
        
        turnResults.forEach(result => {
            const totalTurnPoints = pointsThisTurn.get(result.playerId) || 0;
            result.turnScore = totalTurnPoints;
            newPlayerStats[result.playerId].totalScore += totalTurnPoints;
        });
        
        finalPlayerStats = newPlayerStats;
        nextPlayerIndex = 0;
        nextTurn = gameState.currentTurn + 1;

        newPlayerOrder = Object.entries(finalPlayerStats)
            .sort((a, b) => (b[1] as PlayerStats).totalScore - (a[1] as PlayerStats).totalScore)
            .map(([playerId]) => playerId);
    }
    
    const newGameState = {
      ...gameState,
      circuitResults: newCircuitResults,
      sessionBestLap: newSessionBestLap,
      sessionBestAverage: newSessionBestAverage,
      playerStats: finalPlayerStats,
      currentPlayerIndex: nextPlayerIndex,
      currentTurn: nextTurn,
      playerOrder: newPlayerOrder,
      lapTimesLog: newLapTimesLog,
    };
    await updateGameState(newGameState);
    
    // Show success toast
    const playerName = players?.find(p => p.id === playerId)?.name || 'Piloto';
    addToast({
      type: 'success',
      title: 'Tiempos guardados',
      message: `Vuelta de ${playerName} registrada correctamente`
    });

  }, [activeGame, updateGameState, players, addToast]);


  const handleNextCircuit = () => {
    if (!activeGame) return;
    const gameState = activeGame.state;
    const nextCircuitIndex = gameState.currentCircuitIndex + 1;
    
    if (nextCircuitIndex >= gameState.settings.circuits.length) {
      handleGameEnd();
      return;
    }
    
     const newPlayerOrder = Object.entries(gameState.playerStats)
            .sort((a, b) => (b[1] as PlayerStats).totalScore - (a[1] as PlayerStats).totalScore)
            .map(([playerId]) => playerId);

    const newGameState = {
      ...gameState,
      currentCircuitIndex: nextCircuitIndex,
      currentTurn: 1,
      currentPlayerIndex: 0,
      playerOrder: newPlayerOrder
    };
    updateGameState(newGameState);
  };

  const handleGameEnd = async () => {
      if (!activeGame) return;
      const newGameState = {
        ...activeGame.state,
        currentCircuitIndex: activeGame.state.settings.circuits.length 
      };
      
      try {
        mutate('/api/game/active', { game: { ...activeGame, state: newGameState } }, false);
        await fetch(`/api/game/update`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: activeGame.id, state: newGameState, status: 'COMPLETED' })
        });
        mutate('/api/game/active');
        mutate('/api/game/history');
        setGamePhase('results');
        setActiveTab('results');
      } catch (err) {
        console.error('Failed to end game:', err)
      }
  };
  
  if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full border-4 border-slate-600 border-t-[#FF1801] h-16 w-16"></div>
            </div>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">Cargando F1 Night</h2>
            <p className="text-slate-400">Preparando la aplicación...</p>
          </div>
        </div>
      );
  }
  if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-100 mb-4">Error de Conexión</h1>
            <p className="text-slate-400 mb-6">
              No se pudieron cargar los datos. Verifica tu conexión e inténtalo de nuevo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#FF1801] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#E61601] transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
  }

  const renderContent = () => {
    switch (gamePhase) {
      case 'login':
        return <LoginScreen onLoginSuccess={handleLoginSuccess} pinCode={pinCode!} />;
      case 'hub':
        return <HubScreen onNewGame={handleNewGame} onAdmin={handleAdmin} />;
      case 'admin':
        return <AdminView players={players!} circuits={circuits!} onBack={handleExitAdmin} pinCode={pinCode!} />;
      case 'setup':
        return <GameSetup players={players!} circuits={circuits!} onSetupComplete={handleSetupComplete} onCancel={() => setGamePhase('hub')} />;
      case 'race':
      case 'results':
        if (activeGame && players && circuits) {
          const gameStateFromDB = activeGame.state;
          const isFinished = gameStateFromDB.currentCircuitIndex >= gameStateFromDB.settings.circuits.length;

          return (
            <div className="w-full">
                <div className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
                    <div className="max-w-7xl mx-auto px-4">
                        {/* Mobile Layout */}
                        <div className="flex md:hidden justify-between items-center py-3 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <img 
                                    src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
                                    alt="F1 Logo" 
                                    className="w-8 h-6 object-contain"
                                />
                                <h1 className="text-lg font-bold">F1 Night</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAdmin}
                                    className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                                    title="Admin Panel"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que quieres cancelar este juego? Todo el progreso se perderá.')) {
                                            handleCancelGame();
                                        }
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                    title="Cancelar Juego"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Mobile Tab Navigation */}
                        <div className="flex md:hidden justify-center py-2 border-b border-slate-700">
                            <div className="flex border border-slate-600 rounded-lg p-1">
                                <button 
                                    onClick={() => setActiveTab('race')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'race' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`} 
                                    disabled={isFinished}
                                >
                                    Carrera
                                </button>
                                <button 
                                    onClick={() => setActiveTab('progress')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'progress' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Progreso
                                </button>
                                <button 
                                    onClick={() => setActiveTab('results')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'results' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Resultados
                                </button>
                                <button
                                    onClick={handleAdmin}
                                    className="px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                                >
                                    Admin
                                </button>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:flex justify-between items-center py-3 border-b border-slate-700">
                             <div className="flex items-center gap-2">
                                <img 
                                    src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
                                    alt="F1 Logo" 
                                    className="w-10 h-8 object-contain"
                                />
                                <h1 className="text-xl font-bold">F1 Night</h1>
                            </div>
                            
                            {/* Center: Tab Navigation */}
                            <div className="flex border border-slate-600 rounded-lg p-1">
                                <button 
                                    onClick={() => setActiveTab('race')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'race' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`} 
                                    disabled={isFinished}
                                >
                                    Carrera
                                </button>
                                <button 
                                    onClick={() => setActiveTab('progress')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'progress' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Progreso
                                </button>
                                <button 
                                    onClick={() => setActiveTab('results')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'results' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Resultados
                                </button>
                            </div>
                            
                            {/* Right: Action Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleAdmin}
                                    className="px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors flex items-center gap-2"
                                    title="Admin Panel"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Admin</span>
                                </button>
                                
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que quieres cancelar este juego? Todo el progreso se perderá.')) {
                                            handleCancelGame();
                                        }
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                    title="Cancelar Juego"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <main className="mt-4">
                    {(activeTab === 'race' && !isFinished) && <RaceView gameState={gameStateFromDB} players={players} onTurnComplete={handleTurnComplete} onNextCircuit={handleNextCircuit} onGameEnd={handleGameEnd} />}
                    {activeTab === 'progress' && <div className="max-w-6xl mx-auto p-4"><RaceProgress gameState={gameStateFromDB} players={players} /></div>}
                    {activeTab === 'results' && <ResultsView gameState={gameStateFromDB} players={players} circuits={circuits} gameHistory={gameHistory || []} onNewGame={handleNewGame} />}
                    {isFinished && activeTab === 'race' && <div className="text-center p-8">Game is finished. Go to Results tab to see the final standings.</div>}
                </main>
            </div>
          );
        }
        return <div className="text-center p-8">Loading game... Please wait.</div>;
      default:
        return <div>Something went wrong</div>;
    }
  };

  return <div className="min-h-screen bg-slate-900 text-slate-50">{renderContent()}</div>;
}

export default App;
