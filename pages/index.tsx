
import React, { useState, useCallback, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

import LandingPage from '../components/LandingPage';
import LoginScreen from '../components/LoginScreen';
import GameSetup from '../components/GameSetup';
import ModernGameSetup from '../components/ModernGameSetup';
import RaceView from '../components/RaceView';
import AdminHub from '../components/AdminHub';
import AdminView from '../components/AdminView';
import F1AdminLayout from '../components/F1AdminLayout';
import GameModify from '../components/GameModify';
import RaceProgress from '../components/RaceProgress';
import LivePage from '../components/LivePage';
import TimesPage from '../components/TimesPage';
import ResultadosPage from '../components/ResultadosPage';
import PlayerStatsComponent from '../components/PlayerStats';
import UserAvatar from '../components/UserAvatar';
import F1Layout from '../components/F1Layout';
import { GameSettings, GameState, PlayerStats, Circuit, Player, GameHistoryEntry, UserRole, UserSession } from '../types';
import { useTournament } from '../contexts/TournamentContext';
import TournamentSetup from '../components/TournamentSetup';
import TournamentStandings from '../components/TournamentStandings';
import TournamentManagement from '../components/TournamentManagement';

type GamePhase = 'landing' | 'login' | 'hub' | 'setup' | 'admin' | 'race' | 'results' | 'loading' | 'modify' | 'tournament-setup' | 'tournament-standings' | 'tournament-management';

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
  const [gamePhase, setGamePhase] = useState<GamePhase>('landing');
  const [activeTab, setActiveTab] = useState<'race' | 'puntaje' | 'live' | 'admin' | 'tiempos' | 'resultados'>('race');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  const { mutate } = useSWRConfig();
  const { addToast } = useToast();
  const { players, circuits, activeGame, pinCode, gameHistory, isLoading, error } = useApiData();
  const { activeTournament, isInTournamentMode, currentChampionshipPosition, refreshTournament } = useTournament();

  // Get current player data
  const currentPlayer = currentUser && players ? players.find(p => p.id === currentUser.userId || p.name === currentUser.name) : null;
  
  // Helper function to check if user has admin privileges
  const hasAdminPrivileges = (user: UserSession | null): boolean => {
    if (!user) return false;
    if (user.role === 'organizer') return true;
    // Grant admin privileges to Juan, Berna, and BlackMamba
    return user.name === 'Juan' || user.name === 'Berna' || user.name === 'BlackMamba';
  };

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
            setActiveTab('resultados');
          } else {
            setGamePhase('race');
            setActiveTab('live');
          }
        } else {
          // No active game - all users go to results view (championship results)
          setGamePhase('results');
          setActiveTab('resultados'); // Show championship results
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
        setActiveTab('resultados');
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
        setActiveTab('resultados'); // Show historical results
      } else if (user.role === 'spectator') {
        setGamePhase('results');
        setActiveTab('resultados'); // Spectators also go to results
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

  const handleStartQuickRace = async (selectedPlayers: Player[], selectedCircuits: Circuit[]) => {
    try {
      addToast({
        type: 'info',
        title: 'Iniciando Quick Race...',
        message: 'Configurando carrera rápida'
      });

      // Close any existing active game before starting Quick Race
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
          console.error("Failed to close existing game", err);
        }
      }

      // Quick Race settings based on ModernGameSetup preset
      const quickRaceSettings: GameSettings & { tournamentMode?: boolean } = {
        players: selectedPlayers,
        circuits: selectedCircuits,
        controllerIds: selectedPlayers.map(p => p.id), // All players can control
        lapsPerTurn: 3,
        turnsPerCircuit: 2,
        scoringMethod: 'average',
        scoringMultiplier: null, // No multiplier for Quick Race
        pointsForBestLap: 2, // VR bonus
        pointsForBestAverage: 0, // No PR bonus as requested
        awardBestTimeFor: 'turn',
        useBest4Of5Laps: false, // Use all laps for 3 lap turns
        tournamentMode: false
      };

      const playerStats: Record<string, PlayerStats> = {};
      selectedPlayers.forEach(p => {
        playerStats[p.id] = { totalScore: 0, bestLaps: 0, bestAverages: 0 };
      });

      // Create participant users based on selected players
      const participantUsers = selectedPlayers.map(player => ({
        userId: player.id,
        name: player.name,
        role: 'controller' as const // All players are controllers in Quick Race
      }));

      // Set initial controller to current user if they're playing, or first player
      const initialController = selectedPlayers.find(p => p.id === currentUser?.userId)?.id || selectedPlayers[0].id;

      const newGameState: GameState = {
        settings: quickRaceSettings,
        circuits: selectedCircuits,
        playerOrder: selectedPlayers.map(p => p.id),
        currentCircuitIndex: 0,
        currentTurn: 1,
        currentPlayerIndex: 0,
        circuitResults: selectedCircuits.map(circuit => ({ circuitId: circuit.id, turns: [] })),
        playerStats,
        sessionBestLap: null,
        sessionBestAverage: null,
        sessionBestTimes: selectedCircuits.reduce((acc, circuit) => {
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

      // Create the game (not in tournament mode)
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newGameState }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Quick Race');
      }

      addToast({
        type: 'success',
        title: '🏁 ¡Quick Race iniciado!',
        message: `Carrera con ${selectedPlayers.length} pilotos en ${selectedCircuits.length} circuitos`
      });

      // Refresh active game and navigate to race
      await mutate('/api/game/active');
      setGamePhase('race');
      setActiveTab('live'); // Go directly to live timing
    } catch(err) {
      console.error("Failed to create Quick Race", err);
      addToast({
        type: 'error',
        title: 'Error al crear Quick Race',
        message: 'No se pudo iniciar la carrera rápida. Inténtalo de nuevo.'
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
  
  const handleAdmin = () => {
    setGamePhase('admin');
  };

  const handleBackToLive = () => {
    setGamePhase(activeGame ? 'race' : 'results');
    setActiveTab('live');
  };
  const handleGameModify = () => setGamePhase('modify');
  const handleExitAdmin = () => {
    if (activeGame) {
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      setGamePhase(isFinished ? 'results' : 'race');
      setActiveTab(isFinished ? 'resultados' : 'race');
    } else {
      setGamePhase('hub');
    }
  };
  
  const handleExitModify = () => {
    if (activeGame) {
      const isFinished = activeGame.state.currentCircuitIndex >= activeGame.state.settings.circuits.length;
      setGamePhase(isFinished ? 'results' : 'race');
      setActiveTab(isFinished ? 'resultados' : 'race');
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
    await refreshTournament();
    
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
        // Only consider valid lap times (not penalty times)
        if(time < 120000 && (newSessionBestLap === null || time < newSessionBestLap)) {
            newSessionBestLap = time;
        }
    });

    // Filter out penalty times (120 seconds = 120000ms)
    const validLapTimes = lapTimes.filter(time => time < 120000);
    
    const timesToAverage = (gameState.settings.lapsPerTurn === 5 && gameState.settings.useBest4Of5Laps && validLapTimes.length >= 4)
        ? [...validLapTimes].sort((a,b) => a - b).slice(0, 4)
        : validLapTimes;
    
    const averageTime = timesToAverage.length > 0 
        ? Math.round(timesToAverage.reduce((a, b) => a + b, 0) / timesToAverage.length)
        : 120000; // If no valid times, use penalty time as average
    
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
    const validLapsForBest = lapTimes.filter(time => time < 120000);
    const fastestLapThisTurn = validLapsForBest.length > 0 ? Math.min(...validLapsForBest) : null;
    
    if (fastestLapThisTurn !== null && (currentCircuitBests.bestLap === null || fastestLapThisTurn < currentCircuitBests.bestLap)) {
        currentCircuitBests.bestLap = fastestLapThisTurn;
        currentCircuitBests.bestLapPlayerId = playerId;
    }
    
    // Check if this is a new circuit-specific session best average
    if (averageTime < 120000 && (currentCircuitBests.bestAverage === null || averageTime < currentCircuitBests.bestAverage)) {
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
    
    // Helper function to calculate standings for turn order
    const calculateCircuitStandings = (circuitResults: any[], currentCircuitIndex: number, players: any[], useOverallStandings: boolean = false) => {
        if (useOverallStandings) {
            // Use total accumulated points (for first turn of new circuit)
            return Object.entries(finalPlayerStats)
                .sort((a, b) => (b[1] as any).totalScore - (a[1] as any).totalScore)
                .map(([playerId]) => playerId);
        }

        // Use current circuit points (for subsequent turns in same circuit)
        const currentCircuitResults = circuitResults[currentCircuitIndex];
        const circuitStandings = new Map<string, number>();

        // Initialize all players with 0 points for this circuit
        players.forEach((player: any) => {
            circuitStandings.set(player.id, 0);
        });

        // Sum up points from all turns completed in current circuit
        if (currentCircuitResults && currentCircuitResults.turns.length > 0) {
            currentCircuitResults.turns.forEach((turn: any) => {
                turn.forEach((result: any) => {
                    const currentPoints = circuitStandings.get(result.playerId) || 0;
                    circuitStandings.set(result.playerId, currentPoints + result.turnScore);
                });
            });
        }

        // Sort players by current circuit points (for turn order)
        return Array.from(circuitStandings.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by circuit points descending
            .map(([playerId]) => playerId);
    };

    if (isLastPlayerOfTurn) {
        const turnResults = newCircuitResults[gameState.currentCircuitIndex].turns[gameState.currentTurn - 1];
        const newPlayerStats: Record<string, PlayerStats> = JSON.parse(JSON.stringify(gameState.playerStats));
        const { scoringMethod, scoringMultiplier } = gameState.settings;

        const getPoints = (rank: number, totalPlayers: number): number => {
            // Only award positions that exist
            if (rank === 0) return 3;
            if (rank === 1 && totalPlayers >= 2) return 2;
            if (rank === 2 && totalPlayers >= 3) return 1;
            return 0;
        };

        const pointsThisTurn = new Map<string, number>();
        gameState.settings.players.forEach(p => pointsThisTurn.set(p.id, 0));
        
        turnResults.forEach(r => r.turnScore = 0);

        if (scoringMethod === 'average' || scoringMethod === 'both') {
            const sortedByAverage = [...turnResults].sort((a, b) => (a.averageTime ?? Infinity) - (b.averageTime ?? Infinity));
            const totalPlayers = sortedByAverage.length;
            sortedByAverage.forEach((result, rank) => {
                let points = getPoints(rank, totalPlayers);
                if (scoringMethod === 'both' && scoringMultiplier?.appliesTo === 'average') {
                    points *= scoringMultiplier.factor;
                }
                pointsThisTurn.set(result.playerId, (pointsThisTurn.get(result.playerId) || 0) + points);
            });
        }

        if (scoringMethod === 'lap' || scoringMethod === 'both') {
            const playerBests = turnResults.map(tr => {
                const validLaps = tr.lapTimes.filter(time => time < 120000);
                return {
                    playerId: tr.playerId,
                    bestLap: validLaps.length > 0 ? Math.min(...validLaps) : 120000
                };
            });
            const sortedByLap = playerBests.sort((a, b) => a.bestLap - b.bestLap);
            const totalPlayers = sortedByLap.length;
            
            sortedByLap.forEach((lapResult, rank) => {
                let points = getPoints(rank, totalPlayers);
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
                const playerBests = turnResults.map(tr => {
                    const validLaps = tr.lapTimes.filter(time => time < 120000);
                    return {
                        playerId: tr.playerId,
                        bestLap: validLaps.length > 0 ? Math.min(...validLaps) : 120000
                    };
                });
                const bestLapPlayer = playerBests.reduce((best, current) => 
                    current.bestLap < best.bestLap ? current : best
                );
                
                // Only award bonus if the best lap is not a penalty time
                if (bestLapPlayer.bestLap < 120000) {
                    newPlayerStats[bestLapPlayer.playerId].totalScore += pointsForBestLap;
                    newPlayerStats[bestLapPlayer.playerId].bestLaps += 1;
                    
                    // Add bonus to turn score display
                    const bestLapResult = turnResults.find(r => r.playerId === bestLapPlayer.playerId);
                    if (bestLapResult) {
                        bestLapResult.turnScore += pointsForBestLap;
                    }
                }
            }

            // Best average bonus
            if (pointsForBestAverage > 0) {
                const bestAveragePlayer = turnResults.reduce((best, current) => 
                    (current.averageTime ?? Infinity) < (best.averageTime ?? Infinity) ? current : best
                );
                
                if (bestAveragePlayer.averageTime !== undefined && bestAveragePlayer.averageTime < 120000) {
                    newPlayerStats[bestAveragePlayer.playerId].totalScore += pointsForBestAverage;
                    newPlayerStats[bestAveragePlayer.playerId].bestAverages += 1;
                    bestAveragePlayer.turnScore += pointsForBestAverage;
                }
            }
        }
        
        finalPlayerStats = newPlayerStats;
        nextPlayerIndex = 0;
        nextTurn = gameState.currentTurn + 1;

        // Calculate new player order based on current circuit standings (not overall)
        newPlayerOrder = calculateCircuitStandings(newCircuitResults, gameState.currentCircuitIndex, gameState.settings.players, false);
        
        // Check if we need to move to the next circuit
        if (nextTurn > gameState.settings.turnsPerCircuit) {
            // Apply circuit bonus points before moving to next circuit
            if (gameState.settings.pointsForCircuit && gameState.settings.pointsForCircuit.length > 0) {
                // Calculate circuit standings
                const circuitStandings = new Map<string, number>();
                gameState.settings.players.forEach(player => {
                    circuitStandings.set(player.id, 0);
                });
                
                newCircuitResults[gameState.currentCircuitIndex].turns.forEach(turn => {
                    turn.forEach(result => {
                        const currentPoints = circuitStandings.get(result.playerId) || 0;
                        circuitStandings.set(result.playerId, currentPoints + result.turnScore);
                    });
                });
                
                // Sort players by circuit points and award bonus points
                const sortedPlayers = Array.from(circuitStandings.entries())
                    .sort((a, b) => b[1] - a[1]);
                
                sortedPlayers.forEach(([playerId], index) => {
                    const pointsForCircuit = gameState.settings.pointsForCircuit || [];
                    if (index < pointsForCircuit.length) {
                        const bonusPoints = pointsForCircuit[index];
                        if (bonusPoints > 0) {
                            finalPlayerStats[playerId].totalScore += bonusPoints;
                        }
                    }
                });
            }
            
            // Move to next circuit
            nextTurn = 1;
            // Note: currentCircuitIndex will be incremented after this block
        }

        // Recalculate player order based on whether we're moving to a new circuit
        const isMovingToNewCircuit = nextTurn === 1;
        newPlayerOrder = calculateCircuitStandings(
            newCircuitResults,
            gameState.currentCircuitIndex,
            gameState.settings.players,
            isMovingToNewCircuit // Use overall standings when moving to new circuit
        );
    } else {
        // Not the last player of the turn - just advance to next player
        // Don't recalculate order mid-turn, keep the current order
        nextPlayerIndex = gameState.currentPlayerIndex + 1;
    }
    
    // Check if we should move to the next circuit BEFORE resetting nextTurn
    const currentTurnBeforeReset = isLastPlayerOfTurn ? gameState.currentTurn : nextTurn;
    const shouldMoveToNextCircuit = isLastPlayerOfTurn && currentTurnBeforeReset >= gameState.settings.turnsPerCircuit;
    const nextCircuitIndex = shouldMoveToNextCircuit ? gameState.currentCircuitIndex + 1 : gameState.currentCircuitIndex;
    
    const newGameState = {
      ...gameState,
      circuitResults: newCircuitResults,
      sessionBestLap: newSessionBestLap,
      sessionBestAverage: newSessionBestAverage,
      sessionBestTimes: newSessionBestTimes,
      playerStats: finalPlayerStats,
      currentPlayerIndex: nextPlayerIndex,
      currentTurn: nextTurn,
      currentCircuitIndex: nextCircuitIndex,
      playerOrder: newPlayerOrder,
      lapTimesLog: newLapTimesLog,
      currentController: newControllerId || gameState.currentController,
    };
    
    // Update historical records if new records were set
    const currentCircuit = gameState.circuits[gameState.currentCircuitIndex];
    const validLapsForRecord = lapTimes.filter(time => time < 120000);
    const fastestLap = validLapsForRecord.length > 0 ? Math.min(...validLapsForRecord) : null;
    
    try {
      // Only update records if we have valid times
      if (fastestLap !== null && averageTime < 120000) {
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
      }
      
      // Refresh circuits data to get updated historical records
      mutate('/api/circuits');
    } catch (error) {
      console.error('Failed to update historical records:', error);
    }
    
    // Call complete-turn API to properly save turn completion with scores
    try {
      await fetch('/api/lap-times/complete-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGame.id,
          playerId,
          circuitId: currentCircuit.id,
          turnNumber: gameState.currentTurn,
          useBest4Of5: gameState.settings.lapsPerTurn === 5 && gameState.settings.useBest4Of5Laps
        })
      });
    } catch (error) {
      console.error('Failed to complete turn in API:', error);
    }

    // Check if the game is now complete (all circuits finished)
    const isGameComplete = nextCircuitIndex >= gameState.settings.circuits.length;

    if (isGameComplete) {
      // Mark game as COMPLETED
      try {
        mutate('/api/game/active', { game: { ...activeGame, state: newGameState, status: 'COMPLETED' } }, false);

        await fetch(`/api/game/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeGame.id,
            state: newGameState,
            status: 'COMPLETED'
          })
        });

        // Refresh data
        mutate('/api/game/active');
        mutate('/api/game/history');

        // Show game complete toast
        const playerName = players?.find(p => p.id === playerId)?.name || 'Piloto';
        addToast({
          type: 'success',
          title: '¡Campeonato completado!',
          message: `Último tiempo de ${playerName} registrado. Ve a Resultados para ver el podio.`
        });
      } catch (error) {
        console.error('Failed to complete game:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo finalizar el campeonato automáticamente'
        });
      }
    } else {
      await updateGameState(newGameState);

      // Show success toast
      const playerName = players?.find(p => p.id === playerId)?.name || 'Piloto';
      addToast({
        type: 'success',
        title: 'Tiempos guardados',
        message: `Vuelta de ${playerName} registrada correctamente`
      });
    }

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

  const handleRecalculateScores = async () => {
    let gameIdToRecalculate: string | null = null;

    if (activeGame) {
      gameIdToRecalculate = activeGame.id;
    } else if (gameHistory && gameHistory.length > 0) {
      // Use the most recent completed game
      gameIdToRecalculate = gameHistory[0].id;
      addToast({
        type: 'info',
        title: 'Recalculando juego anterior',
        message: 'Usando el campeonato más reciente'
      });
    } else {
      addToast({
        type: 'error',
        title: 'No hay juegos disponibles',
        message: 'No hay campeonatos para recalcular'
      });
      return;
    }

    try {
      addToast({
        type: 'info',
        title: 'Recalculando puntos...',
        message: 'Corrigiendo cálculos de puntaje'
      });

      const response = await fetch('/api/game/recalculate-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameIdToRecalculate })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the game data
        await mutate('/api/game/active');
        
        addToast({
          type: 'success',
          title: 'Puntos recalculados',
          message: 'Los puntajes han sido corregidos'
        });
      } else {
        throw new Error(data.error || 'Failed to recalculate');
      }
    } catch (error) {
      console.error('Error recalculating scores:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron recalcular los puntos'
      });
    }
  };

  const handleGameEnd = async () => {
      if (!activeGame) return;
      
      // Fetch the latest game state to ensure we have the most recent scores
      const latestGameResponse = await fetch('/api/game/active');
      const latestGameData = await latestGameResponse.json();
      const latestGame = latestGameData?.game;
      
      if (!latestGame || !latestGame.state) {
        console.error('Could not fetch latest game state');
        return;
      }
      
      const finalGameState = {
        ...latestGame.state,
        currentCircuitIndex: latestGame.state.settings.circuits.length 
      };
      
      try {
        mutate('/api/game/active', { game: { ...latestGame, state: finalGameState } }, false);
        
        // Update the game as completed with the final state including all scores
        await fetch(`/api/game/update`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: latestGame.id, state: finalGameState, status: 'COMPLETED' })
        });

        // If this game is part of a tournament, award tournament points
        const gameState = latestGame.state as any;
        if (gameState.tournamentId && gameState.championshipId) {
          addToast({
            type: 'info',
            title: 'Procesando puntos de torneo...',
            message: 'Calculando resultados del campeonato'
          });

          // Calculate final results for tournament points
          const playerStats = finalGameState.playerStats;
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
              gameState: finalGameState,
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
        setActiveTab('resultados');
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
        // Use F1AdminLayout for admin users
        if (players && circuits && currentUser && hasAdminPrivileges(currentUser)) {
          return (
            <F1AdminLayout
              currentUser={currentUser}
              currentPlayer={currentPlayer}
              players={players}
              circuits={circuits}
              onLogout={handleLogout}
              onBack={handleBackToLive}
              onRecalculateScores={handleRecalculateScores}
              onCancelGame={handleCancelGame}
              onNavigateToTab={(tab) => {
                setGamePhase(activeGame ? 'race' : 'results');
                // Map F1 tabs to internal tabs
                const tabMapping = {
                  'tiempos-historicos': 'resultados' as const,
                  'tiempos': 'tiempos' as const,
                  'live': 'live' as const,
                  'hall-of-fame': 'resultados' as const
                };
                setActiveTab(tabMapping[tab] || 'live');
              }}
              onStartQuickRace={handleStartQuickRace}
              onStartCustomRace={handleSetupComplete}
            />
          );
        }
        // Fallback to original AdminHub if data not ready
        return <AdminHub 
          onNewGame={handleNewGame} 
          onAdmin={handleAdmin} 
          onTournamentSetup={handleTournamentSetup}
          onTournamentManagement={handleTournamentManagement}
          onBackToLive={handleBackToLive}
          currentUser={currentUser} 
          onLogout={handleLogout}
        />;
      case 'setup':
        return <ModernGameSetup players={players!} circuits={circuits!} onSetupComplete={handleSetupComplete} onCancel={() => setGamePhase('hub')} />;
      case 'admin':
        return <AdminView players={players || []} circuits={circuits || []} currentUser={currentUser} onBack={() => setGamePhase('hub')} onRecalculateScores={handleRecalculateScores} />;
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
        // Use F1Layout for logged-in users
        if (currentUser && players && circuits) {
          
          return (
            <F1Layout
              currentUser={currentUser}
              currentPlayer={currentPlayer}
              players={players}
              circuits={circuits}
              activeGame={activeGame}
              gameHistory={gameHistory || []}
              hasAdminPrivileges={hasAdminPrivileges(currentUser)}
              onLogout={handleLogout}
              onCancelGame={handleCancelGame}
              onRecalculateScores={handleRecalculateScores}
              onNavigateToHub={() => setGamePhase('hub')}
              onTurnComplete={handleTurnComplete}
              onNextCircuit={handleNextCircuit}
              onGameEnd={handleGameEnd}
            />
          );
        }
        
        return (
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-2">Cargando F1 Night...</h2>
              <p className="text-zinc-400">Preparando datos del sistema</p>
            </div>
          </div>
        );
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
