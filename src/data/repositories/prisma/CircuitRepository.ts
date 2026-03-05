/**
 * Prisma implementation of CircuitRepository
 */

import type { PrismaClient } from '@prisma/client';
import type { Circuit } from '../../../domain/entities';
import type {
  ICircuitRepository,
  CreateCircuitDTO,
  UpdateCircuitDTO,
  CircuitWithHolders,
} from '../interfaces/ICircuitRepository';

export class PrismaCircuitRepository implements ICircuitRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Circuit[]> {
    const circuits = await this.prisma.circuit.findMany({
      orderBy: { name: 'asc' },
    });
    return circuits as Circuit[];
  }

  async findAllWithHolders(): Promise<CircuitWithHolders[]> {
    const circuits = await this.prisma.circuit.findMany({
      orderBy: { name: 'asc' },
    });

    // Fetch holder information for each circuit
    const circuitsWithHolders = await Promise.all(
      circuits.map(async (circuit) => {
        let bestLapHolder = null;
        let bestAverageHolder = null;

        if (circuit.bestLapHolderId) {
          const player = await this.prisma.player.findUnique({
            where: { id: circuit.bestLapHolderId },
            select: { id: true, name: true },
          });
          bestLapHolder = player;
        }

        if (circuit.bestAverageHolderId) {
          const player = await this.prisma.player.findUnique({
            where: { id: circuit.bestAverageHolderId },
            select: { id: true, name: true },
          });
          bestAverageHolder = player;
        }

        return {
          ...circuit,
          bestLapHolder,
          bestAverageHolder,
        } as CircuitWithHolders;
      })
    );

    return circuitsWithHolders;
  }

  async findById(id: string): Promise<Circuit | null> {
    const circuit = await this.prisma.circuit.findUnique({
      where: { id },
    });
    return circuit as Circuit | null;
  }

  async findByIdWithHolders(id: string): Promise<CircuitWithHolders | null> {
    const circuit = await this.prisma.circuit.findUnique({
      where: { id },
    });

    if (!circuit) {
      return null;
    }

    let bestLapHolder = null;
    let bestAverageHolder = null;

    if (circuit.bestLapHolderId) {
      const player = await this.prisma.player.findUnique({
        where: { id: circuit.bestLapHolderId },
        select: { id: true, name: true },
      });
      bestLapHolder = player;
    }

    if (circuit.bestAverageHolderId) {
      const player = await this.prisma.player.findUnique({
        where: { id: circuit.bestAverageHolderId },
        select: { id: true, name: true },
      });
      bestAverageHolder = player;
    }

    return {
      ...circuit,
      bestLapHolder,
      bestAverageHolder,
    } as CircuitWithHolders;
  }

  async create(data: CreateCircuitDTO): Promise<Circuit> {
    const circuit = await this.prisma.circuit.create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl,
      },
    });
    return circuit as Circuit;
  }

  async update(id: string, data: UpdateCircuitDTO): Promise<Circuit> {
    const circuit = await this.prisma.circuit.update({
      where: { id },
      data,
    });
    return circuit as Circuit;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.circuit.delete({
      where: { id },
    });
  }

  async updateRecords(
    id: string,
    records: {
      bestLap?: number;
      bestLapHolderId?: string;
      bestAverage?: number;
      bestAverageHolderId?: string;
    }
  ): Promise<Circuit> {
    const updateData: any = {};

    if (records.bestLap !== undefined) {
      updateData.historicalBestLap = records.bestLap;
    }
    if (records.bestLapHolderId !== undefined) {
      updateData.bestLapHolderId = records.bestLapHolderId;
    }
    if (records.bestAverage !== undefined) {
      updateData.historicalBestAverage = records.bestAverage;
    }
    if (records.bestAverageHolderId !== undefined) {
      updateData.bestAverageHolderId = records.bestAverageHolderId;
    }

    const circuit = await this.prisma.circuit.update({
      where: { id },
      data: updateData,
    });
    return circuit as Circuit;
  }

  async clearRecords(id: string): Promise<Circuit> {
    const circuit = await this.prisma.circuit.update({
      where: { id },
      data: {
        historicalBestLap: null,
        historicalBestAverage: null,
        bestLapHolderId: null,
        bestAverageHolderId: null,
      },
    });
    return circuit as Circuit;
  }

  async findWithRecords(): Promise<CircuitWithHolders[]> {
    const circuits = await this.prisma.circuit.findMany({
      where: {
        OR: [
          { historicalBestLap: { not: null } },
          { historicalBestAverage: { not: null } },
        ],
      },
      orderBy: { name: 'asc' },
    });

    // Fetch holder information
    const circuitsWithHolders = await Promise.all(
      circuits.map(async (circuit) => {
        let bestLapHolder = null;
        let bestAverageHolder = null;

        if (circuit.bestLapHolderId) {
          const player = await this.prisma.player.findUnique({
            where: { id: circuit.bestLapHolderId },
            select: { id: true, name: true },
          });
          bestLapHolder = player;
        }

        if (circuit.bestAverageHolderId) {
          const player = await this.prisma.player.findUnique({
            where: { id: circuit.bestAverageHolderId },
            select: { id: true, name: true },
          });
          bestAverageHolder = player;
        }

        return {
          ...circuit,
          bestLapHolder,
          bestAverageHolder,
        } as CircuitWithHolders;
      })
    );

    return circuitsWithHolders;
  }
}
