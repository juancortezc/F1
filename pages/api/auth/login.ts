import { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers, validatePlayerPin } from '../../../lib/players-db';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { pin } = req.body;
  
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }
  
  try {
    // First, check if it's the admin PIN
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' }
    });
    
    if (settings && settings.pin === pin) {
      // Admin login
      return res.status(200).json({
        user: {
          id: 'admin',
          name: 'Administrador'
        }
      });
    }
    
    // Then check registered players
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
    
    // Player login
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