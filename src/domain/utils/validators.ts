/**
 * Domain validation utilities
 * Pure functions for validating business rules
 */

import type { ValidationResult } from '../entities';

/**
 * Validate lap time is within acceptable range
 * @param timeMs - Lap time in milliseconds
 * @returns ValidationResult with isValid and optional error message
 */
export function validateLapTime(timeMs: number): ValidationResult {
  if (typeof timeMs !== 'number' || isNaN(timeMs)) {
    return { isValid: false, error: 'Tiempo inválido' };
  }

  if (timeMs <= 0) {
    return { isValid: false, error: 'El tiempo debe ser mayor a 0' };
  }

  // Maximum 10 minutes (600000ms) - reasonable max for F1 simulator lap
  if (timeMs > 600000) {
    return { isValid: false, error: 'El tiempo excede el máximo permitido (10 minutos)' };
  }

  // Minimum 10 seconds (10000ms) - too fast to be real
  if (timeMs < 10000) {
    return { isValid: false, error: 'El tiempo es demasiado rápido para ser válido' };
  }

  return { isValid: true };
}

/**
 * Validate player PIN format
 * @param pin - PIN string to validate
 * @returns ValidationResult
 */
export function validatePin(pin: string): ValidationResult {
  if (!pin || typeof pin !== 'string') {
    return { isValid: false, error: 'PIN es requerido' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, error: 'PIN debe ser exactamente 4 dígitos' };
  }

  return { isValid: true };
}

/**
 * Validate player name
 * @param name - Player name to validate
 * @returns ValidationResult
 */
export function validatePlayerName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Nombre es requerido' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 1) {
    return { isValid: false, error: 'Nombre no puede estar vacío' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Nombre no puede exceder 50 caracteres' };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns ValidationResult
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL es requerida' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Formato de URL inválido' };
  }
}

/**
 * Validate CUID format (Prisma default ID format)
 * @param id - ID string to validate
 * @returns ValidationResult
 */
export function validateCuid(id: string): ValidationResult {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID es requerido' };
  }

  // CUID format: starts with 'c', 25 characters, alphanumeric
  if (!/^c[a-z0-9]{24}$/.test(id)) {
    return { isValid: false, error: 'Formato de ID inválido' };
  }

  return { isValid: true };
}

/**
 * Validate lap number is within game settings
 * @param lapNumber - Lap number (1-based)
 * @param lapsPerTurn - Maximum laps per turn from settings
 * @returns ValidationResult
 */
export function validateLapNumber(lapNumber: number, lapsPerTurn: 3 | 5): ValidationResult {
  if (!Number.isInteger(lapNumber)) {
    return { isValid: false, error: 'Número de vuelta debe ser entero' };
  }

  if (lapNumber < 1) {
    return { isValid: false, error: 'Número de vuelta debe ser al menos 1' };
  }

  if (lapNumber > lapsPerTurn) {
    return { isValid: false, error: `Número de vuelta no puede exceder ${lapsPerTurn}` };
  }

  return { isValid: true };
}

/**
 * Validate turn number is within game settings
 * @param turnNumber - Turn number (1-based)
 * @param turnsPerCircuit - Maximum turns per circuit from settings
 * @returns ValidationResult
 */
export function validateTurnNumber(turnNumber: number, turnsPerCircuit: number): ValidationResult {
  if (!Number.isInteger(turnNumber)) {
    return { isValid: false, error: 'Número de turno debe ser entero' };
  }

  if (turnNumber < 1) {
    return { isValid: false, error: 'Número de turno debe ser al menos 1' };
  }

  if (turnNumber > turnsPerCircuit) {
    return { isValid: false, error: `Número de turno no puede exceder ${turnsPerCircuit}` };
  }

  return { isValid: true };
}

/**
 * Validate array of lap times
 * @param lapTimes - Array of lap times in milliseconds
 * @param expectedCount - Expected number of lap times
 * @returns ValidationResult
 */
export function validateLapTimes(lapTimes: number[], expectedCount?: number): ValidationResult {
  if (!Array.isArray(lapTimes)) {
    return { isValid: false, error: 'Tiempos de vuelta deben ser un array' };
  }

  if (lapTimes.length === 0) {
    return { isValid: false, error: 'Debe haber al menos un tiempo de vuelta' };
  }

  if (expectedCount !== undefined && lapTimes.length !== expectedCount) {
    return { isValid: false, error: `Se esperaban ${expectedCount} tiempos, se recibieron ${lapTimes.length}` };
  }

  // Validate each lap time
  for (let i = 0; i < lapTimes.length; i++) {
    const result = validateLapTime(lapTimes[i]);
    if (!result.isValid) {
      return { isValid: false, error: `Vuelta ${i + 1}: ${result.error}` };
    }
  }

  return { isValid: true };
}
