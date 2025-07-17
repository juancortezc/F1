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
      const newCircuit = await prisma.circuit.create({
        data: { 
            name, 
            imageUrl,
            historicalBestLap: null,
            historicalBestAverage: null,
         },
      });
      res.status(201).json(newCircuit);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create circuit' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}