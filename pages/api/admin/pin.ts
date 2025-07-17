
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    try {
      const { pin } = req.body;
      if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be a 4-digit string.' });
      }
      await prisma.setting.upsert({
        where: { id: 'singleton' },
        update: { pin },
        create: { id: 'singleton', pin },
      });
      res.status(200).json({ message: 'PIN updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update PIN' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
