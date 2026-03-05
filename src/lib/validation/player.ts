/**
 * Player validation schemas using Zod
 */

import { z } from 'zod';

// PIN validation: exactly 4 digits
export const PinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN debe ser exactamente 4 dígitos');

// Player name validation
export const PlayerNameSchema = z
  .string()
  .min(1, 'Nombre es requerido')
  .max(50, 'Nombre no puede exceder 50 caracteres')
  .transform((val) => val.trim());

// Image URL validation
export const ImageUrlSchema = z
  .string()
  .url('URL de imagen inválida');

// Create player schema
export const CreatePlayerSchema = z.object({
  name: PlayerNameSchema,
  imageUrl: ImageUrlSchema,
  pin: PinSchema,
  isGuest: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Update player schema (all fields optional)
export const UpdatePlayerSchema = z.object({
  name: PlayerNameSchema.optional(),
  imageUrl: ImageUrlSchema.optional(),
  pin: PinSchema.optional(),
  isGuest: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Login schema
export const LoginSchema = z.object({
  pin: PinSchema,
});

// Create guest schema (simplified)
export const CreateGuestSchema = z.object({
  name: PlayerNameSchema,
  imageUrl: ImageUrlSchema.optional().default('/avatars/guest.png'),
});

// Type exports
export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateGuestInput = z.infer<typeof CreateGuestSchema>;
