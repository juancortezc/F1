import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from './prisma';

export interface AuthenticatedRequest extends NextApiRequest {
  isAuthenticated: boolean;
}

/**
 * Validates if the provided PIN matches the stored admin PIN
 */
export async function validatePin(pin: string): Promise<boolean> {
  try {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return false;
    }
    
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' },
    });
    
    // If no settings exist, create default and compare
    if (!settings) {
      const defaultSettings = await prisma.settings.create({
        data: { id: 'singleton', pin: '2024' },
      });
      return pin === defaultSettings.pin;
    }
    
    return pin === settings.pin;
  } catch (error) {
    console.error('PIN validation error:', error);
    return false;
  }
}

/**
 * Middleware to authenticate admin requests
 * Expects a 'pin' field in request body or query params
 */
export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Extract PIN from body or query
      const pin = req.body?.pin || req.query?.pin;
      
      if (!pin) {
        return res.status(401).json({ error: 'PIN is required for authentication' });
      }
      
      const isValid = await validatePin(pin as string);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
      
      // Add authentication flag to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.isAuthenticated = true;
      
      return handler(authenticatedReq, res);
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * Utility to verify admin PIN for password changes
 * Requires both current PIN and new PIN
 */
export async function verifyAdminPinChange(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input format
    if (typeof currentPin !== 'string' || !/^\d{4}$/.test(currentPin)) {
      return { success: false, error: 'Current PIN must be a 4-digit string' };
    }
    
    if (typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'New PIN must be a 4-digit string' };
    }
    
    // Verify current PIN
    const isCurrentPinValid = await validatePin(currentPin);
    if (!isCurrentPinValid) {
      return { success: false, error: 'Current PIN is incorrect' };
    }
    
    // Prevent setting the same PIN
    if (currentPin === newPin) {
      return { success: false, error: 'New PIN must be different from current PIN' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('PIN change verification error:', error);
    return { success: false, error: 'Verification failed' };
  }
}