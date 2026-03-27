
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState } from '../../../types';
import { sendError, sendPrismaError, validateRequired } from '../../../lib/errors';
import { withSecurity } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { state, gameMode, tournamentId, position } = req.body as {
                state: GameState;
                gameMode?: 'quick' | 'custom' | 'tournament';
                tournamentId?: string;
                position?: number;
            };

            // Validate required fields
            const validationError = validateRequired(req.body, ['state']);
            if (validationError) {
                return sendError(res, 400, validationError);
            }

            // Validate state structure
            if (!state.settings || !state.circuits || !Array.isArray(state.circuits)) {
                return sendError(res, 400, 'Invalid game state structure');
            }

            // Si es un juego de torneo, validar que el torneo existe y está activo
            if (gameMode === 'tournament' && tournamentId) {
                const tournament = await prisma.tournament.findUnique({
                    where: { id: tournamentId }
                });

                if (!tournament) {
                    return sendError(res, 404, 'Tournament not found');
                }

                if (tournament.status !== 'ACTIVE') {
                    return sendError(res, 400, 'Tournament is not active');
                }

                // Validar que los circuitos seleccionados no han sido jugados
                const selectedCircuitIds = state.circuits.map(c => c.id);
                const alreadyPlayed = selectedCircuitIds.filter(id =>
                    tournament.playedCircuitIds.includes(id)
                );

                if (alreadyPlayed.length > 0) {
                    return sendError(res, 400, 'Some circuits have already been played in this tournament');
                }
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
                    gameMode: gameMode || 'custom',
                    tournamentId: tournamentId || null,
                    position: position || null,
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
