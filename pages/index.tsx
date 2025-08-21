
import React, { useState, useCallback, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

import LandingPage from '../components/LandingPage';
import LoginScreen from '../components/LoginScreen';
import GameSetup from '../components/GameSetup';
import RaceView from '../components/RaceView';
import StatsView from '../components/StatsView';
import HubScreen from '../components/HubScreen';
import AdminView from '../components/AdminView';
import GameModify from '../components/GameModify';
import RaceProgress from '../components/RaceProgress';
import LivePage from '../components/LivePage';
import PlayerStatsComponent from '../components/PlayerStats';
import UserAvatar from '../components/UserAvatar';
import { GameSettings, GameState, PlayerStats, Circuit, Player, GameHistoryEntry, UserRole, UserSession } from '../types';
import { useTournament } from '../contexts/TournamentContext';
import TournamentSetup from '../components/TournamentSetup';
import TournamentStandings from '../components/TournamentStandings';
import TournamentManagement from '../components/TournamentManagement';

type GamePhase = 'landing' | 'login' | 'hub' | 'setup' | 'admin' | 'race' | 'results' | 'loading' | 'stats' | 'modify' | 'tournament-setup' | 'tournament-standings' | 'tournament-management';

// API data fetching hook
function useApiData() {
    const { data: players, error: playersError, isLoading: playersLoading } = useSWR<Player[]>('/api/players');
    const { data: circuits, error: circuitsError, isLoading: circuitsLoading } = useSWR<Circuit[]>('/api/circuits');
    const { data: activeGame, error: gameError, isLoading: gameLoading } = useSWR<{game: {id: string, state: GameState} | null}>('/api/game/active');
    const { data: settings, error: settingsError, isLoading: settingsLoading } = useSWR<{pin: string}>('/api/settings');
    const { data: history, error: historyError, isLoading: historyLoading } = useSWR<GameHistoryEntry[]>('/api/game/history');
    
    const isLoading = playersLoading || circuitsLoading || gameLoading || settingsLoading || historyLoading;
    const error = playersError || circuitsError || gameError || settingsError || historyError;

    // Debug logging
    console.log('API Debug:', {
        players: !!players,
        circuits: !!circuits,
        activeGame: !!activeGame,
        settings: !!settings,
        history: !!history,
        playersLoading,
        circuitsLoading,
        gameLoading,
        settingsLoading,
        historyLoading,
        isLoading,
        error
    });

    return { players, circuits, activeGame: activeGame?.game, pinCode: settings?.pin, gameHistory: history, isLoading, error };
}


function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('landing');
  const [activeTab, setActiveTab] = useState<'race' | 'puntaje' | 'stats' | 'live' | 'admin'>('race');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  const { mutate } = useSWRConfig();
  const { addToast } = useToast();
  const { players, circuits, activeGame, pinCode, gameHistory, isLoading, error } = useApiData();
  const { activeTournament, isInTournamentMode, currentChampionshipPosition } = useTournament();

  // Get current player data
  const currentPlayer = currentUser && players ? players.find(p => p.id === currentUser.userId || p.name === currentUser.name) : null;

  // Verificar sesión guardada al cargar
  useEffect(() => {
    if (isLoading) return; // Esperar a que termine de cargar
    
    const savedUser = localStorage.getItem('f1-user');
    if (savedUser) {
      try {
        const user: UserSession = JSON.parse(savedUser);
        setCurrentUser(user);
        
        if (activeGame && activeGame.state) {
          const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
          if (isFinished) {
            setGamePhase('results');
            setActiveTab('stats');
          } else {
            setGamePhase('race');
            setActiveTab('live');
          }
        } else {
          // No active game - players go directly to historical results, organizers to hub
          if (user.role === 'player') {
            setGamePhase('results');
            setActiveTab('stats'); // Show historical stats
          } else {
            setGamePhase('hub');
          }
        }
      } catch (e) {
        localStorage.removeItem('f1-user');
        setGamePhase('landing');
      }
    }
  }, [activeGame, isLoading]);

  // Polling para actualizaciones en tiempo real (cada 3 segundos)
  useEffect(() => {
    if (gamePhase === 'race' || gamePhase === 'results') {
      const interval = setInterval(() => {
        mutate('/api/game/active');
        // Also invalidate lap times live data to refresh LIVE tab
        mutate(key => typeof key === 'string' && key.includes('/api/lap-times/live'));
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [gamePhase, mutate]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setGamePhase('login');
  };

  const handleBackToLanding = () => {
    setSelectedRole(null);
    setGamePhase('landing');
  };

  const handleLoginSuccess = async (user: UserSession) => {
    setCurrentUser(user);
    
    // Guardar sesión en localStorage
    localStorage.setItem('f1-user', JSON.stringify(user));
    
    // Si hay un juego activo, agregar el usuario como espectador
    if (activeGame) {
      if (activeGame.state?.participantUsers) {
        const existingUser = activeGame.state.participantUsers.find(u => u.name === user.name);
        if (!existingUser) {
          const updatedParticipants = [...activeGame.state.participantUsers, { userId: user.userId, name: user.name, role: 'spectator' as const }];
          const updatedState = {
            ...activeGame.state,
            participantUsers: updatedParticipants
          };
          await updateGameState(updatedState);
        }
      }
      
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      if (isFinished) {
        // Game finished - both go to results
        setGamePhase('results');
        setActiveTab('stats');
      } else {
        // Active game - direct to race view
        if (user.role === 'spectator') {
          setGamePhase('race');
          setActiveTab('live'); // Spectators go directly to LIVE
        } else {
          setGamePhase('race');
          setActiveTab('live'); // Default to live view for better mobile UX
        }
      }
    } else {
      // No active game
      if (user.role === 'player') {
        setGamePhase('results');
        setActiveTab('stats'); // Show historical stats
      } else if (user.role === 'spectator') {
        setGamePhase('results');
        setActiveTab('stats'); // Spectators also go to results
      } else {
        setGamePhase('hub'); // Organizers go to hub
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('f1-user');
    setCurrentUser(null);
    setSelectedRole(null);
    setGamePhase('landing');
  };

  const handleSetupComplete = async (settings: GameSettings & { tournamentMode?: boolean }) => {
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

      // Create participant users based on all players
      const participantUsers = settings.players.map(player => ({
        userId: player.id,
        name: player.name,
        role: settings.controllerIds.includes(player.id) ? 'controller' as const : 'spectator' as const
      }));

      // Set initial controller to the first controller in the list, or current user if they're a controller
      const initialController = settings.controllerIds.includes(currentUser!.userId) 
        ? currentUser!.userId 
        : settings.controllerIds[0];

      const newGameState: GameState = {
        settings,
        circuits: settings.circuits,
        playerOrder: settings.players.map(p => p.id),
        currentCircuitIndex: 0,
        currentTurn: 1,
        currentPlayerIndex: 0,
        circuitResults: Array(settings.circuits.length).fill(null).map((_, i) => ({ circuitId: settings.circuits[i].id, turns: [] })),
        playerStats,
        sessionBestLap: null,
        sessionBestAverage: null,
        // Initialize per-circuit session tracking
        sessionBestTimes: settings.circuits.reduce((acc, circuit) => {
          acc[circuit.id] = {
            bestLap: null,
            bestLapPlayerId: null,
            bestAverage: null,
            bestAveragePlayerId: null
          };
          return acc;
        }, {} as Record<string, { bestLap: number | null; bestLapPlayerId: string | null; bestAverage: number | null; bestAveragePlayerId: string | null; }>),
        lapTimesLog: [],
        currentController: initialController,
        participantUsers,
      };
      
      // Check if we're in tournament mode AND user chose tournament mode
      if (isInTournamentMode && activeTournament && settings.tournamentMode) {
        // Create a championship within the tournament
        const championshipResponse = await fetch(`/api/tournaments/${activeTournament.id}/championships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Campeonato ${currentChampionshipPosition}`,
            gameState: {
              ...newGameState,
              tournamentId: activeTournament.id,
              championshipPosition: currentChampionshipPosition
            }
          })
        });

        if (!championshipResponse.ok) {
          throw new Error('Failed to create championship');
        }

        const { championship } = await championshipResponse.json();
        
        // Create the game with tournament info
        const response = await fetch('/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            state: {
              ...newGameState,
              tournamentId: activeTournament.id,
              championshipId: championship.id,
              championshipName: championship.name,
              championshipPosition: currentChampionshipPosition
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create game');
        }

        addToast({
          type: 'success',
          title: '🏆 ¡Campeonato de Torneo creado!',
          message: `${championship.name} del ${activeTournament.name} iniciado - Los puntos contarán para el torneo`
        });
      } else {
        // Normal game creation (not in tournament)
        const response = await fetch('/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: newGameState }),
        });

        if (!response.ok) {
          throw new Error('Failed to create game');
        }

        const title = isInTournamentMode ? '🎮 ¡Campeonato Individual creado!' : '¡Campeonato creado!';
        const message = isInTournamentMode 
          ? `Campeonato de práctica iniciado - No afecta el torneo activo`
          : `Carrera iniciada con ${settings.players.length} pilotos`;
          
        addToast({
          type: 'success',
          title,
          message
        });
      }

      await mutate('/api/game/active');
      setGamePhase('race');
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
  
  const handleAdmin = () => setActiveTab('admin');
  const handleGameModify = () => setGamePhase('modify');
  const handleExitAdmin = () => {
    if (activeGame) {
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      setGamePhase(isFinished ? 'results' : 'race');
      setActiveTab(isFinished ? 'stats' : 'race');
    } else {
      setGamePhase('hub');
    }
  };
  
  const handleExitModify = () => {
    if (activeGame) {
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      setGamePhase(isFinished ? 'results' : 'race');
      setActiveTab(isFinished ? 'stats' : 'race');
    } else {
      setGamePhase('hub');
    }
  };

  // Tournament handlers
  const handleTournamentSetup = () => setGamePhase('tournament-setup');
  const handleTournamentStandings = () => setGamePhase('tournament-standings');
  const handleTournamentManagement = () => setGamePhase('tournament-management');
  
  const handleTournamentCreated = () => {
    addToast({
      type: 'success',
      title: '¡Torneo creado!',
      message: 'El torneo se ha creado exitosamente'
    });
    setGamePhase('hub');
  };

  const handleTournamentUpdated = async () => {
    // Refresh tournament data
    await mutate('/api/tournaments/active');
    
    addToast({
      type: 'success',
      title: 'Torneo actualizado',
      message: 'El estado del torneo ha sido modificado'
    });
    setGamePhase('hub');
  };

  const handleBackFromTournament = () => {
    setGamePhase('hub');
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

  const handleTurnComplete = useCallback(async (playerId: string, lapTimes: number[], newControllerId?: string) => {
    if (!activeGame) return;
    const gameState = activeGame.state;
    
    // Si solo es para transferir control (sin nuevos lap times)
    if (lapTimes.length === 0 && newControllerId) {
      const updatedState = {
        ...gameState,
        currentController: newControllerId
      };
      await updateGameState(updatedState);
      return;
    }
    
    // Update global session bests (for backward compatibility)
    let newSessionBestLap = gameState.sessionBestLap;
    lapTimes.forEach(time => {
        if(newSessionBestLap === null || time < newSessionBestLap) newSessionBestLap = time;
    });

    const timesToAverage = (gameState.settings.lapsPerTurn === 5 && gameState.settings.useBest4Of5Laps)
        ? [...lapTimes].sort((a,b) => a - b).slice(0, 4)
        : lapTimes;
    
    const averageTime = Math.round(timesToAverage.reduce((a, b) => a + b, 0) / timesToAverage.length);
    
    let newSessionBestAverage = gameState.sessionBestAverage;
    if (newSessionBestAverage === null || averageTime < newSessionBestAverage) {
        newSessionBestAverage = averageTime;
    }

    // Update per-circuit session bests
    const currentCircuitId = gameState.circuits[gameState.currentCircuitIndex].id;
    const newSessionBestTimes = { ...gameState.sessionBestTimes };
    
    if (!newSessionBestTimes[currentCircuitId]) {
        newSessionBestTimes[currentCircuitId] = {
            bestLap: null,
            bestLapPlayerId: null,
            bestAverage: null,
            bestAveragePlayerId: null
        };
    }
    
    // Check if this is a new circuit-specific session best lap
    const currentCircuitBests = newSessionBestTimes[currentCircuitId];
    const fastestLapThisTurn = Math.min(...lapTimes);
    
    if (currentCircuitBests.bestLap === null || fastestLapThisTurn < currentCircuitBests.bestLap) {
        currentCircuitBests.bestLap = fastestLapThisTurn;
        currentCircuitBests.bestLapPlayerId = playerId;
    }
    
    // Check if this is a new circuit-specific session best average
    if (currentCircuitBests.bestAverage === null || averageTime < currentCircuitBests.bestAverage) {
        currentCircuitBests.bestAverage = averageTime;
        currentCircuitBests.bestAveragePlayerId = playerId;
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

        // Award bonus points for best lap and best average if configured for 'turn' or 'both'
        const { pointsForBestLap, pointsForBestAverage, awardBestTimeFor } = gameState.settings;
        if (awardBestTimeFor === 'turn' || awardBestTimeFor === 'both') {
            // Best lap bonus
            if (pointsForBestLap > 0) {
                const playerBests = turnResults.map(tr => ({
                    playerId: tr.playerId,
                    bestLap: Math.min(...tr.lapTimes)
                }));
                const bestLapPlayer = playerBests.reduce((best, current) => 
                    current.bestLap < best.bestLap ? current : best
                );
                
                newPlayerStats[bestLapPlayer.playerId].totalScore += pointsForBestLap;
                newPlayerStats[bestLapPlayer.playerId].bestLaps += 1;
                
                // Add bonus to turn score display
                const bestLapResult = turnResults.find(r => r.playerId === bestLapPlayer.playerId);
                if (bestLapResult) {
                    bestLapResult.turnScore += pointsForBestLap;
                }
            }

            // Best average bonus
            if (pointsForBestAverage > 0) {
                const bestAveragePlayer = turnResults.reduce((best, current) => 
                    (current.averageTime ?? Infinity) < (best.averageTime ?? Infinity) ? current : best
                );
                
                if (bestAveragePlayer.averageTime !== undefined) {
                    newPlayerStats[bestAveragePlayer.playerId].totalScore += pointsForBestAverage;
                    newPlayerStats[bestAveragePlayer.playerId].bestAverages += 1;
                    bestAveragePlayer.turnScore += pointsForBestAverage;
                }
            }
        }
        
        finalPlayerStats = newPlayerStats;
        nextPlayerIndex = 0;
        nextTurn = gameState.currentTurn + 1;

        // Calculate current circuit standings for turn order
        const currentCircuitResults = newCircuitResults[gameState.currentCircuitIndex];
        const circuitStandings = new Map<string, number>();
        
        // Initialize all players with 0 points for this circuit
        gameState.settings.players.forEach(player => {
            circuitStandings.set(player.id, 0);
        });
        
        // Sum up points from all turns completed in current circuit
        if (currentCircuitResults && currentCircuitResults.turns.length > 0) {
            currentCircuitResults.turns.forEach(turn => {
                turn.forEach(result => {
                    const currentPoints = circuitStandings.get(result.playerId) || 0;
                    circuitStandings.set(result.playerId, currentPoints + result.turnScore);
                });
            });
        }
        
        // Sort players by current circuit points (for turn order)
        newPlayerOrder = Array.from(circuitStandings.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by circuit points descending
            .map(([playerId]) => playerId);
    }
    
    const newGameState = {
      ...gameState,
      circuitResults: newCircuitResults,
      sessionBestLap: newSessionBestLap,
      sessionBestAverage: newSessionBestAverage,
      sessionBestTimes: newSessionBestTimes,
      playerStats: finalPlayerStats,
      currentPlayerIndex: nextPlayerIndex,
      currentTurn: nextTurn,
      playerOrder: newPlayerOrder,
      lapTimesLog: newLapTimesLog,
      currentController: newControllerId || gameState.currentController,
    };
    
    // Update historical records if new records were set
    const currentCircuit = gameState.circuits[gameState.currentCircuitIndex];
    const fastestLap = Math.min(...lapTimes);
    
    try {
      await fetch('/api/circuits/update-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circuitId: currentCircuit.id,
          bestLap: fastestLap,
          bestAverage: averageTime,
          bestLapPlayerId: playerId,
          bestAveragePlayerId: playerId
        })
      });
      
      // Refresh circuits data to get updated historical records
      mutate('/api/circuits');
    } catch (error) {
      console.error('Failed to update historical records:', error);
    }
    
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
    
    // Award circuit-level bonus points if configured for 'circuit' or 'both'
    const updatedPlayerStats = { ...gameState.playerStats };
    const { pointsForBestLap, pointsForBestAverage, awardBestTimeFor } = gameState.settings;
    
    if (awardBestTimeFor === 'circuit' || awardBestTimeFor === 'both') {
        const currentCircuitResults = gameState.circuitResults[gameState.currentCircuitIndex];
        if (currentCircuitResults) {
            // Collect all lap times and averages from this circuit
            const allLapTimes: { playerId: string; lapTime: number }[] = [];
            const allAverages: { playerId: string; averageTime: number }[] = [];
            
            currentCircuitResults.turns.forEach(turn => {
                turn.forEach(result => {
                    // Add individual lap times
                    result.lapTimes.forEach(lapTime => {
                        allLapTimes.push({ playerId: result.playerId, lapTime });
                    });
                    
                    // Add average times
                    if (result.averageTime !== undefined) {
                        allAverages.push({ playerId: result.playerId, averageTime: result.averageTime });
                    }
                });
            });
            
            // Award best lap bonus for the entire circuit
            if (pointsForBestLap > 0 && allLapTimes.length > 0) {
                const bestLapRecord = allLapTimes.reduce((best, current) => 
                    current.lapTime < best.lapTime ? current : best
                );
                updatedPlayerStats[bestLapRecord.playerId].totalScore += pointsForBestLap;
                updatedPlayerStats[bestLapRecord.playerId].bestLaps += 1;
            }
            
            // Award best average bonus for the entire circuit
            if (pointsForBestAverage > 0 && allAverages.length > 0) {
                const bestAverageRecord = allAverages.reduce((best, current) => 
                    current.averageTime < best.averageTime ? current : best
                );
                updatedPlayerStats[bestAverageRecord.playerId].totalScore += pointsForBestAverage;
                updatedPlayerStats[bestAverageRecord.playerId].bestAverages += 1;
            }
        }
    }

     const newPlayerOrder = Object.entries(updatedPlayerStats)
            .sort((a, b) => (b[1] as PlayerStats).totalScore - (a[1] as PlayerStats).totalScore)
            .map(([playerId]) => playerId);

    const newGameState = {
      ...gameState,
      currentCircuitIndex: nextCircuitIndex,
      currentTurn: 1,
      currentPlayerIndex: 0,
      playerOrder: newPlayerOrder,
      playerStats: updatedPlayerStats
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
        
        // Update the game as completed
        await fetch(`/api/game/update`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: activeGame.id, state: newGameState, status: 'COMPLETED' })
        });

        // If this game is part of a tournament, award tournament points
        const gameState = activeGame.state as any;
        if (gameState.tournamentId && gameState.championshipId) {
          addToast({
            type: 'info',
            title: 'Procesando puntos de torneo...',
            message: 'Calculando resultados del campeonato'
          });

          // Calculate final results for tournament points
          const playerStats = newGameState.playerStats;
          const finalResults = Object.entries(playerStats)
            .sort((a, b) => (b[1] as PlayerStats).totalScore - (a[1] as PlayerStats).totalScore)
            .map(([playerId, stats], index) => ({
              playerId,
              position: index + 1,
              totalScore: (stats as PlayerStats).totalScore
            }));

          // Complete the championship and award points
          const championshipResponse = await fetch(`/api/championships/${gameState.championshipId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameState: newGameState,
              finalResults
            })
          });

          if (championshipResponse.ok) {
            const tournamentData = await championshipResponse.json();
            
            addToast({
              type: 'success',
              title: 'Puntos de torneo otorgados',
              message: `Campeonato completado en ${gameState.tournamentName || 'Torneo'}`
            });

            // Check if tournament is completed
            if (tournamentData.tournament?.isCompleted) {
              addToast({
                type: 'success',
                title: '🏆 ¡Torneo completado!',
                message: `El ${gameState.tournamentName || 'Torneo'} ha finalizado`
              });
            }
          } else {
            addToast({
              type: 'warning',
              title: 'Error en puntos de torneo',
              message: 'El juego se completó pero hubo un problema con los puntos del torneo'
            });
          }
        }

        mutate('/api/game/active');
        mutate('/api/game/history');
        setGamePhase('results');
        setActiveTab('stats');
      } catch (err) {
        console.error('Failed to end game:', err);
        addToast({
          type: 'error',
          title: 'Error al finalizar',
          message: 'Hubo un problema al terminar el juego'
        });
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
      case 'landing':
        return <LandingPage onRoleSelect={handleRoleSelect} />;
      case 'login':
        return selectedRole && <LoginScreen 
          selectedRole={selectedRole} 
          onLoginSuccess={handleLoginSuccess} 
          onBack={handleBackToLanding}
        />;
      case 'hub':
        return <HubScreen 
          onNewGame={handleNewGame} 
          onAdmin={handleAdmin} 
          currentUser={currentUser} 
          onLogout={handleLogout}
          onViewStats={handleBackToLanding}
          onTournamentSetup={handleTournamentSetup}
          onTournamentStandings={handleTournamentStandings}
          onTournamentManagement={handleTournamentManagement}
        />;
      case 'setup':
        return <GameSetup players={players!} circuits={circuits!} onSetupComplete={handleSetupComplete} onCancel={() => setGamePhase('hub')} />;
      case 'modify':
        if (activeGame && activeGame.state && players && circuits) {
          return (
            <div className="w-full">
              <div className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
                <div className="max-w-7xl mx-auto px-4">
                  {/* Mobile Layout */}
                  <div className="flex md:hidden justify-between items-center py-3 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                        alt="F1 Logo" 
                        className="w-8 h-6 object-contain"
                      />
                      <h1 className="text-lg font-bold">F1 Night</h1>
                      <span className="text-sm text-slate-400 ml-2">/ Modificar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExitModify}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                        title="Volver"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex justify-between items-center py-3 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                        alt="F1 Logo" 
                        className="w-10 h-8 object-contain"
                      />
                      <h1 className="text-xl font-bold">F1 Night</h1>
                      {isInTournamentMode && activeTournament && (
                        <span className="bg-amber-700 text-white text-sm font-bold px-2 py-1 rounded ml-2">
                          TORNEO
                        </span>
                      )}
                      <span className="text-lg text-slate-400 ml-2">/ Modificar Campeonato</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleExitModify}
                        className="px-4 py-2 bg-slate-700 text-slate-100 font-bold rounded hover:bg-slate-600 transition-colors"
                      >
                        Volver
                      </button>
                      <UserAvatar
                        imageUrl={currentPlayer?.imageUrl}
                        name={currentPlayer?.name || currentUser?.name}
                        className="w-8 h-8"
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                            handleLogout();
                          }
                        }}
                        title="Cerrar Sesión"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <GameModify gameState={activeGame.state} players={players} circuits={circuits} gameId={activeGame.id} onBack={handleExitModify} onCancelGame={handleCancelGame} />
            </div>
          );
        }
        return <div>No hay campeonato activo para modificar</div>;
      case 'race':
      case 'results':
        // Always show navigation, even without active game
        if (players && circuits) {
          const gameStateFromDB = activeGame?.state;
          const isFinished = gameStateFromDB ? gameStateFromDB.currentCircuitIndex >= gameStateFromDB.settings.circuits.length : true;

          return (
            <div className="w-full">
                <div className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
                    <div className="max-w-7xl mx-auto px-4">
                        {/* Mobile Layout */}
                        <div className="flex md:hidden justify-between items-center py-3 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <img 
                                    src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                                    alt="F1 Logo" 
                                    className="w-8 h-6 object-contain"
                                />
                                <h1 className="text-lg font-bold">F1 Night</h1>
                                {isInTournamentMode && activeTournament && (
                                  <span className="bg-amber-700 text-white text-xs font-bold px-2 py-1 rounded">
                                    TORNEO
                                  </span>
                                )}
                                <button
                                    onClick={handleGameModify}
                                    className="p-1 text-f1-red hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors ml-2"
                                    title="Modificar Campeonato"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserAvatar
                                    imageUrl={currentPlayer?.imageUrl}
                                    name={currentPlayer?.name || currentUser?.name}
                                    className="w-7 h-7"
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                                            handleLogout();
                                        }
                                    }}
                                    title="Cerrar Sesión"
                                />
                            </div>
                        </div>
                        
                        {/* Mobile Tab Navigation */}
                        <div className="flex md:hidden justify-center py-2 border-b border-slate-700">
                            <div className="flex border border-slate-600 rounded-lg p-1 overflow-x-auto">
                                {/* Registro - Solo para jugadores y organizadores */}
                                {currentUser?.role !== 'spectator' && (
                                    <button 
                                        onClick={() => setActiveTab('race')} 
                                        className={`px-2 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${activeTab === 'race' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`} 
                                        disabled={isFinished}
                                    >
                                        Registro
                                    </button>
                                )}
                                <button 
                                    onClick={() => setActiveTab('live')} 
                                    className={`px-2 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${activeTab === 'live' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    LIVE
                                </button>
                                <button 
                                    onClick={() => setActiveTab('puntaje')} 
                                    className={`px-2 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${activeTab === 'puntaje' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Puntaje
                                </button>
                                <button 
                                    onClick={() => setActiveTab('stats')} 
                                    className={`px-2 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    STATS
                                </button>
                                {/* Admin - Solo para organizadores */}
                                {currentUser?.role === 'organizer' && (
                                    <button
                                        onClick={handleAdmin}
                                        className={`px-2 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
                                    >
                                        Admin
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:flex justify-between items-center py-3 border-b border-slate-700">
                             <div className="flex items-center gap-2">
                                <img 
                                    src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
                                    alt="F1 Logo" 
                                    className="w-10 h-8 object-contain"
                                />
                                <h1 className="text-xl font-bold">F1 Night</h1>
                                {isInTournamentMode && activeTournament && (
                                  <span className="bg-amber-700 text-white text-sm font-bold px-2 py-1 rounded ml-2">
                                    TORNEO
                                  </span>
                                )}
                                {/* Gear icon - Solo para organizadores */}
                                {currentUser?.role === 'organizer' && (
                                    <button
                                        onClick={handleGameModify}
                                        className="p-2 text-f1-red hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors ml-2"
                                        title="Modificar Campeonato"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            
                            {/* Center: Tab Navigation */}
                            <div className="flex border border-slate-600 rounded-lg p-1">
                                {/* Registro - Solo para jugadores y organizadores */}
                                {currentUser?.role !== 'spectator' && (
                                    <button 
                                        onClick={() => setActiveTab('race')} 
                                        className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'race' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`} 
                                        disabled={isFinished}
                                    >
                                        Registro
                                    </button>
                                )}
                                <button 
                                    onClick={() => setActiveTab('live')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'live' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    LIVE
                                </button>
                                <button 
                                    onClick={() => setActiveTab('puntaje')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'puntaje' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Puntaje
                                </button>
                                <button 
                                    onClick={() => setActiveTab('stats')} 
                                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'stats' ? 'bg-[#FF1801] text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    STATS
                                </button>
                            </div>
                            
                            {/* Right: Action Buttons */}
                            <div className="flex items-center gap-3">
                                <UserAvatar
                                    imageUrl={currentPlayer?.imageUrl}
                                    name={currentPlayer?.name}
                                    className="w-8 h-8"
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                                            handleLogout();
                                        }
                                    }}
                                    title="Cerrar Sesión"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <main className="mt-4">
                    {gameStateFromDB ? (
                        <>
                            {(activeTab === 'race' && !isFinished) && <RaceView gameState={gameStateFromDB} players={players} gameId={activeGame!.id} onTurnComplete={handleTurnComplete} onNextCircuit={handleNextCircuit} onGameEnd={handleGameEnd} currentUser={currentUser!} />}
                            {activeTab === 'live' && <LivePage gameState={gameStateFromDB} players={players} circuits={circuits} gameId={activeGame!.id} />}
                            {activeTab === 'puntaje' && <div className="max-w-6xl mx-auto p-4"><RaceProgress gameState={gameStateFromDB} players={players} /></div>}
                            {activeTab === 'stats' && <StatsView gameState={gameStateFromDB} players={players} circuits={circuits} gameHistory={gameHistory || []} onNewGame={handleNewGame} />}
                            {activeTab === 'admin' && <AdminView players={players} circuits={circuits} />}
                            {isFinished && activeTab === 'race' && <div className="text-center p-8">Game is finished. Go to STATS tab to see the final standings.</div>}
                        </>
                    ) : (
                        // No active game - show historical stats or admin
                        <>
                            {activeTab === 'stats' && (
                                <StatsView 
                                    gameState={{
                                        settings: { name: 'Estadísticas Históricas', circuits: [], players: [] },
                                        currentCircuitIndex: 0,
                                        playerStats: {},
                                        circuitResults: []
                                    } as any} 
                                    players={players} 
                                    circuits={circuits} 
                                    gameHistory={gameHistory || []} 
                                    onNewGame={handleNewGame} 
                                />
                            )}
                            {activeTab === 'admin' && <AdminView players={players} circuits={circuits} />}
                            {(activeTab === 'race' || activeTab === 'live' || activeTab === 'puntaje') && (
                                <div className="text-center p-8">
                                    <p className="text-xl text-zinc-400 mb-4">No hay campeonato activo</p>
                                    {currentUser?.role === 'organizer' && (
                                        <button 
                                            onClick={handleNewGame}
                                            className="px-6 py-3 bg-[#FF1801] text-white font-bold rounded hover:bg-red-700 transition-colors"
                                        >
                                            Crear Campeonato
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
          );
        }
        
        return <div className="text-center p-8">Loading game... Please wait.</div>;
      case 'tournament-setup':
        return <TournamentSetup 
          players={players!} 
          onTournamentCreated={handleTournamentCreated}
          onCancel={handleBackFromTournament}
        />;
      case 'tournament-standings':
        return activeTournament ? (
          <TournamentStandings 
            tournamentId={activeTournament.id}
            onBack={handleBackFromTournament}
          />
        ) : (
          <div className="text-center p-8">No active tournament found</div>
        );
      case 'tournament-management':
        return activeTournament ? (
          <TournamentManagement 
            tournament={activeTournament}
            onTournamentUpdated={handleTournamentUpdated}
            onClose={handleBackFromTournament}
          />
        ) : (
          <div className="text-center p-8">No active tournament found</div>
        );
      default:
        return <div>Something went wrong</div>;
    }
  };

  return <div className="min-h-screen bg-f1-black text-primary">{renderContent()}</div>;
}

export default App;
