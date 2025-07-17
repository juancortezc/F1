
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const activeGame = await prisma.game.findFirst({
                where: { status: 'ACTIVE' },
            });
            res.status(200).json({ game: activeGame });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch active game' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
