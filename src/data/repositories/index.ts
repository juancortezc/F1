// Export interfaces
export * from './interfaces';

// Export Prisma implementations
export * from './prisma';

// Factory functions for creating repositories
import { PrismaClient } from '@prisma/client';
import { PrismaPlayerRepository } from './prisma/PlayerRepository';
import { PrismaCircuitRepository } from './prisma/CircuitRepository';
import { PrismaGameRepository } from './prisma/GameRepository';
import { PrismaLapTimeRepository } from './prisma/LapTimeRepository';
import prisma from '../prisma';

// Singleton instances using default Prisma client
let playerRepository: PrismaPlayerRepository | null = null;
let circuitRepository: PrismaCircuitRepository | null = null;
let gameRepository: PrismaGameRepository | null = null;
let lapTimeRepository: PrismaLapTimeRepository | null = null;

export function getPlayerRepository(client?: PrismaClient): PrismaPlayerRepository {
  if (client) {
    return new PrismaPlayerRepository(client);
  }
  if (!playerRepository) {
    playerRepository = new PrismaPlayerRepository(prisma);
  }
  return playerRepository;
}

export function getCircuitRepository(client?: PrismaClient): PrismaCircuitRepository {
  if (client) {
    return new PrismaCircuitRepository(client);
  }
  if (!circuitRepository) {
    circuitRepository = new PrismaCircuitRepository(prisma);
  }
  return circuitRepository;
}

export function getGameRepository(client?: PrismaClient): PrismaGameRepository {
  if (client) {
    return new PrismaGameRepository(client);
  }
  if (!gameRepository) {
    gameRepository = new PrismaGameRepository(prisma);
  }
  return gameRepository;
}

export function getLapTimeRepository(client?: PrismaClient): PrismaLapTimeRepository {
  if (client) {
    return new PrismaLapTimeRepository(client);
  }
  if (!lapTimeRepository) {
    lapTimeRepository = new PrismaLapTimeRepository(prisma);
  }
  return lapTimeRepository;
}
