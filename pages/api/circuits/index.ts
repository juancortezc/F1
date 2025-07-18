import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const circuits = await prisma.circuit.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json(circuits);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch circuits' });
    }
  } else if (req.method === 'POST') {
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

      const newCircuit = await prisma.circuit.create({
        data: { 
            name: name.trim(), 
            imageUrl,
         },
      });
      res.status(201).json(newCircuit);
    } catch (error) {
      console.error('Failed to create circuit:', error);
      res.status(500).json({ error: 'Failed to create circuit' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}