import fs from 'fs';
import path from 'path';
import { Player } from '../types';

const playersFilePath = path.join(process.cwd(), 'data', 'players.json');

// Datos por defecto - sistema limpio sin datos fake
const defaultPlayers: Player[] = [];

// Function to ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(playersFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Función para leer jugadores
export function getPlayers(): Player[] {
  try {
    ensureDataDirectory();
    
    // Si el archivo no existe, crear vacío (sin datos fake)
    if (!fs.existsSync(playersFilePath)) {
      fs.writeFileSync(playersFilePath, JSON.stringify(defaultPlayers, null, 2));
      return defaultPlayers;
    }
    
    const data = fs.readFileSync(playersFilePath, 'utf8');
    const players = JSON.parse(data);
    
    // Filter out any fake players that might still exist
    const realPlayers = players.filter((player: Player) => 
      !['Lewis Hamilton', 'Max Verstappen', 'Charles Leclerc'].includes(player.name)
    );
    
    return realPlayers;
  } catch (error) {
    console.error('Error reading players:', error);
    return [];
  }
}

// Función para guardar jugadores
export function savePlayers(players: Player[]): void {
  try {
    ensureDataDirectory();
    
    // Filter out fake players before saving
    const realPlayers = players.filter(player => 
      !['Lewis Hamilton', 'Max Verstappen', 'Charles Leclerc'].includes(player.name)
    );
    
    fs.writeFileSync(playersFilePath, JSON.stringify(realPlayers, null, 2));
  } catch (error) {
    console.error('Error saving players:', error);
  }
}