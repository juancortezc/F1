
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers, savePlayers } from '../../../lib/players-db';
import { Player } from '../../../types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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
      
      const players = getPlayers();
      const playerIndex = players.findIndex(p => p.id === id);
      
      if (playerIndex === -1) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      // Check for duplicate PIN (excluding current player)
      if (players.some(p => p.pin === pin && p.id !== id)) {
        return res.status(400).json({ error: 'PIN already exists. Please choose a different PIN.' });
      }
      
      const updatedPlayer: Player = {
        ...players[playerIndex],
        name: name.trim(),
        imageUrl,
        pin
      };
      
      players[playerIndex] = updatedPlayer;
      savePlayers(players);
      
      res.status(200).json(updatedPlayer);
    } catch (error) {
      console.error('Failed to update player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const players = getPlayers();
      const playerIndex = players.findIndex(p => p.id === id);
      
      if (playerIndex === -1) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      players.splice(playerIndex, 1);
      savePlayers(players);
      
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
