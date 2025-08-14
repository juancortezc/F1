import type { NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export function handlePrismaError(error: unknown): ApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return {
          error: 'Record not found',
          code: 'NOT_FOUND'
        };
      case 'P2002':
        return {
          error: 'A record with this value already exists',
          code: 'DUPLICATE'
        };
      case 'P2003':
        return {
          error: 'Foreign key constraint failed',
          code: 'CONSTRAINT_FAILED'
        };
      case 'P2014':
        return {
          error: 'Invalid ID provided',
          code: 'INVALID_ID'
        };
      default:
        return {
          error: 'Database operation failed',
          code: error.code,
          details: error.message
        };
    }
  }
  
  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'GENERAL_ERROR'
    };
  }
  
  return {
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR'
  };
}

export function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  details?: string,
  code?: string
): void {
  console.error(`API Error [${status}]:`, { message, details, code });
  res.status(status).json({
    error: message,
    ...(details && { details }),
    ...(code && { code })
  });
}

export function sendPrismaError(res: NextApiResponse, error: unknown): void {
  const apiError = handlePrismaError(error);
  const status = apiError.code === 'NOT_FOUND' ? 404 : 500;
  sendError(res, status, apiError.error, apiError.details, apiError.code);
}

export function validateRequired(
  fields: Record<string, any>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (!fields[field] || (typeof fields[field] === 'string' && !fields[field].trim())) {
      return `${field} is required`;
    }
  }
  return null;
}