
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'PUT') {
    try {
      // Only name and imageUrl can be updated from the admin UI
      const { name, imageUrl } = req.body;
      const updatedCircuit = await prisma.circuit.update({
        where: { id },
        data: { name, imageUrl },
      });
      res.status(200).json(updatedCircuit);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update circuit' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.circuit.delete({
        where: { id },
      });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete circuit' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
