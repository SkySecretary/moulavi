const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching database masters...');
  
  // Find hotels
  const hotels = await prisma.locationMaster.findMany({
    where: {
      locationType: 'HOTEL'
    }
  });

  console.log(`🏨 Found ${hotels.length} hotels in database.`);
  
  if (hotels.length < 2) {
    console.log('⚠️ Need at least 2 hotels to prefill. Checking all locations...');
    const allLocations = await prisma.locationMaster.findMany();
    console.log(`📍 Total locations: ${allLocations.length}`);
    if (allLocations.length === 0) {
      console.log('❌ No locations found! Please run the main seed first.');
      return;
    }
  }

  // Group by city
  const makkahHotels = hotels.filter(h => h.name.toLowerCase().includes('makkah') || (h.city && h.city.toLowerCase().includes('makkah')));
  const madinahHotels = hotels.filter(h => h.name.toLowerCase().includes('madin') || h.name.toLowerCase().includes('medin') || (h.city && (h.city.toLowerCase().includes('madin') || h.city.toLowerCase().includes('medin'))));

  const finalMakkahHotel = makkahHotels[0] || hotels[0];
  const finalMadinahHotel = madinahHotels[0] || hotels[1] || hotels[0];

  if (!finalMakkahHotel || !finalMadinahHotel) {
    console.log('❌ Could not find suitable Makkah/Madinah hotels for package mapping.');
    return;
  }

  // Find transport routes
  const routes = await prisma.transportRouteMaster.findMany();
  console.log(`🚍 Found ${routes.length} transport routes in database.`);
  if (routes.length === 0) {
    console.log('❌ No transport routes found! Please seed them first.');
    return;
  }
  const finalRoute = routes[0];

  console.log(`👉 Selected Makkah Hotel: ${finalMakkahHotel.name} (${finalMakkahHotel.id})`);
  console.log(`👉 Selected Madinah Hotel: ${finalMadinahHotel.name} (${finalMadinahHotel.id})`);
  console.log(`👉 Selected Transport Route: ${finalRoute.routeType} (${finalRoute.id})`);

  // Clear existing packages to avoid duplicates
  await prisma.packageMaster.deleteMany();
  console.log('🗑️ Cleared existing B2C packages.');

  // Create real packages
  const packages = [
    {
      title: 'Premium 7-Day Ramadan Special',
      description: 'Spend 4 nights in Makkah and 3 nights in Madinah. Includes premium hotel bookings directly opposite the Haram, private transfers, and e-Visa clearances.',
      durationDays: 7,
      makkahNights: 4,
      madinahNights: 3,
      makkahHotelId: finalMakkahHotel.id,
      madinahHotelId: finalMadinahHotel.id,
      transportRouteId: finalRoute.id,
      flightCost: 1200,
      baseCost: 2800,
      price: 4500,
      isActive: true
    },
    {
      title: 'Economy 10-Day Family Package',
      description: 'An affordable family pilgrimage. Includes 6 nights in Makkah and 4 nights in Madinah with comfortable shuttles, group visa processing, and shared transfers.',
      durationDays: 10,
      makkahNights: 6,
      madinahNights: 4,
      makkahHotelId: finalMakkahHotel.id,
      madinahHotelId: finalMadinahHotel.id,
      transportRouteId: finalRoute.id,
      flightCost: 950,
      baseCost: 1800,
      price: 2950,
      isActive: true
    }
  ];

  for (const pkg of packages) {
    const created = await prisma.packageMaster.create({
      data: pkg
    });
    console.log(`✅ Prefilled package: "${created.title}" with price ${created.price} SAR`);
  }

  console.log('🎉 B2C packages database seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
