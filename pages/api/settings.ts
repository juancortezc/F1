
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const settings = await prisma.settings.findUnique({
                where: { id: 'singleton' },
            });
            // Ensure there's a default pin if none is found
            if (!settings) {
                const defaultSettings = await prisma.settings.create({
                    data: { id: 'singleton', pin: '2024' },
                });
                return res.status(200).json(defaultSettings);
            }
            res.status(200).json(settings);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
