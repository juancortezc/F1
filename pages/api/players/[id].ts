
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPlayerById, setPinForPlayer, isPinTaken } from '../../../lib/players-db';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'PUT') {
    try {
      const { name, imageUrl, pin } = req.body;
      
      // Validate required fields
      if (!name || !imageUrl || !pin) {
        return res.status(400).json({ error: 'Name, imageUrl, and pin are required' });
      }
      
      // Validate name length
      if (name.trim().length < 1 || name.trim().length > 50) {
        return res.status(400).json({ error: 'Name must be between 1 and 50 characters' });
      }
      
      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
      }
      
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid image URL format' });
      }
      
      // Check if player exists
      const existingPlayer = await getPlayerById(id);
      if (!existingPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      // Check for duplicate PIN (excluding current player)
      if (isPinTaken(pin) && existingPlayer.pin !== pin) {
        return res.status(400).json({ error: 'PIN already exists. Please choose a different PIN.' });
      }
      
      // Update player in database
      const updatedPlayer = await prisma.player.update({
        where: { id },
        data: {
          name: name.trim(),
          imageUrl
        }
      });
      
      // Update PIN in memory
      setPinForPlayer(id, pin);
      
      const response = {
        id: updatedPlayer.id,
        name: updatedPlayer.name,
        imageUrl: updatedPlayer.imageUrl,
        pin,
        isActive: true
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Failed to update player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if player exists
      const existingPlayer = await getPlayerById(id);
      if (!existingPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      // Delete player from database
      await prisma.player.delete({
        where: { id }
      });
      
      res.status(204).end();
    } catch (error) {
      console.error('Failed to delete player:', error);
      res.status(500).json({ error: 'Failed to delete player' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
