import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCircuits = [
  { name: 'Australia', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Australia%20carbon.png.transform/4col/image.png' },
  { name: 'Canada', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Canada%20carbon.png.transform/4col/image.png' },
  { name: 'Spa', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Belgium%20carbon.png.transform/4col/image.png' },
  { name: 'Monaco', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Monaco%20carbon.png.transform/4col/image.png' },
  { name: 'Austria', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Austria%20carbon.png.transform/4col/image.png' },
  { name: 'Silverstone', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Great%20Britain%20carbon.png.transform/4col/image.png' },
  { name: 'COTA', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/United%20States%20carbon.png.transform/4col/image.png' },
  { name: 'Suzuka', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Japan%20carbon.png.transform/4col/image.png' },
  { name: 'Hungria', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Hungary%20carbon.png.transform/4col/image.png' },
  { name: 'Barcelona', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Spain%20carbon.png.transform/4col/image.png' },
  { name: 'Baharain', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Bahrain%20carbon.png.transform/4col/image.png' },
  { name: 'Baku', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Azerbaijan%20carbon.png.transform/4col/image.png' },
  { name: 'Mexico', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Mexico%20carbon.png.transform/4col/image.png' },
  { name: 'Brasil', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/Brazil%20carbon.png.transform/4col/image.png' },
  { name: 'China', imageUrl: 'https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3/China%20carbon.png.transform/4col/image.png' },
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