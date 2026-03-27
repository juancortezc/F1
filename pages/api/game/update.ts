
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState } from '../../../types';
import { sendError, sendPrismaError, validateRequired } from '../../../lib/errors';
import { withSecurity } from '../../../lib/security';

// Helper function to check and update historical records
async function checkAndUpdateRecords(gameState: GameState) {
    // Validate required fields exist
    if (!gameState.lapTimesLog || gameState.lapTimesLog.length === 0) {
        console.log('[update.ts] No lapTimesLog found - skipping record check');
        return;
    }

    if (!gameState.circuitResults || !gameState.circuits) {
        console.warn('[update.ts] Missing circuitResults or circuits - cannot check records');
        return;
    }

    // Get all circuits to check for records
    const circuits = await prisma.circuit.findMany();
    const circuitMap = new Map(circuits.map(c => [c.name, c]));

    // Group lap times by circuit
    const lapsByCircuit = new Map<string, number[]>();
    const averagesByCircuit = new Map<string, number[]>();

    gameState.lapTimesLog.forEach(log => {
        if (!lapsByCircuit.has(log.circuitName)) {
            lapsByCircuit.set(log.circuitName, []);
            averagesByCircuit.set(log.circuitName, []);
        }
        lapsByCircuit.get(log.circuitName)!.push(log.time);
    });

    // Calculate averages per turn for each circuit
    gameState.circuitResults.forEach((circuitResult, index) => {
        const circuitName = gameState.circuits[index]?.name;
        if (!circuitName) return;

        circuitResult.turns.forEach(turn => {
            turn.forEach(turnResult => {
                if (turnResult.averageTime && turnResult.averageTime > 0) {
                    if (!averagesByCircuit.has(circuitName)) {
                        averagesByCircuit.set(circuitName, []);
                    }
                    averagesByCircuit.get(circuitName)!.push(turnResult.averageTime);
                }
            });
        });
    });

    // Check for new records and update circuits
    for (const [circuitName, lapTimes] of lapsByCircuit) {
        const circuit = circuitMap.get(circuitName);
        if (!circuit || lapTimes.length === 0) continue;

        const bestLapTime = Math.min(...lapTimes);
        const averageTimes = averagesByCircuit.get(circuitName) || [];
        const bestAverageTime = averageTimes.length > 0 ? Math.min(...averageTimes) : null;

        let needsUpdate = false;
        const updateData: any = {};

        // Check for new best lap record
        if (!circuit.historicalBestLap || bestLapTime < circuit.historicalBestLap) {
            updateData.historicalBestLap = bestLapTime;
            updateData.historicalBestLapDate = new Date();
            // Find the player who achieved this time
            const recordLog = gameState.lapTimesLog.find(log => 
                log.circuitName === circuitName && log.time === bestLapTime
            );
            if (recordLog) {
                updateData.bestLapHolderId = recordLog.playerId;
            }
            needsUpdate = true;
        }

        // Check for new best average record
        if (bestAverageTime && (!circuit.historicalBestAverage || bestAverageTime < circuit.historicalBestAverage)) {
            updateData.historicalBestAverage = bestAverageTime;
            updateData.historicalBestAverageDate = new Date();
            // Find the player who achieved this average
            let recordTurn = null;
            for (const circuitResult of gameState.circuitResults) {
                const foundTurn = circuitResult.turns.flat().find(turn => 
                    turn.averageTime === bestAverageTime
                );
                if (foundTurn) {
                    recordTurn = foundTurn;
                    break;
                }
            }
            if (recordTurn) {
                updateData.bestAverageHolderId = recordTurn.playerId;
            }
            needsUpdate = true;
        }

        // Update the circuit if there are new records
        if (needsUpdate) {
            await prisma.circuit.update({
                where: { id: circuit.id },
                data: updateData
            });
        }
    }
}

// Helper function to update tournament when a championship game is completed
async function updateTournamentOnGameComplete(gameId: string, gameState: GameState) {
    // Get the game to check if it's part of a tournament
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { tournamentId: true, gameMode: true }
    });

    if (!game?.tournamentId || game.gameMode !== 'tournament') {
        return; // Not a tournament game
    }

    // Get the tournament
    const tournament = await prisma.tournament.findUnique({
        where: { id: game.tournamentId },
        include: { participants: true }
    });

    if (!tournament || tournament.status !== 'ACTIVE') {
        return;
    }

    // Get circuit IDs from this game
    const circuitIds = gameState.circuits.map(c => c.id);

    // Update playedCircuitIds
    const updatedPlayedCircuitIds = [...new Set([...tournament.playedCircuitIds, ...circuitIds])];

    // Calculate final standings from gameState
    const playerStats = gameState.playerStats || {};
    const standings = Object.entries(playerStats)
        .map(([playerId, stats]: [string, any]) => ({
            playerId,
            totalScore: stats.totalScore || 0
        }))
        .sort((a, b) => b.totalScore - a.totalScore);

    // Update tournament participants with points
    for (let i = 0; i < standings.length; i++) {
        const { playerId } = standings[i];
        const participant = tournament.participants.find(p => p.playerId === playerId);

        if (participant) {
            let pointsToAdd = 0;
            let wonIncrement = 0;
            let secondIncrement = 0;
            let thirdIncrement = 0;

            if (i === 0) {
                pointsToAdd = tournament.pointsForFirst;
                wonIncrement = 1;
            } else if (i === 1) {
                pointsToAdd = tournament.pointsForSecond;
                secondIncrement = 1;
            } else if (i === 2) {
                pointsToAdd = tournament.pointsForThird;
                thirdIncrement = 1;
            }

            await prisma.tournamentParticipant.update({
                where: { id: participant.id },
                data: {
                    totalPoints: { increment: pointsToAdd },
                    championshipsPlayed: { increment: 1 },
                    championshipsWon: { increment: wonIncrement },
                    championshipsSecond: { increment: secondIncrement },
                    championshipsThird: { increment: thirdIncrement },
                }
            });
        }
    }

    // Check if tournament is complete (all circuits played)
    const totalCircuits = await prisma.circuit.count();
    const isComplete = updatedPlayedCircuitIds.length >= totalCircuits;

    // Update tournament
    await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
            playedCircuitIds: updatedPlayedCircuitIds,
            status: isComplete ? 'COMPLETED' : 'ACTIVE',
            endDate: isComplete ? new Date() : undefined,
        }
    });

    console.log(`[update.ts] Tournament ${tournament.id} updated: ${updatedPlayedCircuitIds.length}/${totalCircuits} circuits played`);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'PUT') {
        try {
            const { id, state, status } = req.body as {id: string, state?: GameState, status?: 'ACTIVE' | 'COMPLETED'};

            const validationError = validateRequired(req.body, ['id']);
            if (validationError) {
                return sendError(res, 400, validationError);
            }

            // Validate status if provided
            if (status && !['ACTIVE', 'COMPLETED'].includes(status)) {
                return sendError(res, 400, 'Invalid status. Must be ACTIVE or COMPLETED');
            }

            // If we have a new game state, check for historical records
            if (state) {
                await checkAndUpdateRecords(state);
            }

            // If completing the game and it's a tournament game, update tournament
            if (status === 'COMPLETED' && state) {
                await updateTournamentOnGameComplete(id, state);
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
            sendPrismaError(res, error);
        }
    } else {
        res.setHeader('Allow', ['PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withSecurity(handler);
