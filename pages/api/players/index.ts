
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const players = await prisma.player.findMany({
        orderBy: { createdAt: 'asc' },
      });
      res.status(200).json(players);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, imageUrl } = req.body;
      const newPlayer = await prisma.player.create({
        data: { name, imageUrl },
      });
      res.status(201).json(newPlayer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create player' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
