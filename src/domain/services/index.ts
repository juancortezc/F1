// Export all services
export { TimingService, timingService } from './TimingService';
export { ScoringService, scoringService } from './ScoringService';
export { RecordService, recordService } from './RecordService';
export { GameService, gameService } from './GameService';

// Export service types
export type { TurnScoreResult, CircuitBreakdown } from './ScoringService';
export type { RecordCheckResult, CircuitRecords } from './RecordService';
export type { TurnData, TurnCompletionResult } from './GameService';
