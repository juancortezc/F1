
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GameState } from '../../../types';

// Helper function to check and update historical records
async function checkAndUpdateRecords(gameState: GameState) {
    if (!gameState.lapTimesLog || gameState.lapTimesLog.length === 0) {
        return; // No lap times to check
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'PUT') {
        try {
            const { id, state, status } = req.body as {id: string, state?: GameState, status?: 'ACTIVE' | 'COMPLETED'};
            
            if (!id) {
                return res.status(400).json({ error: 'Game ID is required.' });
            }

            // If we have a new game state, check for historical records
            if (state) {
                await checkAndUpdateRecords(state);
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
