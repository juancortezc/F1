
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPlayers, createPlayer, isPinTaken } from '../../../lib/players-db';
import { Player } from '../../../types';
import { withSecurity } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const players = await getPlayers();
      res.status(200).json(players);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, imageUrl, pin, isGuest = false } = req.body;
      
      // Validate required fields
      if (!name || !imageUrl) {
        return res.status(400).json({ error: 'Name and imageUrl are required' });
      }
      
      // For guests, PIN is not required from client - we'll generate one
      if (!isGuest && !pin) {
        return res.status(400).json({ error: 'PIN is required for regular players' });
      }
      
      // Validate name length
      if (name.trim().length < 1 || name.trim().length > 50) {
        return res.status(400).json({ error: 'Name must be between 1 and 50 characters' });
      }
      
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid image URL format' });
      }
      
      // Handle PIN for guests vs regular players
      let finalPin = pin;
      if (isGuest) {
        // Auto-generate a unique PIN for guests (starting from 9000)
        let guestPin = '9000';
        let attempts = 0;
        while (await isPinTaken(guestPin) && attempts < 1000) {
          const pinNumber = 9000 + attempts;
          guestPin = pinNumber.toString();
          attempts++;
        }
        finalPin = guestPin;
      } else {
        // Validate PIN format for regular players
        if (!/^\d{4}$/.test(pin)) {
          return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }
        
        // Check for duplicate PIN
        if (await isPinTaken(pin)) {
          return res.status(400).json({ error: 'PIN already exists. Please choose a different PIN.' });
        }
      }
      
      const newPlayer = await createPlayer({
        name: name.trim(),
        imageUrl,
        pin: finalPin,
        isGuest
      });
      
      res.status(201).json(newPlayer);
    } catch (error) {
      console.error('Failed to create player:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withSecurity(handler);
