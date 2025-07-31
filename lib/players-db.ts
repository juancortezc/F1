import fs from 'fs';
import path from 'path';
import { Player } from '../types';

const playersFilePath = path.join(process.cwd(), 'data', 'players.json');

// Datos por defecto
const defaultPlayers: Player[] = [
  { 
    id: '1', 
    name: 'Lewis Hamilton', 
    imageUrl: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png',
    pin: '4400',
    isActive: true
  },
  { 
    id: '2', 
    name: 'Max Verstappen', 
    imageUrl: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png',
    pin: '3300',
    isActive: true
  },
  { 
    id: '3', 
    name: 'Charles Leclerc', 
    imageUrl: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png',
    pin: '1600',
    isActive: true
  }
];

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