/**
 * Prisma implementation of GameRepository
 */

import type { PrismaClient } from '@prisma/client';
import type { GameState } from '../../../domain/entities';
import type {
  IGameRepository,
  CreateGameDTO,
  GameWithState,
  GameStatus,
} from '../interfaces/IGameRepository';

export class PrismaGameRepository implements IGameRepository {
  constructor(private prisma: PrismaClient) {}

  private mapToGameWithState(game: any): GameWithState {
    return {
      ...game,
      state: game.state as GameState,
    };
  }

  async findActive(): Promise<GameWithState | null> {
    const game = await this.prisma.game.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!game) {
      return null;
    }

    return this.mapToGameWithState(game);
  }

  async findById(id: string): Promise<GameWithState | null> {
    const game = await this.prisma.game.findUnique({
      where: { id },
    });

    if (!game) {
      return null;
    }

    return this.mapToGameWithState(game);
  }

  async findAll(status?: GameStatus): Promise<GameWithState[]> {
    const where = status ? { status } : {};
    const games = await this.prisma.game.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return games.map(this.mapToGameWithState);
  }

  async getHistory(limit = 10): Promise<GameWithState[]> {
    const games = await this.prisma.game.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return games.map(this.mapToGameWithState);
  }

  async create(data: CreateGameDTO): Promise<GameWithState> {
    const game = await this.prisma.game.create({
      data: {
        state: data.state as any,
        status: data.status || 'ACTIVE',
      },
    });

    return this.mapToGameWithState(game);
  }

  async updateState(id: string, state: GameState): Promise<GameWithState> {
    const game = await this.prisma.game.update({
      where: { id },
      data: {
        state: state as any,
        updatedAt: new Date(),
      },
    });

    return this.mapToGameWithState(game);
  }

  async updateStatus(id: string, status: GameStatus): Promise<GameWithState> {
    const game = await this.prisma.game.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return this.mapToGameWithState(game);
  }

  async completeActive(): Promise<GameWithState | null> {
    const activeGame = await this.findActive();
    if (!activeGame) {
      return null;
    }

    return this.updateStatus(activeGame.id, 'COMPLETED');
  }

  async cancelActive(): Promise<GameWithState | null> {
    const activeGame = await this.findActive();
    if (!activeGame) {
      return null;
    }

    return this.updateStatus(activeGame.id, 'CANCELLED');
  }

  async delete(id: string): Promise<void> {
    await this.prisma.game.delete({
      where: { id },
    });
  }

  async hasActiveGame(): Promise<boolean> {
    const count = await this.prisma.game.count({
      where: { status: 'ACTIVE' },
    });
    return count > 0;
  }

  async countByStatus(status: GameStatus): Promise<number> {
    return this.prisma.game.count({
      where: { status },
    });
  }
}
