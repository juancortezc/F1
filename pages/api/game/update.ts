
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'PUT') {
        try {
            const { id, state, status } = req.body as {id: string, state?: GameState, status?: 'ACTIVE' | 'COMPLETED'};
            
            if (!id) {
                return res.status(400).json({ error: 'Game ID is required.' });
            }

            const game = await prisma.game.update({
                where: { id },
                data: {
                    state: state ? (state as any) : undefined,
                    status: status || undefined,
                }
            });
            res.status(200).json(game);
        } catch (error) {
            console.error("Game update error:", error);
            res.status(500).json({ error: 'Failed to update game' });
        }
    } else {
        res.setHeader('Allow', ['PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
