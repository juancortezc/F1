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
      
      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Circuit name is required' });
      }
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'Circuit image URL is required' });
      }

      const newCircuit = await prisma.circuit.create({
        data: { 
            name: name.trim(), 
            imageUrl: imageUrl.trim(),
         },
      });
      res.status(201).json(newCircuit);
    } catch (error) {
      console.error('Error creating circuit:', error);
      res.status(500).json({ error: 'Failed to create circuit' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}