/**
 * Prisma implementation of LapTimeRepository
 */

import type { PrismaClient } from '@prisma/client';
import type {
  ILapTimeRepository,
  IndividualLapTime,
  TurnCompletion,
  CreateLapTimeDTO,
  CreateTurnCompletionDTO,
  LapTimeFilters,
} from '../interfaces/ILapTimeRepository';

export class PrismaLapTimeRepository implements ILapTimeRepository {
  constructor(private prisma: PrismaClient) {}

  async saveLapTime(data: CreateLapTimeDTO): Promise<IndividualLapTime> {
    const lapTime = await this.prisma.individualLapTime.create({
      data: {
        gameId: data.gameId,
        playerId: data.playerId,
        circuitId: data.circuitId,
        turnNumber: data.turnNumber,
        lapNumber: data.lapNumber,
        timeMs: data.timeMs,
      },
    });
    return lapTime as IndividualLapTime;
  }

  async upsertLapTime(data: CreateLapTimeDTO): Promise<IndividualLapTime> {
    const lapTime = await this.prisma.individualLapTime.upsert({
      where: {
        gameId_playerId_circuitId_turnNumber_lapNumber: {
          gameId: data.gameId,
          playerId: data.playerId,
          circuitId: data.circuitId,
          turnNumber: data.turnNumber,
          lapNumber: data.lapNumber,
        },
      },
      update: {
        timeMs: data.timeMs,
      },
      create: {
        gameId: data.gameId,
        playerId: data.playerId,
        circuitId: data.circuitId,
        turnNumber: data.turnNumber,
        lapNumber: data.lapNumber,
        timeMs: data.timeMs,
      },
    });
    return lapTime as IndividualLapTime;
  }

  async findLapTimes(filters: LapTimeFilters): Promise<IndividualLapTime[]> {
    const where: any = {};

    if (filters.gameId) where.gameId = filters.gameId;
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.circuitId) where.circuitId = filters.circuitId;
    if (filters.turnNumber) where.turnNumber = filters.turnNumber;

    const lapTimes = await this.prisma.individualLapTime.findMany({
      where,
      orderBy: [
        { turnNumber: 'asc' },
        { lapNumber: 'asc' },
      ],
    });

    return lapTimes as IndividualLapTime[];
  }

  async findByTurn(
    gameId: string,
    playerId: string,
    circuitId: string,
    turnNumber: number
  ): Promise<IndividualLapTime[]> {
    const lapTimes = await this.prisma.individualLapTime.findMany({
      where: {
        gameId,
        playerId,
        circuitId,
        turnNumber,
      },
      orderBy: { lapNumber: 'asc' },
    });

    return lapTimes as IndividualLapTime[];
  }

  async saveTurnCompletion(data: CreateTurnCompletionDTO): Promise<TurnCompletion> {
    // Note: Prisma schema TurnCompletion doesn't have lapTimes or bestLapMs fields
    // Those are computed from IndividualLapTime records
    const turnCompletion = await this.prisma.turnCompletion.upsert({
      where: {
        gameId_playerId_circuitId_turnNumber: {
          gameId: data.gameId,
          playerId: data.playerId,
          circuitId: data.circuitId,
          turnNumber: data.turnNumber,
        },
      },
      update: {
        averageTimeMs: data.averageTimeMs,
        turnScore: data.turnScore,
        isCompleted: true,
        completedAt: new Date(),
      },
      create: {
        gameId: data.gameId,
        playerId: data.playerId,
        circuitId: data.circuitId,
        turnNumber: data.turnNumber,
        averageTimeMs: data.averageTimeMs,
        turnScore: data.turnScore,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Return with computed fields from input
    return {
      ...turnCompletion,
      lapTimes: data.lapTimes,
      bestLapMs: data.bestLapMs,
    } as unknown as TurnCompletion;
  }

  async findTurnCompletions(filters: LapTimeFilters): Promise<TurnCompletion[]> {
    const where: any = {};

    if (filters.gameId) where.gameId = filters.gameId;
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.circuitId) where.circuitId = filters.circuitId;
    if (filters.turnNumber) where.turnNumber = filters.turnNumber;

    const completions = await this.prisma.turnCompletion.findMany({
      where,
      orderBy: { turnNumber: 'asc' },
    });

    return completions as unknown as TurnCompletion[];
  }

  async findByGame(gameId: string): Promise<IndividualLapTime[]> {
    const lapTimes = await this.prisma.individualLapTime.findMany({
      where: { gameId },
      orderBy: [
        { turnNumber: 'asc' },
        { lapNumber: 'asc' },
      ],
    });

    return lapTimes as IndividualLapTime[];
  }

  async findByPlayer(playerId: string): Promise<IndividualLapTime[]> {
    const lapTimes = await this.prisma.individualLapTime.findMany({
      where: { playerId },
      orderBy: [
        { createdAt: 'desc' },
        { turnNumber: 'asc' },
        { lapNumber: 'asc' },
      ],
    });

    return lapTimes as IndividualLapTime[];
  }

  async getLiveData(
    gameId: string,
    circuitId: string
  ): Promise<{
    lapTimes: IndividualLapTime[];
    turnCompletions: TurnCompletion[];
  }> {
    const [lapTimes, turnCompletions] = await Promise.all([
      this.prisma.individualLapTime.findMany({
        where: { gameId, circuitId },
        orderBy: [
          { turnNumber: 'asc' },
          { playerId: 'asc' },
          { lapNumber: 'asc' },
        ],
      }),
      this.prisma.turnCompletion.findMany({
        where: { gameId, circuitId },
        orderBy: { turnNumber: 'asc' },
      }),
    ]);

    return {
      lapTimes: lapTimes as IndividualLapTime[],
      turnCompletions: turnCompletions as unknown as TurnCompletion[],
    };
  }

  async deleteByGame(gameId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.individualLapTime.deleteMany({ where: { gameId } }),
      this.prisma.turnCompletion.deleteMany({ where: { gameId } }),
    ]);
  }

  async deleteByTurn(
    gameId: string,
    playerId: string,
    circuitId: string,
    turnNumber: number
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.individualLapTime.deleteMany({
        where: { gameId, playerId, circuitId, turnNumber },
      }),
      this.prisma.turnCompletion.deleteMany({
        where: { gameId, playerId, circuitId, turnNumber },
      }),
    ]);
  }

  async getBestLapForCircuit(circuitId: string): Promise<IndividualLapTime | null> {
    const lapTime = await this.prisma.individualLapTime.findFirst({
      where: { circuitId },
      orderBy: { timeMs: 'asc' },
    });

    return lapTime as IndividualLapTime | null;
  }

  async getBestAverageForCircuit(circuitId: string): Promise<TurnCompletion | null> {
    const completion = await this.prisma.turnCompletion.findFirst({
      where: { circuitId },
      orderBy: { averageTimeMs: 'asc' },
    });

    return completion as unknown as TurnCompletion | null;
  }
}
