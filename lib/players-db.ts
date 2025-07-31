// Librería para manejo de jugadores usando Prisma/Neon Database
import prisma from './prisma';
import { Player } from '../types';

// Función para leer jugadores desde la base de datos
export async function getPlayers(): Promise<Player[]> {
  try {
    const players = await prisma.player.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    // Convert Prisma Player to our Player type
    return players.map(player => ({
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      pin: '', // PIN no se devuelve por seguridad
      isActive: true
    }));
  } catch (error) {
    console.error('Error reading players:', error);
    return [];
  }
}

// Función para crear un nuevo jugador
export async function createPlayer(playerData: Omit<Player, 'id' | 'isActive'>): Promise<Player> {
  try {
    const newPlayer = await prisma.player.create({
      data: {
        name: playerData.name,
        imageUrl: playerData.imageUrl,
      }
    });
    
    return {
      id: newPlayer.id,
      name: newPlayer.name,
      imageUrl: newPlayer.imageUrl,
      pin: playerData.pin,
      isActive: true
    };
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

// Función para verificar si un PIN ya existe (mantener en memoria temporal)
const playerPins = new Map<string, string>(); // playerId -> pin

export function setPinForPlayer(playerId: string, pin: string): void {
  playerPins.set(playerId, pin);
}

export function validatePlayerPin(playerId: string, pin: string): boolean {
  return playerPins.get(playerId) === pin;
}

export function isPinTaken(pin: string): boolean {
  return Array.from(playerPins.values()).includes(pin);
}

// Función para obtener un jugador por ID
export async function getPlayerById(playerId: string): Promise<Player | null> {
  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });
    
    if (!player) return null;
    
    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      pin: playerPins.get(player.id) || '',
      isActive: true
    };
  } catch (error) {
    console.error('Error getting player by ID:', error);
    return null;
  }
}

// Backward compatibility - deprecated functions
export function savePlayers(_players: Player[]): void {
  console.warn('savePlayers is deprecated. Use createPlayer instead.');
}