const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Master seeding script - Seeds all master data in correct order
 * Run this after migrations to populate initial data
 */

async function seedAll() {
  console.log('🌱 Starting comprehensive data seeding...\n');

  try {
    // 1. Seed Currency Master (SAR, INR, AED, USD)
    console.log('1️⃣ Seeding Currency Master...');
    const currencies = [
      { 
        currencyCode: 'SAR', 
        currencyName: 'Saudi Riyal', 
        symbol: 'SR',
        exchangeRate: 22.5,
        isActive: true
      },
      { 
        currencyCode: 'INR', 
        currencyName: 'Indian Rupee', 
        symbol: '₹',
        exchangeRate: 1.0,
        isActive: true
      },
      { 
        currencyCode: 'AED', 
        currencyName: 'UAE Dirham', 
        symbol: 'AED',
        exchangeRate: 22.8,
        isActive: true
      },
      { 
        currencyCode: 'USD', 
        currencyName: 'US Dollar', 
        symbol: '$',
        exchangeRate: 83.5,
        isActive: true
      }
    ];
    for (const currency of currencies) {
      await prisma.currencyMaster.upsert({
        where: { currencyCode: currency.currencyCode },
        update: currency,
        create: currency
      });
    }
    console.log(`✅ Created ${currencies.length} currencies\n`);

    // 2. Seed Country Master (Saudi Arabia, India)
    console.log('2️⃣ Seeding Country Master...');
    const countries = [
      { 
        countryCode: 'SAU', 
        countryName: 'Saudi Arabia', 
        currencyCode: 'SAR',
        isActive: true
      },
      { 
        countryCode: 'IND', 
        countryName: 'India', 
        currencyCode: 'INR',
        isActive: true
      }
    ];
    for (const country of countries) {
      await prisma.countryMaster.upsert({
        where: { countryCode: country.countryCode },
        update: country,
        create: country
      });
    }
    console.log(`✅ Created ${countries.length} countries\n`);

    // 3. Seed City Master (Saudi cities)
    console.log('3️⃣ Seeding City Master...');
    const saudiArabia = await prisma.countryMaster.findUnique({ where: { countryCode: 'SAU' } });
    if (!saudiArabia) {
      throw new Error('Saudi Arabia country not found. Please ensure country master is seeded first.');
    }

    const cities = [
      { name: 'Makkah' },
      { name: 'Madinah' },
      { name: 'Jeddah' },
      { name: 'Riyadh' },
      { name: 'Dammam' },
      { name: 'Taif' },
      { name: 'Abha' },
      { name: 'Jazan' },
      { name: 'Buraidah' },
      { name: 'Khobar' },
      { name: 'Tabuk' },
      { name: 'Najran' },
      { name: 'Hail' },
      { name: 'Yanbu' },
      { name: 'Khamis Mushait' }
    ];

    const cityMap = {};
    for (const city of cities) {
      const created = await prisma.cityMaster.upsert({
        where: { 
          name_countryId: { 
            name: city.name, 
            countryId: saudiArabia.id 
          } 
        },
        update: { name: city.name, countryId: saudiArabia.id, isActive: true },
        create: { 
          name: city.name, 
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      cityMap[city.name] = created;
    }
    console.log(`✅ Created ${cities.length} cities\n`);

    // 4. Seed Location Master - Airports (linked to cities)
    console.log('4️⃣ Seeding Location Master - Airports...');
    
    const airports = [
      { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah' },
      { code: 'MED', name: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Madinah' },
      { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh' },
      { code: 'DMM', name: 'King Fahd International Airport', city: 'Dammam' },
      { code: 'TIF', name: 'Taif Regional Airport', city: 'Taif' },
      { code: 'AHB', name: 'Abha Regional Airport', city: 'Abha' },
      { code: 'GIZ', name: 'Jazan Regional Airport', city: 'Jazan' },
      { code: 'ELQ', name: 'Gassim Regional Airport', city: 'Buraidah' },
      { code: 'TUU', name: 'Tabuk Regional Airport', city: 'Tabuk' },
      { code: 'EAM', name: 'Najran Regional Airport', city: 'Najran' },
      { code: 'HAS', name: 'Hail Regional Airport', city: 'Hail' },
      { code: 'YNB', name: 'Yanbu Airport', city: 'Yanbu' }
    ];

    let airportCount = 0;
    for (const airport of airports) {
      const city = cityMap[airport.city];
      if (!city) {
        console.warn(`   ⚠️  City ${airport.city} not found, skipping airport ${airport.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: airport.code, 
            locationType: 'AIRPORT' 
          } 
        },
        update: { 
          name: airport.name, 
          city: airport.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: airport.code, 
          name: airport.name, 
          city: airport.city,
          cityId: city.id,
          locationType: 'AIRPORT',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      airportCount++;
    }
    console.log(`✅ Created ${airportCount} airport locations\n`);

    // 5. Seed Location Master - Hotels (linked to cities)
    console.log('5️⃣ Seeding Location Master - Hotels...');
    
    // Delete related records first to avoid foreign key constraints
    await prisma.umrahHotelBooking.deleteMany({});
    console.log('   Cleared existing hotel bookings...');

    const hotels = [
      // Makkah Hotels
      { code: 'MAK001', name: 'Makkah Clock Royal Tower', city: 'Makkah' },
      { code: 'MAK002', name: 'Fairmont Makkah Clock Royal Tower', city: 'Makkah' },
      { code: 'MAK003', name: 'Swissotel Makkah', city: 'Makkah' },
      { code: 'MAK004', name: 'Conrad Makkah', city: 'Makkah' },
      { code: 'MAK005', name: 'Pullman Zamzam Makkah', city: 'Makkah' },
      { code: 'MAK006', name: 'Makkah Hilton Towers', city: 'Makkah' },
      { code: 'MAK007', name: 'Raffles Makkah Palace', city: 'Makkah' },
      { code: 'MAK008', name: 'Hyatt Regency Makkah', city: 'Makkah' },
      { code: 'MAK009', name: 'Makkah Millennium Hotel', city: 'Makkah' },
      { code: 'MAK010', name: 'Al Kiswah Towers Hotel', city: 'Makkah' },
      { code: 'MAK011', name: 'Shaza Makkah', city: 'Makkah' },
      { code: 'MAK012', name: 'Makkah Movenpick', city: 'Makkah' },
      // Madinah Hotels
      { code: 'MED001', name: 'Madinah Hilton', city: 'Madinah' },
      { code: 'MED002', name: 'Dar Al Hijra InterContinental', city: 'Madinah' },
      { code: 'MED003', name: 'Madinah Millennium Hotel', city: 'Madinah' },
      { code: 'MED004', name: 'Pullman Madinah Al Madinah', city: 'Madinah' },
      { code: 'MED005', name: 'Madinah Marriott Hotel', city: 'Madinah' },
      { code: 'MED006', name: 'Crowne Plaza Madinah', city: 'Madinah' },
      { code: 'MED007', name: 'Madinah Holiday Inn', city: 'Madinah' },
      { code: 'MED008', name: 'Al Madinah Concorde', city: 'Madinah' },
      { code: 'MED009', name: 'Madinah Golden Tulip', city: 'Madinah' },
      { code: 'MED010', name: 'Al Eman Royal Hotel', city: 'Madinah' },
      { code: 'MED011', name: 'Anwar Al Madinah Mövenpick', city: 'Madinah' },
      { code: 'MED012', name: 'Shaza Al Madina', city: 'Madinah' },
      // Jeddah Hotels
      { code: 'JED001', name: 'Jeddah Hilton', city: 'Jeddah' },
      { code: 'JED002', name: 'Four Seasons Hotel Jeddah', city: 'Jeddah' },
      { code: 'JED003', name: 'Jeddah Marriott Hotel', city: 'Jeddah' },
      { code: 'JED004', name: 'Pullman Jeddah Al Hamra', city: 'Jeddah' },
      { code: 'JED005', name: 'Jeddah Holiday Inn', city: 'Jeddah' },
      { code: 'JED006', name: 'Crowne Plaza Jeddah', city: 'Jeddah' },
      { code: 'JED007', name: 'Jeddah Millennium Hotel', city: 'Jeddah' },
      { code: 'JED008', name: 'Al Hamra Hotel Jeddah', city: 'Jeddah' },
      { code: 'JED009', name: 'Jeddah Sheraton', city: 'Jeddah' },
      { code: 'JED010', name: 'Ramada by Wyndham Jeddah', city: 'Jeddah' },
      // Riyadh Hotels
      { code: 'RUH001', name: 'Riyadh Marriott Hotel', city: 'Riyadh' },
      { code: 'RUH002', name: 'Four Seasons Hotel Riyadh', city: 'Riyadh' },
      { code: 'RUH003', name: 'Riyadh Hilton', city: 'Riyadh' },
      { code: 'RUH004', name: 'InterContinental Riyadh', city: 'Riyadh' },
      { code: 'RUH005', name: 'Crowne Plaza Riyadh', city: 'Riyadh' },
      { code: 'RUH006', name: 'Riyadh Holiday Inn', city: 'Riyadh' },
      // Dammam Hotels
      { code: 'DMM001', name: 'Dammam Marriott Hotel', city: 'Dammam' },
      { code: 'DMM002', name: 'Dammam Hilton', city: 'Dammam' },
      { code: 'DMM003', name: 'Crowne Plaza Dammam', city: 'Dammam' },
      { code: 'DMM004', name: 'Dammam Holiday Inn', city: 'Dammam' },
      // Taif Hotels
      { code: 'TAF001', name: 'Taif InterContinental', city: 'Taif' },
      { code: 'TAF002', name: 'Taif Hilton', city: 'Taif' },
      { code: 'TAF003', name: 'Al Hada Resort', city: 'Taif' },
      // Abha Hotels
      { code: 'ABH001', name: 'Abha Palace Hotel', city: 'Abha' },
      { code: 'ABH002', name: 'Mercure Abha', city: 'Abha' },
      { code: 'ABH003', name: 'Abha Grand Hotel', city: 'Abha' }
    ];

    let hotelCount = 0;
    for (const hotel of hotels) {
      const city = cityMap[hotel.city];
      if (!city) {
        console.warn(`   ⚠️  City ${hotel.city} not found, skipping hotel ${hotel.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: hotel.code, 
            locationType: 'HOTEL' 
          } 
        },
        update: { 
          name: hotel.name, 
          city: hotel.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: hotel.code, 
          name: hotel.name, 
          city: hotel.city,
          cityId: city.id,
          locationType: 'HOTEL',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      hotelCount++;
    }
    console.log(`✅ Created ${hotelCount} hotel locations\n`);

    // 5.5. Seed Location Master - Ziyarat Locations
    console.log('5.5️⃣ Seeding Location Master - Ziyarat Locations...');
    
    const ziyaratLocations = [
      { code: 'MAK_ZIY', name: 'Makkah Ziyarah', city: 'Makkah' },
      { code: 'MAD_ZIY', name: 'Madinah Ziyarath', city: 'Madinah' }
    ];

    let ziyaratCount = 0;
    for (const ziyarat of ziyaratLocations) {
      const city = cityMap[ziyarat.city];
      if (!city) {
        console.warn(`   ⚠️  City ${ziyarat.city} not found, skipping ziyarat ${ziyarat.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: ziyarat.code, 
            locationType: 'ZIYARAT' 
          } 
        },
        update: { 
          name: ziyarat.name, 
          city: ziyarat.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: ziyarat.code, 
          name: ziyarat.name, 
          city: ziyarat.city,
          cityId: city.id,
          locationType: 'ZIYARAT',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      ziyaratCount++;
    }
    console.log(`✅ Created ${ziyaratCount} ziyarat locations\n`);

    // 5.6. Seed Location Master - City Centers
    console.log('5.6️⃣ Seeding Location Master - City Centers...');
    
    const cityCenters = [
      { code: 'JEDCC', name: 'Jeddah City Center', city: 'Jeddah' },
      { code: 'MEDCC', name: 'Madinah City Center', city: 'Madinah' },
      { code: 'MAKCC', name: 'Makkah City Center', city: 'Makkah' }
    ];

    let cityCenterCount = 0;
    for (const center of cityCenters) {
      const city = cityMap[center.city];
      if (!city) {
        console.warn(`   ⚠️  City ${center.city} not found, skipping city center ${center.code}`);
        continue;
      }

      await prisma.locationMaster.upsert({
        where: { 
          code_locationType: { 
            code: center.code, 
            locationType: 'OTHERS' 
          } 
        },
        update: { 
          name: center.name, 
          city: center.city,
          cityId: city.id,
          countryId: saudiArabia.id 
        },
        create: { 
          code: center.code, 
          name: center.name, 
          city: center.city,
          cityId: city.id,
          locationType: 'OTHERS',
          countryId: saudiArabia.id,
          isActive: true
        }
      });
      cityCenterCount++;
    }
    console.log(`✅ Created ${cityCenterCount} city center locations\n`);

    // 6. Seed Vehicle Type Master
    console.log('6️⃣ Seeding Vehicle Type Master...');
    
    const vehicleTypes = [
      { vehicleName: 'Lexus ES 250', paxCount: 3 },
      { vehicleName: 'GMC', paxCount: 5 },
      { vehicleName: 'Staria', paxCount: 8 },
      { vehicleName: 'Hiace', paxCount: 9 },
      { vehicleName: 'Coaster Bus', paxCount: 25 },
      { vehicleName: 'Coach Bus Vip', paxCount: 30 },
      { vehicleName: 'Large Bus', paxCount: 45 }
    ];

    const vehicleTypeMap = {};
    for (const vt of vehicleTypes) {
      const created = await prisma.vehicleTypeMaster.upsert({
        where: { vehicleName: vt.vehicleName },
        update: { paxCount: vt.paxCount, isActive: true },
        create: { 
          vehicleName: vt.vehicleName, 
          paxCount: vt.paxCount,
          isActive: true
        }
      });
      vehicleTypeMap[vt.vehicleName] = created;
    }
    console.log(`✅ Created ${vehicleTypes.length} vehicle types\n`);

    // 7. Seed Transport Route Master
    console.log('7️⃣ Seeding Transport Route Master...');
    
    const transportRoutes = [
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Jeddah', routeType: 'fulltrip' },
      { city1: 'Jeddah', city2: 'Madinah', city3: 'Makkah', city4: 'Jeddah', routeType: 'fulltrip' },
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'airporttocity' },
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'citytoairport' },
      { city1: 'Jeddah', city2: 'Makkah', city3: null, city4: null, routeType: 'citytocity' },
      { city1: 'Makkah', city2: 'Jeddah', city3: null, city4: null, routeType: 'citytocity' },
      { city1: 'Jeddah', city2: 'Madinah', city3: null, city4: null, routeType: 'citytocity' },
      { city1: 'Madinah', city2: 'Jeddah', city3: null, city4: null, routeType: 'citytocity' },
      { city1: 'Makkah', city2: 'Madinah', city3: null, city4: null, routeType: 'citytocity' },
      { city1: 'Madinah', city2: 'Makkah', city3: null, city4: null, routeType: 'citytocity' },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Madinah', routeType: 'fulltrip' },
      { city1: 'Makkah', city2: 'Jeddah', city3: null, city4: null, routeType: 'tripandtour' },
      { city1: 'Makkah', city2: 'Taif', city3: null, city4: null, routeType: 'tripandtour' },
      { city1: 'Madinah', city2: 'Madinah', city3: null, city4: null, routeType: 'citytoairport' },
      { city1: 'Madinah', city2: 'Madinah', city3: null, city4: null, routeType: 'citytoairport' },
    ];

    let routeCount = 0;
    for (const route of transportRoutes) {
      const city1 = cityMap[route.city1];
      const city2 = cityMap[route.city2];
      const city3 = route.city3 ? cityMap[route.city3] : null;
      const city4 = route.city4 ? cityMap[route.city4] : null;

      if (!city1 || !city2) {
        console.warn(`   ⚠️  City not found for route, skipping: ${route.city1} → ${route.city2}`);
        continue;
      }

      // Check if route already exists (by city combination and route type)
      const existingRoute = await prisma.transportRouteMaster.findFirst({
        where: {
          city1Id: city1.id,
          city2Id: city2.id,
          city3Id: city3?.id || null,
          city4Id: city4?.id || null,
          routeType: route.routeType,
        },
      });

      if (existingRoute) {
        console.log(`   ⏭️  Route already exists: ${route.city1} → ${route.city2} (${route.routeType})`);
        continue;
      }

      await prisma.transportRouteMaster.create({
        data: {
          city1Id: city1.id,
          city2Id: city2.id,
          city3Id: city3?.id || null,
          city4Id: city4?.id || null,
          routeType: route.routeType,
          isActive: true,
        },
      });
      routeCount++;
    }
    console.log(`✅ Created ${routeCount} transport routes\n`);

    // 8. Seed Transport Master
    console.log('8️⃣ Seeding Transport Master...');
    
    // First, get all routes and vehicle types for reference
    const allRoutes = await prisma.transportRouteMaster.findMany({
      include: {
        city1: true,
        city2: true,
        city3: true,
        city4: true,
      },
    });

    const allVehicleTypes = await prisma.vehicleTypeMaster.findMany();
    const vehicleTypeMapByName = {};
    allVehicleTypes.forEach(vt => {
      vehicleTypeMapByName[vt.vehicleName] = vt;
    });

    // Transport master data from database
    const transportMasters = [
      // Jeddah Airport to City (airporttocity)
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'airporttocity', vehicleName: 'GMC', price: 7200.00 },
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'airporttocity', vehicleName: 'Hiace', price: 6000.00 },
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'airporttocity', vehicleName: 'Lexus ES 250', price: 4800.00 },
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'airporttocity', vehicleName: 'Staria', price: 6000.00 },
      
      // Jeddah City to Airport (citytoairport)
      { city1: 'Jeddah', city2: 'Jeddah', city3: null, city4: null, routeType: 'citytoairport', vehicleName: 'Lexus ES 250', price: 4800.00 },
      
      // Full Trip: Jeddah → Makkah → Madinah → Jeddah
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Jeddah', routeType: 'fulltrip', vehicleName: 'Coach Bus Vip', price: 109200.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Jeddah', routeType: 'fulltrip', vehicleName: 'GMC', price: 51600.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Jeddah', routeType: 'fulltrip', vehicleName: 'Hiace', price: 46800.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Jeddah', routeType: 'fulltrip', vehicleName: 'Lexus ES 250', price: 37200.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Jeddah', routeType: 'fulltrip', vehicleName: 'Staria', price: 44400.00 },
      
      // Full Trip: Jeddah → Makkah → Madinah → Madinah
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Madinah', routeType: 'fulltrip', vehicleName: 'Coach Bus Vip', price: 97200.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Madinah', routeType: 'fulltrip', vehicleName: 'GMC', price: 34800.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Madinah', routeType: 'fulltrip', vehicleName: 'Hiace', price: 31200.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Madinah', routeType: 'fulltrip', vehicleName: 'Lexus ES 250', price: 24000.00 },
      { city1: 'Jeddah', city2: 'Makkah', city3: 'Madinah', city4: 'Madinah', routeType: 'fulltrip', vehicleName: 'Staria', price: 29760.00 },
    ];

    let transportMasterCount = 0;
    for (const tm of transportMasters) {
      // Find the route
      const route = allRoutes.find(r => {
        const city1Match = r.city1.name === tm.city1;
        const city2Match = r.city2.name === tm.city2;
        const city3Match = (tm.city3 === null && r.city3 === null) || (r.city3 && r.city3.name === tm.city3);
        const city4Match = (tm.city4 === null && r.city4 === null) || (r.city4 && r.city4.name === tm.city4);
        const routeTypeMatch = r.routeType === tm.routeType;
        
        return city1Match && city2Match && city3Match && city4Match && routeTypeMatch;
      });

      if (!route) {
        console.warn(`   ⚠️  Route not found: ${tm.city1} → ${tm.city2} → ${tm.city3 || ''} → ${tm.city4 || ''} (${tm.routeType}), skipping transport master`);
        continue;
      }

      // Find the vehicle type
      const vehicleType = vehicleTypeMapByName[tm.vehicleName];
      if (!vehicleType) {
        console.warn(`   ⚠️  Vehicle type not found: ${tm.vehicleName}, skipping transport master`);
        continue;
      }

      // Check if transport master already exists
      const existing = await prisma.transportMaster.findUnique({
        where: {
          routeId_vehicleTypeId: {
            routeId: route.id,
            vehicleTypeId: vehicleType.id,
          },
        },
      });

      if (existing) {
        // Update price if different
        if (parseFloat(existing.price.toString()) !== tm.price) {
          await prisma.transportMaster.update({
            where: { id: existing.id },
            data: { price: tm.price, isActive: true },
          });
          console.log(`   🔄 Updated transport master: ${tm.city1} → ${tm.city2} (${tm.vehicleName}) - Price: ${tm.price}`);
        } else {
          console.log(`   ⏭️  Transport master already exists: ${tm.city1} → ${tm.city2} (${tm.vehicleName})`);
        }
        transportMasterCount++;
        continue;
      }

      // Create transport master
      await prisma.transportMaster.create({
        data: {
          routeId: route.id,
          vehicleTypeId: vehicleType.id,
          price: tm.price,
          isActive: true,
        },
      });
      transportMasterCount++;
    }
    console.log(`✅ Created/Updated ${transportMasterCount} transport masters\n`);

    console.log('🎉 All master data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${currencies.length} Currencies`);
    console.log(`   - ${countries.length} Countries`);
    console.log(`   - ${cities.length} Cities`);
    console.log(`   - ${airportCount} Airport Locations`);
    console.log(`   - ${hotelCount} Hotel Locations`);
    console.log(`   - ${ziyaratCount} Ziyarat Locations`);
    console.log(`   - ${cityCenterCount} City Center Locations`);
    console.log(`   - ${vehicleTypes.length} Vehicle Types`);
    console.log(`   - ${routeCount} Transport Routes`);
    console.log(`   - ${transportMasterCount} Transport Masters`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAll;

