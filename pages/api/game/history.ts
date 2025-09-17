
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const completedGames = await prisma.game.findMany({
                where: { status: 'COMPLETED' },
                orderBy: { updatedAt: 'desc' },
            });
            
            // Optimize the response by removing heavy fields not needed for Hall of Fame
            const optimizedGames = completedGames.map(game => {
                const gameState = game.state as any; // Cast to any to handle Prisma JSON type
                return {
                    id: game.id,
                    status: game.status,
                    createdAt: game.createdAt,
                    updatedAt: game.updatedAt,
                    state: gameState ? {
                        // Keep only essential fields for Hall of Fame calculations
                        playerStats: gameState.playerStats,
                        circuitResults: gameState.circuitResults,
                        circuits: gameState.circuits,
                        settings: gameState.settings ? {
                            players: gameState.settings.players,
                            circuits: gameState.settings.circuits
                        } : undefined
                        // Remove heavy fields: lapTimesLog, sessionBestTimes, etc.
                    } : null
                };
            });
            
            res.status(200).json(optimizedGames);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch game history' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
