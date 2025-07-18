
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { verifyAdminPinChange } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    try {
      const { currentPin, newPin } = req.body;
      
      // Validate request structure
      if (!currentPin || !newPin) {
        return res.status(400).json({ 
          error: 'Both currentPin and newPin are required for PIN change' 
        });
      }
      
      // Verify PIN change using authentication utility
      const verification = await verifyAdminPinChange(currentPin, newPin);
      
      if (!verification.success) {
        return res.status(401).json({ error: verification.error });
      }
      
      // Update PIN in database
      await prisma.settings.upsert({
        where: { id: 'singleton' },
        update: { pin: newPin },
        create: { id: 'singleton', pin: newPin },
      });
      
      res.status(200).json({ message: 'PIN updated successfully' });
    } catch (error) {
      console.error('PIN update error:', error);
      res.status(500).json({ error: 'Failed to update PIN' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
