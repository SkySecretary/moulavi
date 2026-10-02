const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding B2C Packages...');

  // 1. Get hotels and routes
  const makkahHotel = await prisma.locationMaster.findFirst({
    where: { 
      locationType: 'HOTEL',
      name: { contains: 'Makkah' }
    }
  }) || await prisma.locationMaster.findFirst({
    where: { locationType: 'HOTEL' }
  });

  const madinahHotel = await prisma.locationMaster.findFirst({
    where: { 
      locationType: 'HOTEL',
      name: { contains: 'Madina' }
    }
  }) || await prisma.locationMaster.findFirst({
    where: { locationType: 'HOTEL' }
  });

  const transportRoute = await prisma.transportRouteMaster.findFirst();

  if (!makkahHotel || !madinahHotel || !transportRoute) {
    console.error('Missing hotels or routes to link packages!');
    process.exit(1);
  }

  console.log(`Using Makkah Hotel: ${makkahHotel.name} (${makkahHotel.id})`);
  console.log(`Using Madinah Hotel: ${madinahHotel.name} (${madinahHotel.id})`);
  console.log(`Using Transport Route: ${transportRoute.routeType} (${transportRoute.id})`);

  // 2. Clear existing packages
  await prisma.packageMaster.deleteMany();
  console.log('Cleared existing B2C packages.');

  // 3. Create packages
  const packagesData = [
    {
      title: '3-Day Swift Umrah (Makkah Only)',
      description: 'Ideal for a quick, focus-driven weekend pilgrimage. Includes reserved room allotments in Makkah and direct ground transfers. Skips Madinah.',
      durationDays: 3,
      makkahNights: 2,
      madinahNights: 0,
      makkahHotelId: makkahHotel.id,
      madinahHotelId: madinahHotel.id, // linked to satisfy constraint, nights=0 means it won't be used
      transportRouteId: transportRoute.id,
      flightCost: 0,
      baseCost: 950,
      price: 950,
      isActive: true,
    },
    {
      title: '3-Day Express Budget (Makkah Only)',
      description: 'Swift 3-day basic stay. Perfect for busy professionals wanting to make the most of their weekend. Land-only, no flights.',
      durationDays: 3,
      makkahNights: 2,
      madinahNights: 0,
      makkahHotelId: makkahHotel.id,
      madinahHotelId: madinahHotel.id,
      transportRouteId: transportRoute.id,
      flightCost: 0,
      baseCost: 950,
      price: 950,
      isActive: true,
    },
    {
      title: '5-Day Premium Umrah Stay',
      description: 'Designed for standard short stays. Balanced 3 nights in Makkah and 2 nights in Madinah. Includes premium VIP transfers.',
      durationDays: 5,
      makkahNights: 3,
      madinahNights: 2,
      makkahHotelId: makkahHotel.id,
      madinahHotelId: madinahHotel.id,
      transportRouteId: transportRoute.id,
      flightCost: 0,
      baseCost: 1250,
      price: 1250,
      isActive: true,
    },
    {
      title: '8-Day Executive Pilgrimage',
      description: 'Enjoy a comprehensive stay with 5 nights in Makkah and 3 nights in Madinah. Private luxury sedan transfers included.',
      durationDays: 8,
      makkahNights: 5,
      madinahNights: 3,
      makkahHotelId: makkahHotel.id,
      madinahHotelId: madinahHotel.id,
      transportRouteId: transportRoute.id,
      flightCost: 0,
      baseCost: 1850,
      price: 1850,
      isActive: true,
    },
    {
      title: '14-Day Spiritual Journey',
      description: 'A complete fortnight of reflection. Includes 8 nights in Makkah and 6 nights in Madinah. Full shuttle route transfers.',
      durationDays: 14,
      makkahNights: 8,
      madinahNights: 6,
      makkahHotelId: makkahHotel.id,
      madinahHotelId: madinahHotel.id,
      transportRouteId: transportRoute.id,
      flightCost: 0,
      baseCost: 2750,
      price: 2750,
      isActive: true,
    },
    {
      title: '14-Day Deluxe Grand Umrah',
      description: 'The ultimate spiritual experience. 10 nights in Makkah and 4 nights in Madinah at premium hotels with Kaaba view rooms.',
      durationDays: 14,
      makkahNights: 10,
      madinahNights: 4,
      makkahHotelId: makkahHotel.id,
      madinahHotelId: madinahHotel.id,
      transportRouteId: transportRoute.id,
      flightCost: 0,
      baseCost: 3450,
      price: 3450,
      isActive: true,
    }
  ];

  for (const pkg of packagesData) {
    await prisma.packageMaster.create({ data: pkg });
  }

  console.log('Successfully seeded 6 B2C Packages!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
