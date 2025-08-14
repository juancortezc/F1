import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withSecurity } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { pin, adminName } = req.body;
  
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }
  
  try {
    // First, check if it's the admin PIN
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' }
    });
    
    if (settings && settings.pin === pin) {
      // Admin login - use provided name or default
      return res.status(200).json({
        user: {
          id: 'admin',
          name: adminName || 'Administrador'
        }
      });
    }
    
    // Then check registered players by PIN directly from database
    const authenticatedPlayer = await prisma.player.findFirst({
      where: { pin }
    });
    
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

export default withSecurity(handler);