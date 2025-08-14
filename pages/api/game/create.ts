
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState } from '../../../types';
import { sendError, sendPrismaError, validateRequired } from '../../../lib/errors';
import { withSecurity } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { state } = req.body as { state: GameState };

            // Validate required fields
            const validationError = validateRequired(req.body, ['state']);
            if (validationError) {
                return sendError(res, 400, validationError);
            }

            // Validate state structure
            if (!state.settings || !state.circuits || !Array.isArray(state.circuits)) {
                return sendError(res, 400, 'Invalid game state structure');
            }

            // Ensure any other active games are marked as completed first
            await prisma.game.updateMany({
                where: { status: 'ACTIVE' },
                data: { status: 'COMPLETED' },
            });

            const newGame = await prisma.game.create({
                data: {
                    state: state as any,
                    status: 'ACTIVE',
                },
            });
            res.status(201).json(newGame);
        } catch (error) {
            sendPrismaError(res, error);
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withSecurity(handler);
