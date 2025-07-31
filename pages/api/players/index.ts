
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers, savePlayers } from '../../../lib/players-db';
import { Player } from '../../../types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const players = getPlayers();
      res.status(200).json(players);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  } else if (req.method === 'POST') {
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
      
      // Check for duplicate PIN
      if (players.some(p => p.pin === pin)) {
        return res.status(400).json({ error: 'PIN already exists. Please choose a different PIN.' });
      }
      
      // Generate new ID
      const maxId = players.length > 0 ? Math.max(...players.map(p => parseInt(p.id))) : 0;
      const newId = (maxId + 1).toString();
      
      const newPlayer: Player = {
        id: newId,
        name: name.trim(),
        imageUrl,
        pin,
        isActive: true
      };
      
      players.push(newPlayer);
      savePlayers(players);
      
      res.status(201).json(newPlayer);
    } catch (error) {
      console.error('Failed to create player:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
