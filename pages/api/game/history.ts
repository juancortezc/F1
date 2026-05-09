
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            // Get settings to check for cutoff date
            const settings = await prisma.settings.findUnique({
                where: { id: 'singleton' },
            });

            const cutoffDate = settings?.historicalCutoffDate;

            // Build query with optional cutoff date filter
            const whereClause: { status: string; updatedAt?: { gte: Date } } = {
                status: 'COMPLETED'
            };

            if (cutoffDate) {
                whereClause.updatedAt = { gte: cutoffDate };
            }

            const completedGames = await prisma.game.findMany({
                where: whereClause,
                orderBy: { updatedAt: 'desc' },
            });

            // Optimize the response by removing heavy fields not needed for Hall of Fame
            const optimizedGames = completedGames.map(game => {
                const gameState = game.state as any; // Cast to any to handle Prisma JSON type
                return {
                    id: game.id,
                    status: game.status,
                    gameMode: (game as any).gameMode,
                    tournamentId: (game as any).tournamentId,
                    createdAt: game.createdAt,
                    updatedAt: game.updatedAt,
                    state: gameState ? {
                        // Keep only essential fields for Hall of Fame calculations
                        playerStats: gameState.playerStats,
                        circuitResults: gameState.circuitResults,
                        circuits: gameState.circuits,
                        sessionBestTimes: gameState.sessionBestTimes, // Needed for VR/PR counting
                        settings: gameState.settings ? {
                            players: gameState.settings.players,
                            circuits: gameState.settings.circuits,
                            turnsPerCircuit: gameState.settings.turnsPerCircuit,
                            pointsForBestLap: gameState.settings.pointsForBestLap,
                            pointsForBestAverage: gameState.settings.pointsForBestAverage
                        } : undefined
                        // Remove heavy fields: lapTimesLog, etc.
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
