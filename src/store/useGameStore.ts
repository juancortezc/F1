/**
 * Game Store - Manages active game state
 */

import { create } from 'zustand';
import type { Game, GameState, Circuit, Player } from '../domain/entities';

interface GameStore {
  // State
  activeGame: Game | null;
  gameState: GameState | null;
  currentCircuit: Circuit | null;
  players: Player[];
  circuits: Circuit[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  fetchActiveGame: () => Promise<void>;
  setActiveGame: (game: Game | null, state: GameState | null) => void;
  updateGameState: (state: GameState) => void;
  setCurrentCircuit: (circuit: Circuit | null) => void;
  setPlayers: (players: Player[]) => void;
  setCircuits: (circuits: Circuit[]) => void;
  clearError: () => void;
  reset: () => void;

  // Computed getters
  getCurrentPlayer: () => Player | null;
  getProgress: () => {
    completedCircuits: number;
    totalCircuits: number;
    currentTurn: number;
    totalTurns: number;
    progress: number;
  };
  hasActiveGame: () => boolean;
}

const initialState = {
  activeGame: null,
  gameState: null,
  currentCircuit: null,
  players: [],
  circuits: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // Fetch active game from API
  fetchActiveGame: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/game/active');

      if (!response.ok) {
        if (response.status === 404) {
          // No active game is not an error
          set({
            activeGame: null,
            gameState: null,
            currentCircuit: null,
            isLoading: false,
            lastUpdated: new Date(),
          });
          return;
        }
        throw new Error('Error fetching active game');
      }

      const data = await response.json();
      const game = data.game;
      const state = game?.state as GameState;

      // Get current circuit
      let currentCircuit: Circuit | null = null;
      if (state && state.currentCircuitIndex < state.circuits.length) {
        currentCircuit = state.circuits[state.currentCircuitIndex];
      }

      set({
        activeGame: game,
        gameState: state,
        currentCircuit,
        players: state?.settings.players || [],
        circuits: state?.circuits || [],
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  },

  // Direct setters
  setActiveGame: (game, state) => {
    let currentCircuit: Circuit | null = null;
    if (state && state.currentCircuitIndex < state.circuits.length) {
      currentCircuit = state.circuits[state.currentCircuitIndex];
    }

    set({
      activeGame: game,
      gameState: state,
      currentCircuit,
      players: state?.settings.players || [],
      circuits: state?.circuits || [],
      lastUpdated: new Date(),
    });
  },

  updateGameState: (state) => {
    let currentCircuit: Circuit | null = null;
    if (state.currentCircuitIndex < state.circuits.length) {
      currentCircuit = state.circuits[state.currentCircuitIndex];
    }

    set({
      gameState: state,
      currentCircuit,
      players: state.settings.players,
      circuits: state.circuits,
      lastUpdated: new Date(),
    });
  },

  setCurrentCircuit: (circuit) => {
    set({ currentCircuit: circuit });
  },

  setPlayers: (players) => {
    set({ players });
  },

  setCircuits: (circuits) => {
    set({ circuits });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },

  // Computed getters
  getCurrentPlayer: () => {
    const { gameState, players } = get();
    if (!gameState || !players.length) return null;

    const playerId = gameState.playerOrder[gameState.currentPlayerIndex];
    return players.find((p) => p.id === playerId) || null;
  },

  getProgress: () => {
    const { gameState } = get();
    if (!gameState) {
      return {
        completedCircuits: 0,
        totalCircuits: 0,
        currentTurn: 0,
        totalTurns: 0,
        progress: 0,
      };
    }

    const totalCircuits = gameState.circuits.length;
    const totalTurns = gameState.settings.turnsPerCircuit;
    const completedCircuits = gameState.currentCircuitIndex;
    const currentTurn = gameState.currentTurn;

    const totalPlayerTurns = totalCircuits * totalTurns * gameState.playerOrder.length;
    const completedPlayerTurns =
      completedCircuits * totalTurns * gameState.playerOrder.length +
      (currentTurn - 1) * gameState.playerOrder.length +
      gameState.currentPlayerIndex;

    const progress = totalPlayerTurns > 0
      ? Math.round((completedPlayerTurns / totalPlayerTurns) * 100)
      : 0;

    return {
      completedCircuits,
      totalCircuits,
      currentTurn,
      totalTurns,
      progress,
    };
  },

  hasActiveGame: () => {
    return get().activeGame !== null;
  },
}));

// Selectors
export const selectActiveGame = (state: GameStore) => state.activeGame;
export const selectGameState = (state: GameStore) => state.gameState;
export const selectCurrentCircuit = (state: GameStore) => state.currentCircuit;
export const selectPlayers = (state: GameStore) => state.players;
export const selectCircuits = (state: GameStore) => state.circuits;
export const selectIsLoading = (state: GameStore) => state.isLoading;
export const selectError = (state: GameStore) => state.error;
export const selectHasActiveGame = (state: GameStore) => state.activeGame !== null;
