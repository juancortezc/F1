import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCircuits = [
  { name: 'Australia', imageUrl: 'https://picsum.photos/seed/australia/400/200' },
  { name: 'Canada', imageUrl: 'https://picsum.photos/seed/canada/400/200' },
  { name: 'Spa', imageUrl: 'https://picsum.photos/seed/spa/400/200' },
  { name: 'Monaco', imageUrl: 'https://picsum.photos/seed/monaco/400/200' },
  { name: 'Austria', imageUrl: 'https://picsum.photos/seed/austria/400/200' },
  { name: 'Silverstone', imageUrl: 'https://picsum.photos/seed/silverstone/400/200' },
  { name: 'COTA', imageUrl: 'https://picsum.photos/seed/cota/400/200' },
  { name: 'Suzuka', imageUrl: 'https://picsum.photos/seed/suzuka/400/200' },
  { name: 'Hungria', imageUrl: 'https://picsum.photos/seed/hungary/400/200' },
  { name: 'Barcelona', imageUrl: 'https://picsum.photos/seed/barcelona/400/200' },
  { name: 'Baharain', imageUrl: 'https://picsum.photos/seed/bahrain/400/200' },
  { name: 'Baku', imageUrl: 'https://picsum.photos/seed/baku/400/200' },
  { name: 'Mexico', imageUrl: 'https://picsum.photos/seed/mexico/400/200' },
  { name: 'Brasil', imageUrl: 'https://picsum.photos/seed/brazil/400/200' },
  { name: 'China', imageUrl: 'https://picsum.photos/seed/china/400/200' },
];

async function main() {
  console.log('Start seeding...');

  // Initialize settings with default PIN
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      pin: '2024',
    },
  });
  console.log('Default PIN set.');

  // Only seed circuits - players are created through registration
  const existingCircuits = await prisma.circuit.count();
  if (existingCircuits === 0) {
    for (const circuit of defaultCircuits) {
      await prisma.circuit.create({
        data: circuit,
      });
    }
    console.log('Default circuits seeded.');
  } else {
    console.log('Circuits already exist, skipping seeding.');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });