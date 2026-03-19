import { GameState, Player, TurnResult } from '../types';

export interface PlayerTurnData {
  playerId: string;
  position: number; // 1-based position
  basePoints: number; // Points from position only
  bonusPoints: number; // Bonus points from best lap/average
  totalPoints: number; // base + bonus
  turnScore: number; // Original turnScore from game state
}

export interface CircuitBreakdown {
  name: string;
  circuitIndex: number;
  players: {
    player: Player;
    basePoints: number;
    bonusPoints: number;
    totalPoints: number;
    turns: PlayerTurnData[];
  }[];
}

export class ScoreCalculator {
  private gameState: GameState;
  private players: Player[];

  constructor(gameState: GameState, players: Player[]) {
    this.gameState = gameState;
    this.players = players;
  }

  /**
   * Calculate position-based points (without bonus)
   */
  private getPositionPoints(rank: number, totalPlayers: number): number {
    if (rank === 0) return 3; // 1st place
    if (rank === 1 && totalPlayers >= 2) return 2; // 2nd place
    if (rank === 2 && totalPlayers >= 3) return 1; // 3rd place
    return 0;
  }

  /**
   * Get turn positions using consistent sorting (by turnScore)
   * This matches the logic used in the main scoring system
   */
  private getTurnPositions(turn: TurnResult[]): { playerId: string; position: number }[] {
    // Sort by turnScore descending (final score including bonuses)
    const sortedTurn = [...turn].sort((a, b) => b.turnScore - a.turnScore);
    
    return sortedTurn.map((result, index) => ({
      playerId: result.playerId,
      position: index + 1 // 1-based position
    }));
  }

  /**
   * Calculate turn positions for all circuits (used by calculateTurnPositions)
   */
  public calculateTurnPositions(): Record<string, { firsts: number; seconds: number; thirds: number }> {
    const playerTurnPositions: Record<string, { firsts: number; seconds: number; thirds: number }> = {};
    
    // Initialize counters
    this.players.forEach(player => {
      playerTurnPositions[player.id] = { firsts: 0, seconds: 0, thirds: 0 };
    });

    // Process each circuit's results
    this.gameState.circuitResults.forEach(circuit => {
      circuit.turns.forEach(turn => {
        const positions = this.getTurnPositions(turn);
        const totalPlayers = positions.length;
        
        // Award positions based on actual number of players
        positions.forEach(({ playerId, position }) => {
          if (position === 1 && totalPlayers >= 1) {
            playerTurnPositions[playerId].firsts++;
          }
          if (position === 2 && totalPlayers >= 2) {
            playerTurnPositions[playerId].seconds++;
          }
          if (position === 3 && totalPlayers >= 3) {
            playerTurnPositions[playerId].thirds++;
          }
        });
      });
    });

    return playerTurnPositions;
  }

  /**
   * Calculate detailed breakdown by circuit
   */
  public getCircuitBreakdown(): CircuitBreakdown[] {
    return this.gameState.settings.circuits.map((circuit, circuitIndex) => {
      const circuitResult = this.gameState.circuitResults[circuitIndex];
      if (!circuitResult) return null;

      // Get unique players who actually participated in this circuit
      const participatingPlayerIds = new Set<string>();
      circuitResult.turns.forEach(turn => {
        turn.forEach(result => participatingPlayerIds.add(result.playerId));
      });

      // Calculate points for each participating player in this circuit
      const playerCircuitData = this.players
        .filter(player => participatingPlayerIds.has(player.id))
        .map((player) => {
          const playerId = player.id;
          let circuitBasePoints = 0;
          let circuitBonusPoints = 0;
          const turnDetails: PlayerTurnData[] = [];

          // Process each turn in this circuit
          circuitResult.turns.forEach((turn, turnIndex) => {
            const playerTurn = turn.find(p => p.playerId === playerId);
            if (!playerTurn) return;

            // Get position using consistent sorting
            const positions = this.getTurnPositions(turn);
            const playerPosition = positions.find(p => p.playerId === playerId);
            const position = playerPosition ? playerPosition.position : turn.length + 1;
            
            // Calculate base points (position-based only)
            const basePoints = this.getPositionPoints(position - 1, turn.length); // Convert to 0-based for calculation
            
            // Bonus points = total turn score - base points
            const totalTurnScore = playerTurn.turnScore || 0;
            const bonusPoints = Math.max(0, totalTurnScore - basePoints);

            circuitBasePoints += basePoints;
            circuitBonusPoints += bonusPoints;
            
            turnDetails.push({
              playerId,
              position,
              basePoints,
              bonusPoints,
              totalPoints: basePoints + bonusPoints,
              turnScore: totalTurnScore
            });
          });

          return {
            player,
            basePoints: circuitBasePoints,
            bonusPoints: circuitBonusPoints,
            totalPoints: circuitBasePoints + circuitBonusPoints,
            turns: turnDetails
          };
        });

      return {
        name: circuit.name,
        circuitIndex,
        players: playerCircuitData.sort((a, b) => b.totalPoints - a.totalPoints)
      };
    }).filter(Boolean) as CircuitBreakdown[];
  }

  /**
   * Get player standings using game state data
   */
  public getPlayerStandings() {
    const turnPositions = this.calculateTurnPositions();
    
    return Object.entries(this.gameState.playerStats)
      .map(([playerId, stats]) => {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return null;
        
        const positions = turnPositions[playerId] || { firsts: 0, seconds: 0, thirds: 0 };
        
        return {
          player,
          score: stats.totalScore,
          bestLaps: stats.bestLaps || 0,
          bestAverages: stats.bestAverages || 0,
          firsts: positions.firsts,
          seconds: positions.seconds,
          thirds: positions.thirds
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score) as any[];
  }
}