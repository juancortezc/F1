import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withSecurity } from '../../../lib/security';
import { UserRole, UserSession, AuthenticationRequest } from '../../../types';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { pin, role, adminName }: AuthenticationRequest = req.body;
  
  if (!pin || !role) {
    return res.status(400).json({ error: 'PIN and role are required' });
  }
  
  try {
    // Get admin PIN from settings
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' }
    });
    
    if (role === 'organizer') {
      // Organizer must use admin PIN
      if (!settings || settings.pin !== pin) {
        return res.status(401).json({ error: 'Invalid organizer credentials' });
      }
      
      const userSession: UserSession = {
        userId: 'admin',
        name: adminName || 'Organizador',
        role: 'organizer'
      };
      
      return res.status(200).json({ user: userSession });
    } else if (role === 'player') {
      // Player authentication
      const authenticatedPlayer = await prisma.player.findFirst({
        where: { pin, isActive: true }
      });
      
      if (!authenticatedPlayer) {
        return res.status(401).json({ error: 'Invalid player credentials' });
      }
      
      const userSession: UserSession = {
        userId: authenticatedPlayer.id,
        name: authenticatedPlayer.name,
        role: 'player'
      };
      
      return res.status(200).json({ user: userSession });
    } else {
      return res.status(400).json({ error: 'Invalid role specified' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSecurity(handler);