import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  pin: string;
  isActive: boolean;
}

const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

// Datos por defecto
const defaultUsers: User[] = [
  { id: '1', name: 'Admin', pin: '1234', isActive: true }
];

// Función para leer usuarios
export function getUsers(): User[] {
  try {
    // Crear directorio data si no existe
    const dataDir = path.dirname(usersFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Si el archivo no existe, crear con datos por defecto
    if (!fs.existsSync(usersFilePath)) {
      fs.writeFileSync(usersFilePath, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }
    
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return defaultUsers;
  }
}

// Función para guardar usuarios
export function saveUsers(users: User[]): void {
  try {
    const dataDir = path.dirname(usersFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}