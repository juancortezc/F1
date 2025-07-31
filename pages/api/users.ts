import { NextApiRequest, NextApiResponse } from 'next';

// Simulamos una base de datos en memoria para usuarios (en producción sería una DB real)
let users: { id: string; name: string; pin: string; isActive: boolean }[] = [
  { id: '1', name: 'Admin', pin: '1234', isActive: true }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(users.filter(u => u.isActive));
  }
  
  if (req.method === 'POST') {
    const { name, pin } = req.body;
    
    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN are required' });
    }
    
    // Verificar que el PIN no esté duplicado
    const existingUser = users.find(u => u.pin === pin && u.isActive);
    if (existingUser) {
      return res.status(400).json({ error: 'PIN already exists' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      name,
      pin,
      isActive: true
    };
    
    users.push(newUser);
    return res.status(201).json(newUser);
  }
  
  if (req.method === 'PUT') {
    const { id, name, pin, isActive } = req.body;
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verificar que el PIN no esté duplicado (excluyendo el usuario actual)
    if (pin) {
      const existingUser = users.find(u => u.pin === pin && u.id !== id && u.isActive);
      if (existingUser) {
        return res.status(400).json({ error: 'PIN already exists' });
      }
    }
    
    users[userIndex] = { ...users[userIndex], name, pin, isActive };
    return res.status(200).json(users[userIndex]);
  }
  
  if (req.method === 'DELETE') {
    const { id } = req.query;
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    users[userIndex].isActive = false;
    return res.status(200).json({ message: 'User deactivated' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}