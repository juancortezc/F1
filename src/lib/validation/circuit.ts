/**
 * Circuit validation schemas using Zod
 */

import { z } from 'zod';

// Circuit name validation
export const CircuitNameSchema = z
  .string()
  .min(1, 'Nombre del circuito es requerido')
  .max(100, 'Nombre no puede exceder 100 caracteres')
  .transform((val) => val.trim());

// Image URL validation
export const CircuitImageUrlSchema = z
  .string()
  .url('URL de imagen inválida');

// Time in milliseconds (positive integer)
export const TimeInMsSchema = z
  .number()
  .int('Tiempo debe ser un número entero')
  .positive('Tiempo debe ser positivo')
  .max(600000, 'Tiempo no puede exceder 10 minutos');

// CUID validation
export const CuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'ID inválido');

// Create circuit schema
export const CreateCircuitSchema = z.object({
  name: CircuitNameSchema,
  imageUrl: CircuitImageUrlSchema,
});

// Update circuit schema
export const UpdateCircuitSchema = z.object({
  name: CircuitNameSchema.optional(),
  imageUrl: CircuitImageUrlSchema.optional(),
  historicalBestLap: TimeInMsSchema.nullable().optional(),
  historicalBestAverage: TimeInMsSchema.nullable().optional(),
  bestLapHolderId: CuidSchema.nullable().optional(),
  bestAverageHolderId: CuidSchema.nullable().optional(),
});

// Update records schema
export const UpdateRecordsSchema = z.object({
  bestLap: TimeInMsSchema.optional(),
  bestLapHolderId: CuidSchema.optional(),
  bestAverage: TimeInMsSchema.optional(),
  bestAverageHolderId: CuidSchema.optional(),
});

// Type exports
export type CreateCircuitInput = z.infer<typeof CreateCircuitSchema>;
export type UpdateCircuitInput = z.infer<typeof UpdateCircuitSchema>;
export type UpdateRecordsInput = z.infer<typeof UpdateRecordsSchema>;
