const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedIndianAirports() {
  const india = await prisma.countryMaster.findFirst({
    where: { OR: [{ countryCode: 'IND' }, { countryName: { contains: 'India' } }] }
  });
  if (!india) {
    console.error('India country not found');
    return;
  }
  console.log('Found India CountryMaster:', india.id);

  const indianAirports = [
    { code: 'CCJ', name: 'Calicut International Airport', city: 'Calicut' },
    { code: 'COK', name: 'Cochin International Airport', city: 'Kochi' },
    { code: 'CNN', name: 'Kannur International Airport', city: 'Kannur' },
    { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram' },
    { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi' },
    { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai' },
    { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru' },
    { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad' },
    { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai' },
    { code: 'CCU', name: 'Netaji Subhash Chandra Bose International Airport', city: 'Kolkata' },
    { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad' },
    { code: 'LKO', name: 'Chaudhary Charan Singh International Airport', city: 'Lucknow' },
    { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur' },
    { code: 'GOI', name: 'Dabolim Airport (Goa)', city: 'Goa' },
    { code: 'GOX', name: 'Manohar International Airport', city: 'Mopa' },
    { code: 'IXE', name: 'Mangalore International Airport', city: 'Mangalore' },
    { code: 'TRZ', name: 'Tiruchirappalli International Airport', city: 'Tiruchirappalli' },
    { code: 'SXR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar' },
    { code: 'PNQ', name: 'Pune Airport', city: 'Pune' },
    { code: 'NAG', name: 'Dr. Babasaheb Ambedkar International Airport', city: 'Nagpur' },
  ];

  for (const item of indianAirports) {
    let cityRecord = await prisma.cityMaster.findFirst({
      where: { name: item.city, countryId: india.id }
    });
    if (!cityRecord) {
      cityRecord = await prisma.cityMaster.create({
        data: {
          name: item.city,
          countryId: india.id,
          isActive: true
        }
      });
    }

    const existing = await prisma.locationMaster.findFirst({
      where: { code: item.code, locationType: 'AIRPORT' }
    });
    if (!existing) {
      await prisma.locationMaster.create({
        data: {
          code: item.code,
          name: item.name,
          locationType: 'AIRPORT',
          countryId: india.id,
          cityId: cityRecord.id,
          city: item.city,
          isActive: true
        }
      });
      console.log('Created airport:', item.code, item.name);
    }
  }

  console.log('Indian airports seeded successfully.');
  await prisma.$disconnect();
}

if (require.main === module) {
  seedIndianAirports().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seedIndianAirports };
