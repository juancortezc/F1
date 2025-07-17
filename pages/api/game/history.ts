
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const completedGames = await prisma.game.findMany({
                where: { status: 'COMPLETED' },
                orderBy: { updatedAt: 'desc' },
            });
            res.status(200).json(completedGames);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch game history' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
