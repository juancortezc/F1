// Export all repository interfaces
export type {
  IPlayerRepository,
  CreatePlayerDTO,
  UpdatePlayerDTO,
} from './IPlayerRepository';

export type {
  ICircuitRepository,
  CreateCircuitDTO,
  UpdateCircuitDTO,
  CircuitWithHolders,
} from './ICircuitRepository';

export type {
  IGameRepository,
  CreateGameDTO,
  GameWithState,
  GameStatus,
} from './IGameRepository';

export type {
  ILapTimeRepository,
  IndividualLapTime,
  TurnCompletion,
  CreateLapTimeDTO,
  CreateTurnCompletionDTO,
  LapTimeFilters,
} from './ILapTimeRepository';
