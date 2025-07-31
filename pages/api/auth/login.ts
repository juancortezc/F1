import { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers, validatePlayerPin } from '../../../lib/players-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { pin } = req.body;
  
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }
  
  try {
    const players = await getPlayers();
    
    // Find player by checking PIN against memory
    let authenticatedPlayer = null;
    for (const player of players) {
      if (validatePlayerPin(player.id, pin)) {
        authenticatedPlayer = player;
        break;
      }
    }
    
    if (!authenticatedPlayer) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    // En producción aquí generarías un JWT o session token
    return res.status(200).json({
      user: {
        id: authenticatedPlayer.id,
        name: authenticatedPlayer.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}