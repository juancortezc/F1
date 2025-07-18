import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface RecordCheckRequest {
  circuitId: string;
  playerId: string;
  lapTime?: number;
  averageTime?: number;
}

interface RecordCheckResponse {
  newRecords: {
    isNewBestLap: boolean;
    isNewBestAverage: boolean;
    previousBestLap?: number;
    previousBestAverage?: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<RecordCheckResponse | { error: string }>) {
  if (req.method === 'POST') {
    try {
      const { circuitId, playerId, lapTime, averageTime } = req.body as RecordCheckRequest;
      
      if (!circuitId || !playerId) {
        return res.status(400).json({ error: 'Circuit ID and Player ID are required' });
      }

      // Get current circuit records
      const circuit = await prisma.circuit.findUnique({
        where: { id: circuitId }
      });

      if (!circuit) {
        return res.status(404).json({ error: 'Circuit not found' });
      }

      const newRecords = {
        isNewBestLap: false,
        isNewBestAverage: false,
        previousBestLap: circuit.historicalBestLap || undefined,
        previousBestAverage: circuit.historicalBestAverage || undefined,
      };

      // Check if the lap time is a new record
      if (lapTime && (!circuit.historicalBestLap || lapTime < circuit.historicalBestLap)) {
        newRecords.isNewBestLap = true;
      }

      // Check if the average time is a new record
      if (averageTime && (!circuit.historicalBestAverage || averageTime < circuit.historicalBestAverage)) {
        newRecords.isNewBestAverage = true;
      }

      res.status(200).json({ newRecords });
    } catch (error) {
      console.error('Record check error:', error);
      res.status(500).json({ error: 'Failed to check records' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}