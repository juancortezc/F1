
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'PUT') {
    try {
      const { name, imageUrl } = req.body;
      
      // Validate required fields
      if (!name || !imageUrl) {
        return res.status(400).json({ error: 'Name and imageUrl are required' });
      }
      
      // Validate name length
      if (name.trim().length < 1 || name.trim().length > 50) {
        return res.status(400).json({ error: 'Name must be between 1 and 50 characters' });
      }
      
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid image URL format' });
      }
      
      const updatedPlayer = await prisma.player.update({
        where: { id },
        data: { name: name.trim(), imageUrl },
      });
      res.status(200).json(updatedPlayer);
    } catch (error: any) {
      console.error('Failed to update player:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.status(500).json({ error: 'Failed to update player' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.player.delete({
        where: { id },
      });
      res.status(204).end();
    } catch (error: any) {
      console.error('Failed to delete player:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.status(500).json({ error: 'Failed to delete player' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
