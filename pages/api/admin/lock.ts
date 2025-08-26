import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

// Store admin lock in memory (for simple implementation)
// In production, you might want to use Redis or database
let adminLock: {
  userId: string;
  userName: string;
  lockedAt: Date;
  expiresAt: Date;
} | null = null;

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Acquire lock
    const { userId, userName } = req.body;
    
    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName required' });
    }
    
    const now = new Date();
    
    // Check if lock exists and is not expired
    if (adminLock && adminLock.expiresAt > now && adminLock.userId !== userId) {
      return res.status(423).json({ 
        error: 'Admin panel is locked',
        lockedBy: adminLock.userName,
        expiresAt: adminLock.expiresAt
      });
    }
    
    // Acquire or refresh lock
    adminLock = {
      userId,
      userName,
      lockedAt: now,
      expiresAt: new Date(now.getTime() + LOCK_DURATION_MS)
    };
    
    return res.status(200).json({ 
      success: true,
      lock: adminLock
    });
    
  } else if (req.method === 'DELETE') {
    // Release lock
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    if (adminLock && adminLock.userId === userId) {
      adminLock = null;
      return res.status(200).json({ success: true });
    }
    
    return res.status(403).json({ error: 'Cannot release lock owned by another user' });
    
  } else if (req.method === 'GET') {
    // Check lock status
    const now = new Date();
    
    if (adminLock && adminLock.expiresAt > now) {
      return res.status(200).json({ 
        locked: true,
        lock: adminLock
      });
    }
    
    // Clear expired lock
    if (adminLock && adminLock.expiresAt <= now) {
      adminLock = null;
    }
    
    return res.status(200).json({ locked: false });
    
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}