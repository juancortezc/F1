/**
 * GameService - Orchestrates game flow and state management
 * Pure domain service for game logic
 */

import type {
  GameState,
  GameSettings,
  Player,
  Circuit,
  TurnResult,
  CircuitResult,
  PlayerStats,
  ProgressInfo,
} from '../entities';
import { TimingService } from './TimingService';
import { ScoringService } from './ScoringService';

export interface TurnData {
  playerId: string;
  lapTimes: number[];
  averageTime?: number;
}

export interface TurnCompletionResult {
  turnScore: number;
  hasBestLap: boolean;
  hasBestAverage: boolean;
  newSessionBestLap: boolean;
  newSessionBestAverage: boolean;
}

export class GameService {
  private timingService: TimingService;
  private scoringService: ScoringService;

  constructor(timingService?: TimingService, scoringService?: ScoringService) {
    this.timingService = timingService || new TimingService();
    this.scoringService = scoringService || new ScoringService(this.timingService);
  }

  /**
   * Create initial game state from settings
   */
  createInitialState(settings: GameSettings): GameState {
    const playerStats: Record<string, PlayerStats> = {};
    const sessionBestTimes: Record<string, {
      bestLap: number | null;
      bestLapPlayerId: string | null;
      bestAverage: number | null;
      bestAveragePlayerId: string | null;
    }> = {};

    // Initialize player stats
    settings.players.forEach((player) => {
      playerStats[player.id] = {
        totalScore: 0,
        bestLaps: 0,
        bestAverages: 0,
      };
    });

    // Initialize session bests per circuit
    settings.circuits.forEach((circuit) => {
      sessionBestTimes[circuit.id] = {
        bestLap: null,
        bestLapPlayerId: null,
        bestAverage: null,
        bestAveragePlayerId: null,
      };
    });

    return {
      settings,
      circuits: settings.circuits,
      playerOrder: settings.players.map((p) => p.id),
      currentCircuitIndex: 0,
      currentTurn: 1,
      currentPlayerIndex: 0,
      circuitResults: [],
      playerStats,
      sessionBestLap: null,
      sessionBestAverage: null,
      sessionBestTimes,
      lapTimesLog: [],
      currentController: settings.players[0]?.id || '',
      participantUsers: [],
    };
  }

  /**
   * Get current player from game state
   */
  getCurrentPlayer(gameState: GameState): Player | null {
    const playerId = gameState.playerOrder[gameState.currentPlayerIndex];
    return gameState.settings.players.find((p) => p.id === playerId) || null;
  }

  /**
   * Get current circuit from game state
   */
  getCurrentCircuit(gameState: GameState): Circuit | null {
    return gameState.circuits[gameState.currentCircuitIndex] || null;
  }

  /**
   * Check if game is on the last player of current turn
   */
  isLastPlayerOfTurn(gameState: GameState): boolean {
    return gameState.currentPlayerIndex >= gameState.playerOrder.length - 1;
  }

  /**
   * Check if game is on the last turn of current circuit
   */
  isLastTurnOfCircuit(gameState: GameState): boolean {
    return gameState.currentTurn >= gameState.settings.turnsPerCircuit;
  }

  /**
   * Check if game is on the last circuit
   */
  isLastCircuit(gameState: GameState): boolean {
    return gameState.currentCircuitIndex >= gameState.circuits.length - 1;
  }

  /**
   * Check if game is complete
   */
  isGameComplete(gameState: GameState): boolean {
    return (
      this.isLastCircuit(gameState) &&
      this.isLastTurnOfCircuit(gameState) &&
      this.isLastPlayerOfTurn(gameState)
    );
  }

  /**
   * Advance to next player
   * Returns new game state with updated indices
   */
  advanceToNextPlayer(gameState: GameState): GameState {
    const newState = { ...gameState };

    if (this.isLastPlayerOfTurn(gameState)) {
      // Move to next turn
      newState.currentPlayerIndex = 0;
      newState.currentTurn = gameState.currentTurn + 1;

      if (newState.currentTurn > gameState.settings.turnsPerCircuit) {
        // Move to next circuit
        newState.currentTurn = 1;
        newState.currentCircuitIndex = gameState.currentCircuitIndex + 1;
      }
    } else {
      newState.currentPlayerIndex = gameState.currentPlayerIndex + 1;
    }

    // Update current controller
    const nextPlayerId = gameState.playerOrder[newState.currentPlayerIndex];
    newState.currentController = nextPlayerId || '';

    return newState;
  }

  /**
   * Reorder players based on standings after a turn
   * Winner of previous turn goes first
   */
  reorderPlayersAfterTurn(gameState: GameState): GameState {
    if (!gameState.circuitResults.length) {
      return gameState;
    }

    const currentCircuitResult = gameState.circuitResults[gameState.currentCircuitIndex];
    if (!currentCircuitResult || !currentCircuitResult.turns.length) {
      return gameState;
    }

    const lastTurn = currentCircuitResult.turns[currentCircuitResult.turns.length - 1];
    if (!lastTurn || lastTurn.length === 0) {
      return gameState;
    }

    // Sort by average time (ascending - fastest first)
    const sorted = this.scoringService.sortTurnByTime(lastTurn);
    const newOrder = sorted.map((s) => s.playerId);

    // Ensure all players are included
    const missingPlayers = gameState.playerOrder.filter((id) => !newOrder.includes(id));
    const finalOrder = [...newOrder, ...missingPlayers];

    return {
      ...gameState,
      playerOrder: finalOrder,
      currentPlayerIndex: 0,
    };
  }

  /**
   * Calculate progress information
   */
  calculateProgress(gameState: GameState): ProgressInfo {
    const totalCircuits = gameState.circuits.length;
    const totalTurnsPerCircuit = gameState.settings.turnsPerCircuit;
    const totalPlayers = gameState.playerOrder.length;

    const completedCircuits = gameState.currentCircuitIndex;
    const completedTurnsInCurrentCircuit = gameState.currentTurn - 1;
    const completedPlayersInCurrentTurn = gameState.currentPlayerIndex;

    const totalTurns = totalCircuits * totalTurnsPerCircuit;
    const completedTurns = completedCircuits * totalTurnsPerCircuit + completedTurnsInCurrentCircuit;

    const totalPlayerTurns = totalTurns * totalPlayers;
    const completedPlayerTurns =
      completedCircuits * totalTurnsPerCircuit * totalPlayers +
      completedTurnsInCurrentCircuit * totalPlayers +
      completedPlayersInCurrentTurn;

    const overallProgress = totalPlayerTurns > 0
      ? Math.round((completedPlayerTurns / totalPlayerTurns) * 100)
      : 0;

    const currentCircuitTotalTurns = totalTurnsPerCircuit * totalPlayers;
    const currentCircuitCompleted = completedTurnsInCurrentCircuit * totalPlayers + completedPlayersInCurrentTurn;
    const currentCircuitProgress = currentCircuitTotalTurns > 0
      ? Math.round((currentCircuitCompleted / currentCircuitTotalTurns) * 100)
      : 0;

    return {
      completedCircuits,
      totalCircuits,
      completedTurns,
      totalTurns,
      overallProgress,
      currentCircuitProgress,
    };
  }

  /**
   * Record a turn completion and update state
   */
  completeTurn(
    gameState: GameState,
    turnData: TurnData
  ): { state: GameState; result: TurnCompletionResult } {
    const newState = { ...gameState };
    const circuitId = this.getCurrentCircuit(gameState)?.id || '';
    const { playerId, lapTimes } = turnData;

    // Calculate times
    const average = turnData.averageTime ?? (
      gameState.settings.useBest4Of5Laps && lapTimes.length === 5
        ? this.timingService.calculateBest4Of5Average(lapTimes)
        : this.timingService.calculateAverage(lapTimes)
    );
    const bestLap = this.timingService.getBestLap(lapTimes);

    // Check session bests
    const sessionBests = newState.sessionBestTimes[circuitId] || {
      bestLap: null,
      bestLapPlayerId: null,
      bestAverage: null,
      bestAveragePlayerId: null,
    };

    let newSessionBestLap = false;
    let newSessionBestAverage = false;

    if (bestLap !== null && (sessionBests.bestLap === null || bestLap < sessionBests.bestLap)) {
      sessionBests.bestLap = bestLap;
      sessionBests.bestLapPlayerId = playerId;
      newSessionBestLap = true;
    }

    if (average > 0 && (sessionBests.bestAverage === null || average < sessionBests.bestAverage)) {
      sessionBests.bestAverage = average;
      sessionBests.bestAveragePlayerId = playerId;
      newSessionBestAverage = true;
    }

    newState.sessionBestTimes = {
      ...newState.sessionBestTimes,
      [circuitId]: sessionBests,
    };

    // Determine bonus points
    const hasBestLap = sessionBests.bestLapPlayerId === playerId && newSessionBestLap;
    const hasBestAverage = sessionBests.bestAveragePlayerId === playerId && newSessionBestAverage;

    // Calculate score
    // Note: Position-based points are calculated when the full turn completes
    // Here we just record the turn result
    const bonusPoints = this.scoringService.calculateBonusPoints(hasBestLap, hasBestAverage, {
      pointsForBestLap: gameState.settings.pointsForBestLap,
      pointsForBestAverage: gameState.settings.pointsForBestAverage,
    });

    const turnScore = bonusPoints; // Position points added later

    // Create turn result
    const turnResult: TurnResult = {
      playerId,
      lapTimes,
      averageTime: average,
      turnScore,
    };

    // Add to circuit results
    const circuitIndex = gameState.currentCircuitIndex;
    const turnIndex = gameState.currentTurn - 1;

    // Ensure circuit result exists
    if (!newState.circuitResults[circuitIndex]) {
      newState.circuitResults[circuitIndex] = {
        circuitId,
        turns: [],
      };
    }

    // Ensure turn array exists
    if (!newState.circuitResults[circuitIndex].turns[turnIndex]) {
      newState.circuitResults[circuitIndex].turns[turnIndex] = [];
    }

    // Add or update player result in turn
    const existingIndex = newState.circuitResults[circuitIndex].turns[turnIndex].findIndex(
      (r) => r.playerId === playerId
    );

    if (existingIndex >= 0) {
      newState.circuitResults[circuitIndex].turns[turnIndex][existingIndex] = turnResult;
    } else {
      newState.circuitResults[circuitIndex].turns[turnIndex].push(turnResult);
    }

    // Update player stats
    if (newState.playerStats[playerId]) {
      if (hasBestLap) {
        newState.playerStats[playerId].bestLaps++;
      }
      if (hasBestAverage) {
        newState.playerStats[playerId].bestAverages++;
      }
    }

    // Add to lap times log
    const circuit = this.getCurrentCircuit(gameState);
    lapTimes.forEach((time, index) => {
      newState.lapTimesLog.push({
        playerId,
        circuitName: circuit?.name || '',
        turn: gameState.currentTurn,
        lap: index + 1,
        time,
      });
    });

    return {
      state: newState,
      result: {
        turnScore,
        hasBestLap,
        hasBestAverage,
        newSessionBestLap,
        newSessionBestAverage,
      },
    };
  }

  /**
   * Calculate position-based points for completed turn
   * Should be called after all players complete their turn
   */
  calculateTurnPositionPoints(gameState: GameState): GameState {
    const newState = { ...gameState };
    const circuitIndex = gameState.currentCircuitIndex;
    const turnIndex = gameState.currentTurn - 1;

    const turn = newState.circuitResults[circuitIndex]?.turns[turnIndex];
    if (!turn || turn.length === 0) {
      return newState;
    }

    // Sort by time to get positions
    const sorted = this.scoringService.sortTurnByTime(turn);
    const totalPlayers = sorted.length;

    // Update each player's score
    sorted.forEach(({ playerId, position }) => {
      const positionPoints = this.scoringService.getPositionPoints(
        position,
        totalPlayers,
        {
          first: gameState.settings.pointsForFirst ?? 3,
          second: gameState.settings.pointsForSecond ?? 2,
          third: gameState.settings.pointsForThird ?? 1,
        }
      );

      // Find and update the turn result
      const turnResult = turn.find((r) => r.playerId === playerId);
      if (turnResult) {
        turnResult.turnScore += positionPoints;
      }

      // Update player total score
      if (newState.playerStats[playerId]) {
        newState.playerStats[playerId].totalScore += positionPoints;
      }
    });

    return newState;
  }
}

// Export singleton instance
export const gameService = new GameService();
