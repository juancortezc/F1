/**
 * Lap time validation schemas using Zod
 */

import { z } from 'zod';

// CUID validation
export const CuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'ID inválido');

// Time in milliseconds validation
export const LapTimeValueSchema = z
  .number()
  .int('Tiempo debe ser un número entero')
  .positive('Tiempo debe ser positivo')
  .min(10000, 'Tiempo mínimo es 10 segundos')
  .max(600000, 'Tiempo máximo es 10 minutos');

// Lap number (1-5)
export const LapNumberSchema = z
  .number()
  .int('Número de vuelta debe ser entero')
  .min(1, 'Número de vuelta mínimo es 1')
  .max(5, 'Número de vuelta máximo es 5');

// Turn number (1+)
export const TurnNumberSchema = z
  .number()
  .int('Número de turno debe ser entero')
  .min(1, 'Número de turno mínimo es 1')
  .max(100, 'Número de turno máximo es 100');

// Save individual lap time
export const SaveLapTimeSchema = z.object({
  gameId: CuidSchema,
  playerId: CuidSchema,
  circuitId: CuidSchema,
  turnNumber: TurnNumberSchema,
  lapNumber: LapNumberSchema,
  timeMs: LapTimeValueSchema,
});

// Array of lap times
export const LapTimesArraySchema = z
  .array(LapTimeValueSchema)
  .min(1, 'Debe haber al menos una vuelta')
  .max(5, 'Máximo 5 vueltas por turno');

// Complete turn schema
export const CompleteTurnSchema = z.object({
  gameId: CuidSchema,
  playerId: CuidSchema,
  circuitId: CuidSchema,
  turnNumber: TurnNumberSchema,
  lapTimes: LapTimesArraySchema,
});

// Live data query params
export const LiveDataQuerySchema = z.object({
  gameId: CuidSchema,
  circuitId: CuidSchema,
});

// Get lap times query params (all optional)
export const GetLapTimesQuerySchema = z.object({
  gameId: CuidSchema.optional(),
  playerId: CuidSchema.optional(),
  circuitId: CuidSchema.optional(),
  turnNumber: z.coerce.number().int().positive().optional(),
});

// Type exports
export type SaveLapTimeInput = z.infer<typeof SaveLapTimeSchema>;
export type CompleteTurnInput = z.infer<typeof CompleteTurnSchema>;
export type LiveDataQuery = z.infer<typeof LiveDataQuerySchema>;
export type GetLapTimesQuery = z.infer<typeof GetLapTimesQuerySchema>;
