import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { circuitId, bestLap, bestAverage } = req.body;
    
    if (!circuitId) {
      return res.status(400).json({ error: 'Circuit ID is required' });
    }

    // Get current circuit records
    const currentCircuit = await prisma.circuit.findUnique({
      where: { id: circuitId }
    });

    if (!currentCircuit) {
      return res.status(404).json({ error: 'Circuit not found' });
    }

    const updates: any = {};

    // Update historical best lap if new record
    if (bestLap && (currentCircuit.historicalBestLap === null || bestLap < currentCircuit.historicalBestLap)) {
      updates.historicalBestLap = bestLap;
    }

    // Update historical best average if new record
    if (bestAverage && (currentCircuit.historicalBestAverage === null || bestAverage < currentCircuit.historicalBestAverage)) {
      updates.historicalBestAverage = bestAverage;
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      const updatedCircuit = await prisma.circuit.update({
        where: { id: circuitId },
        data: updates
      });
      
      res.status(200).json({ 
        updated: true, 
        circuit: updatedCircuit,
        changes: updates
      });
    } else {
      res.status(200).json({ 
        updated: false, 
        message: 'No new records to update' 
      });
    }

  } catch (error) {
    console.error('Failed to update circuit records:', error);
    res.status(500).json({ error: 'Failed to update circuit records' });
  }
}