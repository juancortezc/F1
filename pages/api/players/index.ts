
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers, createPlayer, setPinForPlayer, isPinTaken } from '../../../lib/players-db';
import { Player } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const players = await getPlayers();
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
      
      // Check for duplicate PIN
      if (isPinTaken(pin)) {
        return res.status(400).json({ error: 'PIN already exists. Please choose a different PIN.' });
      }
      
      const newPlayer = await createPlayer({
        name: name.trim(),
        imageUrl,
        pin
      });
      
      // Store PIN in memory for authentication
      setPinForPlayer(newPlayer.id, pin);
      
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
