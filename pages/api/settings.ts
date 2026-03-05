
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
    } else if (req.method === 'PUT') {
        try {
            const { historicalCutoffDate, pin, tournamentsEnabled } = req.body;

            // Build update data object with only provided fields
            const updateData: {
                historicalCutoffDate?: Date | null;
                pin?: string;
                tournamentsEnabled?: boolean;
            } = {};

            if (historicalCutoffDate !== undefined) {
                updateData.historicalCutoffDate = historicalCutoffDate
                    ? new Date(historicalCutoffDate)
                    : null;
            }
            if (pin !== undefined) {
                updateData.pin = pin;
            }
            if (tournamentsEnabled !== undefined) {
                updateData.tournamentsEnabled = tournamentsEnabled;
            }

            const settings = await prisma.settings.upsert({
                where: { id: 'singleton' },
                update: updateData,
                create: {
                    id: 'singleton',
                    pin: pin || '2024',
                    historicalCutoffDate: historicalCutoffDate ? new Date(historicalCutoffDate) : null,
                    tournamentsEnabled: tournamentsEnabled || false
                },
            });

            res.status(200).json(settings);
        } catch (error) {
            console.error('Failed to update settings:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
