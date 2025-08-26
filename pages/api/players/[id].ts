
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPlayerById, updatePlayer, deletePlayer, isPinTaken } from '../../../lib/players-db';
import { withSecurity } from '../../../lib/security';
import { sendError, sendPrismaError, validateRequired } from '../../../lib/errors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return sendError(res, 400, 'Invalid ID');
  }

  if (req.method === 'PUT') {
    try {
      const { name, imageUrl, pin, isGuest = false } = req.body;
      
      // Different validation for guests vs regular players
      const requiredFields = isGuest ? ['name', 'imageUrl'] : ['name', 'imageUrl', 'pin'];
      const validationError = validateRequired(req.body, requiredFields);
      if (validationError) {
        return sendError(res, 400, validationError);
      }
      
      // Validate name length
      if (name.trim().length < 1 || name.trim().length > 50) {
        return sendError(res, 400, 'Name must be between 1 and 50 characters');
      }
      
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        return sendError(res, 400, 'Invalid image URL format');
      }
      
      // Check if player exists
      const existingPlayer = await getPlayerById(id);
      if (!existingPlayer) {
        return sendError(res, 404, 'Player not found');
      }
      
      // Handle PIN validation for regular players only
      let finalPin = pin;
      if (!isGuest) {
        // Validate PIN format for regular players
        if (!/^\d{4}$/.test(pin)) {
          return sendError(res, 400, 'PIN must be exactly 4 digits');
        }
        
        // Check for duplicate PIN (excluding current player)
        const pinTaken = await isPinTaken(pin);
        if (pinTaken) {
          // Check if the PIN belongs to the current player
          const currentPlayerWithPin = await getPlayerById(id);
          if (!currentPlayerWithPin || currentPlayerWithPin.pin !== pin) {
            return sendError(res, 400, 'PIN already exists. Please choose a different PIN.');
          }
        }
      } else {
        // For guests, keep existing PIN (don't change it)
        finalPin = existingPlayer.pin;
      }
      
      const updatedPlayer = await updatePlayer(id, {
        name: name.trim(),
        imageUrl,
        pin: finalPin,
        isGuest
      });
      
      if (!updatedPlayer) {
        return sendError(res, 500, 'Failed to update player');
      }
      
      res.status(200).json(updatedPlayer);
    } catch (error) {
      sendPrismaError(res, error);
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if player exists
      const existingPlayer = await getPlayerById(id);
      if (!existingPlayer) {
        return sendError(res, 404, 'Player not found');
      }
      
      const success = await deletePlayer(id);
      if (!success) {
        return sendError(res, 500, 'Failed to delete player');
      }
      
      res.status(204).end();
    } catch (error) {
      sendPrismaError(res, error);
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withSecurity(handler);
