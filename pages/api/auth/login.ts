import { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers } from '../../../lib/players-db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { pin } = req.body;
  
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }
  
  const players = getPlayers();
  const player = players.find(p => p.pin === pin && p.isActive);
  
  if (!player) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  
  // En producción aquí generarías un JWT o session token
  return res.status(200).json({
    user: {
      id: player.id,
      name: player.name
    }
  });
}