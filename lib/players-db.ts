// Player management using Prisma/Neon Database exclusively
import prisma from './prisma';
import { Player } from '../types';

// Get all players from database
export async function getPlayers(): Promise<Player[]> {
  try {
    const players = await prisma.player.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    return players.map(player => ({
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      pin: '', // PIN not returned for security
      isActive: player.isActive,
      isGuest: player.isGuest
    }));
  } catch (error) {
    console.error('Error reading players:', error);
    return [];
  }
}

// Create a new player in database
export async function createPlayer(playerData: Omit<Player, 'id' | 'isActive'>): Promise<Player> {
  try {
    const newPlayer = await prisma.player.create({
      data: {
        name: playerData.name,
        imageUrl: playerData.imageUrl,
        pin: playerData.pin,
        isGuest: playerData.isGuest || false,
        isActive: true
      }
    });
    
    return {
      id: newPlayer.id,
      name: newPlayer.name,
      imageUrl: newPlayer.imageUrl,
      pin: '', // Don't return PIN for security
      isActive: newPlayer.isActive,
      isGuest: newPlayer.isGuest
    };
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

// Update player in database
export async function updatePlayer(id: string, playerData: Partial<Omit<Player, 'id'>>): Promise<Player | null> {
  try {
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: {
        ...(playerData.name && { name: playerData.name }),
        ...(playerData.imageUrl && { imageUrl: playerData.imageUrl }),
        ...(playerData.pin && { pin: playerData.pin }),
        ...(playerData.isActive !== undefined && { isActive: playerData.isActive }),
        ...(playerData.isGuest !== undefined && { isGuest: playerData.isGuest })
      }
    });
    
    return {
      id: updatedPlayer.id,
      name: updatedPlayer.name,
      imageUrl: updatedPlayer.imageUrl,
      pin: '', // Don't return PIN for security
      isActive: updatedPlayer.isActive,
      isGuest: updatedPlayer.isGuest
    };
  } catch (error) {
    console.error('Error updating player:', error);
    return null;
  }
}

// Delete player from database
export async function deletePlayer(id: string): Promise<boolean> {
  try {
    await prisma.player.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    console.error('Error deleting player:', error);
    return false;
  }
}

// Validate player PIN against database
export async function validatePlayerPin(playerId: string, pin: string): Promise<boolean> {
  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });
    
    return player?.pin === pin;
  } catch (error) {
    console.error('Error validating player PIN:', error);
    return false;
  }
}

// Check if PIN is already taken in database
export async function isPinTaken(pin: string): Promise<boolean> {
  try {
    const existingPlayer = await prisma.player.findFirst({
      where: { pin }
    });
    
    return !!existingPlayer;
  } catch (error) {
    console.error('Error checking PIN availability:', error);
    return true; // Assume taken if error occurs
  }
}

// Get player by ID from database
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
      pin: '', // Don't return PIN for security
      isActive: player.isActive,
      isGuest: player.isGuest
    };
  } catch (error) {
    console.error('Error getting player by ID:', error);
    return null;
  }
}

// Deprecated functions for backward compatibility
export function setPinForPlayer(_playerId: string, _pin: string): void {
  console.warn('setPinForPlayer is deprecated. PINs are now stored in database.');
}

export function savePlayers(_players: Player[]): void {
  console.warn('savePlayers is deprecated. Use createPlayer instead.');
}