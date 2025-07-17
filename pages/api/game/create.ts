
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { state } = req.body as { state: GameState };

            // Ensure any other active games are marked as completed first
            await prisma.game.updateMany({
                where: { status: 'ACTIVE' },
                data: { status: 'COMPLETED' },
            });

            const newGame = await prisma.game.create({
                data: {
                    state: state as any, // Cast to any to satisfy Prisma's JsonValue type
                    status: 'ACTIVE',
                },
            });
            res.status(201).json(newGame);
        } catch (error) {
            console.error("Game creation error:", error);
            res.status(500).json({ error: 'Failed to create game' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
