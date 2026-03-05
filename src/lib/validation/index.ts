// Export validation schemas and types selectively to avoid conflicts
export {
  PinSchema,
  PlayerNameSchema,
  ImageUrlSchema,
  CreatePlayerSchema,
  UpdatePlayerSchema,
  LoginSchema,
  CreateGuestSchema,
  type CreatePlayerInput,
  type UpdatePlayerInput,
  type LoginInput,
  type CreateGuestInput,
} from './player';

export {
  CircuitNameSchema,
  CircuitImageUrlSchema,
  TimeInMsSchema,
  CreateCircuitSchema,
  UpdateCircuitSchema,
  UpdateRecordsSchema,
  type CreateCircuitInput,
  type UpdateCircuitInput,
  type UpdateRecordsInput,
} from './circuit';

export {
  CuidSchema,
  LapTimeValueSchema,
  LapNumberSchema,
  TurnNumberSchema,
  SaveLapTimeSchema,
  LapTimesArraySchema,
  CompleteTurnSchema,
  LiveDataQuerySchema,
  GetLapTimesQuerySchema,
  type SaveLapTimeInput,
  type CompleteTurnInput,
  type LiveDataQuery,
  type GetLapTimesQuery,
} from './lapTime';

export {
  ScoringMethodSchema,
  LapsPerTurnSchema,
  TurnsPerCircuitSchema,
  PointsSchema,
  GamePlayerSchema,
  GameCircuitSchema,
  ScoringMultiplierSchema,
  GameSettingsSchema,
  CreateGameSchema,
  UpdateGameStateSchema,
  GameStatusSchema,
  UpdateGameStatusSchema,
  type ScoringMethod,
  type GameSettings,
  type CreateGameInput,
  type GameStatus,
} from './game';

// Re-export zod for convenience
export { z } from 'zod';

// Validation middleware helper for API routes
import { type ZodSchema, type ZodIssue } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationError[] = result.error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return { success: false, errors };
}

/**
 * Validate request body and return parsed data or send error response
 */
export async function validateBody<T>(
  schema: ZodSchema<T>,
  req: NextApiRequest,
  res: NextApiResponse
): Promise<T | null> {
  const result = validate(schema, req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.errors,
    });
    return null;
  }

  return result.data!;
}

/**
 * Validate query parameters
 */
export async function validateQuery<T>(
  schema: ZodSchema<T>,
  req: NextApiRequest,
  res: NextApiResponse
): Promise<T | null> {
  const result = validate(schema, req.query);

  if (!result.success) {
    res.status(400).json({
      error: 'Invalid query parameters',
      details: result.errors,
    });
    return null;
  }

  return result.data!;
}

/**
 * Create a validated API handler wrapper
 */
export function withValidation<TBody, TQuery = unknown>(
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>
) {
  return function (
    handler: (
      req: NextApiRequest,
      res: NextApiResponse,
      body: TBody,
      query: TQuery
    ) => Promise<void>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      let body: TBody = undefined as TBody;
      let query: TQuery = undefined as TQuery;

      // Validate body if schema provided
      if (bodySchema && req.method !== 'GET') {
        const bodyResult = validate(bodySchema, req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            error: 'Validation failed',
            details: bodyResult.errors,
          });
        }
        body = bodyResult.data!;
      }

      // Validate query if schema provided
      if (querySchema) {
        const queryResult = validate(querySchema, req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            error: 'Invalid query parameters',
            details: queryResult.errors,
          });
        }
        query = queryResult.data!;
      }

      return handler(req, res, body, query);
    };
  };
}
