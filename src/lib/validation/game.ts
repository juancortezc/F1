/**
 * Game validation schemas using Zod
 */

import { z } from 'zod';

// CUID validation
export const CuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'ID inválido');

// Scoring method enum
export const ScoringMethodSchema = z.enum(['average', 'lap', 'both']);

// Laps per turn (3 or 5)
export const LapsPerTurnSchema = z.enum(['3', '5']).transform((val) => parseInt(val) as 3 | 5);

// Turns per circuit (1-10)
export const TurnsPerCircuitSchema = z
  .number()
  .int()
  .min(1, 'Mínimo 1 turno por circuito')
  .max(10, 'Máximo 10 turnos por circuito');

// Points (0-100)
export const PointsSchema = z
  .number()
  .int()
  .min(0, 'Puntos no pueden ser negativos')
  .max(100, 'Máximo 100 puntos');

// Player for game setup (simplified)
export const GamePlayerSchema = z.object({
  id: CuidSchema,
  name: z.string(),
  imageUrl: z.string(),
  pin: z.string(),
  isActive: z.boolean(),
  isGuest: z.boolean(),
});

// Circuit for game setup
export const GameCircuitSchema = z.object({
  id: CuidSchema,
  name: z.string(),
  imageUrl: z.string(),
  historicalBestLap: z.number().nullable().optional(),
  historicalBestAverage: z.number().nullable().optional(),
  bestLapHolderId: z.string().nullable().optional(),
  bestAverageHolderId: z.string().nullable().optional(),
});

// Scoring multiplier
export const ScoringMultiplierSchema = z.object({
  appliesTo: z.enum(['average', 'lap']),
  factor: z.number().min(1).max(10),
}).nullable();

// Game settings schema
export const GameSettingsSchema = z.object({
  players: z.array(GamePlayerSchema).min(1, 'Se requiere al menos 1 jugador'),
  circuits: z.array(GameCircuitSchema).min(1, 'Se requiere al menos 1 circuito'),
  controllerIds: z.array(CuidSchema),
  lapsPerTurn: z.union([z.literal(3), z.literal(5)]),
  turnsPerCircuit: TurnsPerCircuitSchema,
  scoringMethod: ScoringMethodSchema,
  scoringMultiplier: ScoringMultiplierSchema,
  pointsForBestLap: PointsSchema,
  pointsForBestAverage: PointsSchema,
  awardBestTimeFor: z.enum(['turn', 'circuit', 'both']),
  useBest4Of5Laps: z.boolean(),
  pointsForFirst: PointsSchema.optional(),
  pointsForSecond: PointsSchema.optional(),
  pointsForThird: PointsSchema.optional(),
  pointsForCircuit: z.array(PointsSchema).optional(),
});

// Create game schema
export const CreateGameSchema = z.object({
  settings: GameSettingsSchema,
});

// Update game state (flexible - accepts any valid game state)
export const UpdateGameStateSchema = z.object({
  gameId: CuidSchema,
  state: z.record(z.string(), z.unknown()), // GameState is complex, validate at runtime
});

// Game status
export const GameStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']);

// Update game status
export const UpdateGameStatusSchema = z.object({
  gameId: CuidSchema,
  status: GameStatusSchema,
});

// Type exports
export type ScoringMethod = z.infer<typeof ScoringMethodSchema>;
export type GameSettings = z.infer<typeof GameSettingsSchema>;
export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
