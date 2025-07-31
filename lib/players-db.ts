import fs from 'fs';
import path from 'path';
import { Player } from '../types';

const playersFilePath = path.join(process.cwd(), 'data', 'players.json');

// Datos por defecto - sin jugadores fake
const defaultPlayers: Player[] = [];

// Función para leer jugadores
export function getPlayers(): Player[] {
  try {
    // Crear directorio data si no existe
    const dataDir = path.dirname(playersFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Si el archivo no existe, crear con datos por defecto
    if (!fs.existsSync(playersFilePath)) {
      fs.writeFileSync(playersFilePath, JSON.stringify(defaultPlayers, null, 2));
      return defaultPlayers;
    }
    
    const data = fs.readFileSync(playersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading players:', error);
    return defaultPlayers;
  }
}

// Función para guardar jugadores
export function savePlayers(players: Player[]): void {
  try {
    const dataDir = path.dirname(playersFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(playersFilePath, JSON.stringify(players, null, 2));
  } catch (error) {
    console.error('Error saving players:', error);
  }
}