/**
 * Prisma implementation of PlayerRepository
 */

import type { PrismaClient } from '@prisma/client';
import type { Player } from '../../../domain/entities';
import type {
  IPlayerRepository,
  CreatePlayerDTO,
  UpdatePlayerDTO,
} from '../interfaces/IPlayerRepository';

export class PrismaPlayerRepository implements IPlayerRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(includeInactive = false): Promise<Player[]> {
    const where = includeInactive ? {} : { isActive: true };
    const players = await this.prisma.player.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return players as Player[];
  }

  async findAllActive(): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: {
        isActive: true,
        isGuest: false,
      },
      orderBy: { name: 'asc' },
    });
    return players as Player[];
  }

  async findAllGuests(): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: {
        isActive: true,
        isGuest: true,
      },
      orderBy: { name: 'asc' },
    });
    return players as Player[];
  }

  async findById(id: string): Promise<Player | null> {
    const player = await this.prisma.player.findUnique({
      where: { id },
    });
    return player as Player | null;
  }

  async findByPin(pin: string): Promise<Player | null> {
    const player = await this.prisma.player.findFirst({
      where: {
        pin,
        isActive: true,
      },
    });
    return player as Player | null;
  }

  async isPinTaken(pin: string, excludePlayerId?: string): Promise<boolean> {
    const where: any = { pin };
    if (excludePlayerId) {
      where.id = { not: excludePlayerId };
    }
    const count = await this.prisma.player.count({ where });
    return count > 0;
  }

  async create(data: CreatePlayerDTO): Promise<Player> {
    const player = await this.prisma.player.create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl,
        pin: data.pin,
        isGuest: data.isGuest ?? false,
        isActive: data.isActive ?? true,
      },
    });
    return player as Player;
  }

  async update(id: string, data: UpdatePlayerDTO): Promise<Player> {
    const player = await this.prisma.player.update({
      where: { id },
      data,
    });
    return player as Player;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.player.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.player.delete({
      where: { id },
    });
  }

  async validatePin(pin: string): Promise<Player | null> {
    return this.findByPin(pin);
  }

  async generateGuestPin(): Promise<string> {
    // Start from 9000 for guest PINs
    let pinNumber = 9000;
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      const pin = pinNumber.toString();
      const isTaken = await this.isPinTaken(pin);
      if (!isTaken) {
        return pin;
      }
      pinNumber++;
      attempts++;
    }

    // Fallback: generate random 4-digit PIN
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    return randomPin;
  }
}
