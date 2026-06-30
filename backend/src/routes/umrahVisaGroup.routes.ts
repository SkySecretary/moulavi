
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import {
  prisma,
  validateDateRange,
  validateUmrahVisaDates,
  parseSafeDate,
  step2Schema,
  groupStep1Schema,
  groupStep3Schema,
  uploadGroup,
} from './umrahVisa/shared';
import { combineDateTime } from '../utils/datetime';
import { syncBookingStatusInTx } from '../services/statusSyncService';
import { isS3Configured } from '../config/s3';
import { generateBookingReference } from '../services/bookingService';

const router = Router();

// Complete group booking schema
const completeGroupBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: groupStep1Schema,
  step2: step2Schema,
  step3: groupStep3Schema,
  step4: z.object({
    // passengerCount removed - now in step2Data
    passengers: z.array(z.object({
      fullName: z.string().min(1).max(255).optional(), // Made optional - not required for group bookings with ZIP
      isLeadPassenger: z.boolean().default(false),
      panCardPhoto: z.any().optional(),
    })).optional(), // Made optional - only ZIP file is required
  }),
});

// POST /api/umrah-visa/group/step1 - Group Step 1: Validation Only (No DB writes)
router.post('/group/step1', authenticate, async (req, res) => {
  try {
    const { partyId, ...step1Data } = req.body;
    const user = (req as any).user;
    
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Validate only step1 data (without partyId)
    const validatedData = groupStep1Schema.parse(step1Data);

    // Check if group number is unique system-wide
    if (validatedData.groupNumber) {
      const existingBooking = await prisma.umrahVisaBooking.findFirst({
        where: { 
          groupNumber: validatedData.groupNumber,
          isDeleted: false
        },
        include: {
          party: {
            select: { partyName: true }
          }
        }
      });

      if (existingBooking) {
        let errorMessage = 'Group number already exists.';
        if (user && user.role === 'admin') {
          errorMessage += ` Used by: ${existingBooking.party.partyName}`;
        }
        return res.status(400).json({ 
          error: errorMessage,
          code: 'GROUP_EXISTS'
        });
      }
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 1 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 1 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 1' });
  }
});

// POST /api/umrah-visa/group/step2 - Group Step 2: Validation Only (No DB writes)
router.post('/group/step2', authenticate, async (req, res) => {
  try {
    const validatedData = step2Schema.parse(req.body);

    // Validate date range (80 days max) - convert strings to Date objects
    const arrivalDateObj = parseSafeDate(validatedData.arrivalDate);
    const departureDateObj = parseSafeDate(validatedData.departureDate);
    const dateRangeValidation = validateDateRange(arrivalDateObj, departureDateObj);
    if (!dateRangeValidation.valid) {
      return res.status(400).json({ error: dateRangeValidation.error });
    }

    // Since we know they are valid dates now, cast for the next functions
    const validArrivalDate = arrivalDateObj!;
    const validDepartureDate = departureDateObj!;

    // Validate against Umrah visa master dates
    const master = await prisma.umrahVisaMaster.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    
    if (master) {
      const dateValidation = validateUmrahVisaDates(
        validArrivalDate,
        validDepartureDate,
        {
          lastArrivalDate: master.lastArrivalDate,
          lastDepartureDate: master.lastDepartureDate,
        }
      );
      
      if (!dateValidation.valid) {
        return res.status(400).json({ error: dateValidation.error });
      }
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 2 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 2 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 2' });
  }
});

// POST /api/umrah-visa/group/step3 - Group Step 3: Validation Only (No DB writes)
router.post('/group/step3', authenticate, async (req, res) => {
  try {
    const validatedData = groupStep3Schema.parse(req.body);

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 3 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 3 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 3' });
  }
});

// POST /api/umrah-visa/group/create-booking - Create complete group booking (all steps in one transaction)
router.post('/group/create-booking', authenticate, uploadGroup.fields([
  { name: 'panCardZipFile', maxCount: 1 },
  { name: 'documents', maxCount: 500 }
]), async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Check file size limits for multiple documents (50MB each)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files && files['documents']) {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      for (const file of files['documents']) {
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({ error: `File ${file.originalname} exceeds the 50MB size limit` });
        }
      }
    }

    // Parse JSON strings from FormData
    let step1Data, step2Data, step3Data, step4Data, partyId;
    
    if (req.body.step1) {
      // FormData mode - parse JSON strings
      partyId = req.body.partyId;
      step1Data = JSON.parse(req.body.step1);
      step2Data = JSON.parse(req.body.step2);
      step3Data = JSON.parse(req.body.step3);
      step4Data = JSON.parse(req.body.step4);
      
      // Keep date and time as strings - they will be combined before storing
      // No conversion needed here
      
      // Convert date strings to Date objects for step2Data hotel bookings
      if (step2Data.hotelBookings && Array.isArray(step2Data.hotelBookings)) {
        step2Data.hotelBookings = step2Data.hotelBookings.map((hotel: any) => ({
          ...hotel,
          checkInDate: parseSafeDate(hotel.checkInDate),
          checkOutDate: parseSafeDate(hotel.checkOutDate),
        }));
      }
      
      // Keep travel date and time as strings - they will be combined before storing
      // No conversion needed here
      
      // Convert date strings to Date objects for step3Data ziyaraths
      if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths)) {
        step3Data.ziyaraths = step3Data.ziyaraths.map((ziyarath: any) => ({
          ...ziyarath,
          date: parseSafeDate(ziyarath.date),
        }));
      }
    } else {
      // JSON mode (backward compatibility)
      const validatedData = completeGroupBookingSchema.parse(req.body);
      partyId = validatedData.partyId;
      step1Data = validatedData.step1;
      step2Data = validatedData.step2;
      step3Data = validatedData.step3;
      step4Data = validatedData.step4;
    }

    // Validate required fields
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Check compliance status constraints
    try {
      const metric = await prisma.subAgentMetric.findUnique({
        where: { subAgentId: partyId }
      });
      if (metric) {
        if (metric.complianceStatus === 'RED') {
          return res.status(403).json({
            error: 'Booking generation blocked: Sub-agent account is locked due to critical compliance violations (RED status).'
          });
        } else if (metric.complianceStatus === 'YELLOW') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const count = await prisma.umrahVisaBooking.count({
            where: {
              partyId,
              createdAt: { gte: startOfToday },
              isDeleted: false
            }
          });
          const limit = 1; // Daily group limit under throttle
          if (count >= limit) {
            return res.status(429).json({
              error: `Booking throttled: Daily capacity restricted to ${limit} groups for YELLOW compliance status (current: ${count}).`
            });
          }
        }
      }
    } catch (e: any) {
      console.error('[COMPLIANCE GROUP CHECK FAILED]', e.message);
    }

    // Check if group number is unique system-wide
    if (step1Data.groupNumber) {
      const existingBooking = await prisma.umrahVisaBooking.findFirst({
        where: { 
          groupNumber: step1Data.groupNumber,
          isDeleted: false
        },
        include: {
          party: {
            select: { partyName: true }
          }
        }
      });

      if (existingBooking) {
        let errorMessage = 'Group number already exists.';
        if (user && user.role === 'admin') {
          errorMessage += ` Used by: ${existingBooking.party.partyName}`;
        }
        return res.status(400).json({ 
          error: errorMessage,
          code: 'GROUP_EXISTS'
        });
      }
    }

    // Validate date range - convert strings to Date objects
    const arrivalDateObj = parseSafeDate(step2Data.arrivalDate);
    const departureDateObj = parseSafeDate(step2Data.departureDate);
    const dateRangeValidation = validateDateRange(arrivalDateObj, departureDateObj);
    if (!dateRangeValidation.valid) {
      return res.status(400).json({ error: dateRangeValidation.error });
    }

    // Since we know they are valid dates now, cast for the next functions
    const validArrivalDate = arrivalDateObj!;
    const validDepartureDate = departureDateObj!;

    // Validate passenger count (now from step2Data to match individual bookings)
    const passengerCount = step2Data.passengerCount;
    if (!passengerCount || passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    // Validate file upload (ZIP or Multiple files)
    const zipFile = files?.['panCardZipFile']?.[0];
    const multipleDocs = files?.['documents'];
    
    if (!zipFile && (!multipleDocs || multipleDocs.length === 0)) {
      return res.status(400).json({ 
        error: 'Documents are required. Please upload a ZIP file or multiple images/PDFs.' 
      });
    }

    // Create passengers array from passengerCount (no individual names required)
    const passengers = Array(passengerCount).fill(null).map((_, index) => ({
      fullName: step1Data.groupName || `Passenger ${index + 1}`, // Use group name or default
      isLeadPassenger: index === 0,
    }));

    // Calculate hasTransportation
    // Check for both single transport selection and multiple transport selection (for fulltrip routes)
    const hasTransportation = !!(step4Data.selectedTransport || 
      (step4Data.selectedTransports && step4Data.selectedTransports.length > 0));

    // PRE-FETCH: Collect all unique IDs needed for LocationMaster lookups
    const allLocationIds = new Set<string>();
    const allCityIds = new Set<string>();
    const hotelBookingsData = step2Data.hotelBookings || [];

    // Collect hotel IDs
    hotelBookingsData.forEach((hotel: any) => {
      if (hotel.hotelId) allLocationIds.add(hotel.hotelId);
      // Note: hotel.cityId is now a CityMaster ID (no longer needs conversion)
      if (hotel.cityId) allCityIds.add(hotel.cityId);
    });

    // Collect airport IDs
    if (step2Data.arrivalAirportId) allLocationIds.add(step2Data.arrivalAirportId);
    if (step2Data.departureAirportId) allLocationIds.add(step2Data.departureAirportId);

    // Collect transport segment IDs
    if (step3Data.transportSegments && Array.isArray(step3Data.transportSegments)) {
      step3Data.transportSegments.forEach((segment: any) => {
        if (segment.fromHotelId) allLocationIds.add(segment.fromHotelId);
        if (segment.toHotelId) allLocationIds.add(segment.toHotelId);
        if (segment.fromLocationId) {
          allLocationIds.add(segment.fromLocationId);
          allCityIds.add(segment.fromLocationId);
        }
        if (segment.toLocationId) {
          allLocationIds.add(segment.toLocationId);
          allCityIds.add(segment.toLocationId);
        }
      });
    }

    // Collect ziyarath IDs
    if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths)) {
      step3Data.ziyaraths.forEach((ziyarath: any) => {
        if (ziyarath.ziyarathId) allLocationIds.add(ziyarath.ziyarathId);
      });
    }

    // Batch query to fetch all LocationMasters before transaction
    const allLocationMasters = await prisma.locationMaster.findMany({
      where: {
        OR: [
          { id: { in: Array.from(allLocationIds) } },
          { cityId: { in: Array.from(allCityIds) } },
        ],
      },
      select: { id: true, cityId: true, locationType: true },
    });

    // Create lookup maps
    const locationMap = new Map<string, typeof allLocationMasters[0]>();
    const cityToLocationMap = new Map<string, typeof allLocationMasters[0][]>();

    allLocationMasters.forEach((lm) => {
      // Map by ID
      locationMap.set(lm.id, lm);

      // Map by cityId (group locations by city)
      if (lm.cityId) {
        if (!cityToLocationMap.has(lm.cityId)) {
          cityToLocationMap.set(lm.cityId, []);
        }
        cityToLocationMap.get(lm.cityId)!.push(lm);
      }
    });

    // Helper function to resolve location ID (works with both LocationMaster IDs and City IDs)
    const resolveLocationId = (id: string, preferType?: string): string | null => {
      // First, check if it's a LocationMaster ID
      if (locationMap.has(id)) {
        return id;
      }

      // If not found, check if it's a City ID
      const cityLocations = cityToLocationMap.get(id);
      if (cityLocations && cityLocations.length > 0) {
        // Prefer specific type if provided, otherwise use first one
        if (preferType) {
          const preferred = cityLocations.find((l) => l.locationType === preferType);
          if (preferred) return preferred.id;
        }
        return cityLocations[0].id;
      }

      return null;
    };

    // Save everything in a single transaction with automatic retry on booking reference collision
    let result: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const bookingReference = await generateBookingReference();

        result = await prisma.$transaction(async (tx) => {
          // 1. Create UmrahVisaBooking directly with partyId (group visa, always hotel, status = group_assigned)
          const booking = await tx.umrahVisaBooking.create({
        data: {
          partyId: partyId,
          bookingReference,
          submittedAt: new Date(),
          groupNumber: step1Data.groupNumber,
          groupName: step1Data.groupName,
          hasGroupNumber: true,
          passengerCount: step2Data.passengerCount,
          umrahVisaProviderId: step1Data.umrahVisaProviderId || null,
          status: 'group_assigned',
          visaType: 'group_visa',
          accommodationType: 'hotel',
          hasTransportation,
          lastUpdatedBy: user.id,
        },
      });

      // 3. Create UmrahTravelDetails - combine date and time before storing
      const arrivalDateTime = combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime);
      const departureDateTime = combineDateTime(step2Data.departureDate, step2Data.departureTime);
      
      if (!arrivalDateTime || !departureDateTime) {
        throw new Error('Invalid arrival or departure date/time');
      }

      const travelDetails = await tx.umrahTravelDetails.create({
        data: {
          bookingId: booking.id,
          arrivalDateTime,
          arrivalAirportId: step2Data.arrivalAirportId,
          arrivalFlightNumber: step2Data.arrivalFlightNumber,
          departureDateTime,
          departureAirportId: step2Data.departureAirportId,
          departureFlightNumber: step2Data.departureFlightNumber,
          brn: step2Data.brn || null,
        },
      });

      // 4. Create UmrahHotelBooking (from step2Data for group bookings - always hotel for group)
      if (hotelBookingsData.length > 0) {
        const createdHotelBookings = await Promise.all(
          hotelBookingsData.map(async (hotel: any) => {
            // Validate required fields
            if (!hotel.hotelId) {
              throw new Error(`Missing hotelId in hotel booking`);
            }
            if (!hotel.checkInDate) {
              throw new Error(`Missing checkInDate in hotel booking`);
            }
            if (!hotel.checkOutDate) {
              throw new Error(`Missing checkOutDate in hotel booking`);
            }

            // Get hotel's LocationMaster to find its cityId
            const hotelLocation = locationMap.get(hotel.hotelId);
            if (!hotelLocation) {
              throw new Error(`Invalid hotelId ${hotel.hotelId} - hotel LocationMaster not found`);
            }

            // Get cityId - use hotel.cityId if provided, otherwise use hotel's cityId from LocationMaster
            let cityId: string | null = null;
            if (hotel.cityId) {
              cityId = hotel.cityId;
            } else if (hotelLocation.cityId) {
              cityId = hotelLocation.cityId;
            }

            // If still not found, throw error
            if (!cityId) {
              throw new Error(`No cityId found for hotel booking. Hotel: ${hotel.hotelId}, City: ${hotel.cityId}`);
            }

            // Ensure dates are Date objects
            const checkInDate = hotel.checkInDate instanceof Date 
              ? hotel.checkInDate 
              : new Date(hotel.checkInDate);
            const checkOutDate = hotel.checkOutDate instanceof Date 
              ? hotel.checkOutDate 
              : new Date(hotel.checkOutDate);
            
            // Validate dates
            if (isNaN(checkInDate.getTime())) {
              throw new Error(`Invalid checkInDate: ${hotel.checkInDate}`);
            }
            if (isNaN(checkOutDate.getTime())) {
              throw new Error(`Invalid checkOutDate: ${hotel.checkOutDate}`);
            }

             return tx.umrahHotelBooking.create({
              data: {
                bookingId: booking.id,
                cityId: cityId,
                hotelId: hotel.hotelId,
                checkInDate,
                checkOutDate,
                brn: hotel.brn && Array.isArray(hotel.brn) && hotel.brn.length > 0 
                  ? hotel.brn 
                  : null,
                additionalBrns: hotel.additionalBrns && Array.isArray(hotel.additionalBrns) && hotel.additionalBrns.length > 0
                  ? hotel.additionalBrns as any
                  : null,
              },
            });
          })
        );
      }

      // 6. Create UmrahTransportBooking (from step4 selectedTransport or selectedTransports)
      if (step4Data.selectedTransport) {
        const { transportId } = step4Data.selectedTransport;
        
        // Combine arrival date and time for travelDateTime
        const travelDateTime = step2Data.arrivalDate && step2Data.arrivalTime
          ? combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime)
              : undefined;

        // Store transportMasterId and travelDateTime - all other data (route, vehicle, price) comes from TransportMaster
        await tx.umrahTransportBooking.create({
          data: {
            bookingId: booking.id,
            transportMasterId: transportId, // This is the TransportMaster ID
            travelDateTime,
          },
        });
      } else if (step4Data.selectedTransports && step4Data.selectedTransports.length > 0) {
        // Handle multiple transport selections (for fulltrip routes)
        // Combine arrival date and time for travelDateTime
        const travelDateTime = step2Data.arrivalDate && step2Data.arrivalTime
          ? combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime)
              : undefined;

        // Create transport bookings for each selected transport with quantity
        for (const transport of step4Data.selectedTransports) {
          // Create one booking per quantity
          for (let i = 0; i < (transport.quantity || 1); i++) {
            await tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                transportMasterId: transport.transportId, // This is the TransportMaster ID
                travelDateTime,
              },
            });
          }
        }
      }

      // 6.5. Create UmrahMovementDetail entries from step3Data.movements (unified model)
      // NEW: Simple unified approach - movements are already sorted chronologically
      const movementDetailsToCreate: Array<{
        bookingId: string;
        travelDateTime: Date;
        fromCityId: string;
        fromLocationId: string;
        toCityId: string;
        toLocationId: string;
      }> = [];

      // Helper: Find or create Viabadr city with local caching to prevent contention
      const viabadrCache = new Map<string, string>();
      const getViabadrCityId = async (countryId: string): Promise<string> => {
        if (viabadrCache.has(countryId)) return viabadrCache.get(countryId)!;

        // Try to find existing Viabadr city
        let viabadrCity = await tx.cityMaster.findFirst({
          where: {
            name: { equals: 'Viabadr' },
            countryId: countryId,
            isActive: true,
          },
        });

        // If not found, create it (using the same country as Madinah)
        if (!viabadrCity) {
          try {
            viabadrCity = await tx.cityMaster.create({
              data: {
                name: 'Viabadr',
                countryId: countryId,
                isActive: true,
              },
            });
          } catch (createError) {
            // Concurrent creation might fail on unique constraints, try to find again
            viabadrCity = await tx.cityMaster.findFirst({
              where: {
                name: { equals: 'Viabadr' },
                countryId: countryId,
                isActive: true,
              },
            });
            if (!viabadrCity) throw createError;
          }
        }

        viabadrCache.set(countryId, viabadrCity.id);
        return viabadrCity.id;
      };

      // Process unified movements array (simplified!)
      if (step3Data.movements && Array.isArray(step3Data.movements) && step3Data.movements.length > 0) {
        for (const movement of step3Data.movements) {
          // Get LocationMaster for "from" location
          const fromLocation = locationMap.get(movement.fromLocationId);
            if (!fromLocation) {
            throw new Error(`Invalid fromLocationId in movement: ${movement.fromLocationId}`);
            }

          // Get LocationMaster for "to" location
          const toLocation = locationMap.get(movement.toLocationId);
          if (!toLocation) {
            throw new Error(`Invalid toLocationId in movement: ${movement.toLocationId}`);
          }

          // Check if Viabadr override is enabled - always use Viabadr for "To" city
          let toCityId = toLocation.cityId;
          if (movement.viabadrOverride) {
            // Get the "To" location's city to get the countryId for Viabadr
            const toCity = await tx.cityMaster.findUnique({
              where: { id: toLocation.cityId },
              select: { name: true, countryId: true },
            });

            if (toCity) {
              // Always use Viabadr city for "To" when override is enabled
              toCityId = await getViabadrCityId(toCity.countryId);
            }
          }

          // Combine date and time
          const timeToUse = movement.time && movement.time.trim() !== '' ? movement.time : '12:00';
          if (!movement.date) {
            throw new Error(`Missing date for movement from ${movement.fromLocationId} to ${movement.toLocationId}`);
            }

          const travelDateTime = combineDateTime(movement.date, timeToUse);
          if (!travelDateTime) {
            throw new Error(`Invalid travel date/time for movement from ${movement.fromLocationId} to ${movement.toLocationId}`);
            }

          movementDetailsToCreate.push({
            bookingId: booking.id,
            travelDateTime,
            fromCityId: fromLocation.cityId,
            fromLocationId: fromLocation.id,
            toCityId: toCityId, // Use Viabadr cityId if override is enabled
            toLocationId: toLocation.id,
          });
        }
      } else if (step3Data.transportSegments || step3Data.ziyaraths) {
        // BACKWARD COMPATIBILITY: Handle old format (transportSegments + ziyaraths)
        // This code path can be removed after migration is complete
        console.warn('[umrahVisaGroup] Using legacy transportSegments/ziyaraths format. Please migrate to unified movements array.');

        // Process transportSegments (old format)
        if (step3Data.transportSegments && Array.isArray(step3Data.transportSegments)) {
          for (const segment of step3Data.transportSegments) {
            const fromLocationId = segment.fromHotelId || segment.fromLocationId;
            const toLocationId = segment.toHotelId || segment.toLocationId;

            if (!fromLocationId || !toLocationId) {
              throw new Error(`Missing location IDs in transport segment`);
            }

            const fromLocation = locationMap.get(fromLocationId);
            const toLocation = locationMap.get(toLocationId);

            if (!fromLocation || !toLocation) {
              throw new Error(`Invalid location IDs in transport segment`);
          }

            const timeToUse = segment.travelTime && segment.travelTime.trim() !== '' ? segment.travelTime : '12:00';
          if (!segment.travelDate) {
              throw new Error(`Missing travel date for transport segment`);
          }

          const travelDateTime = combineDateTime(segment.travelDate, timeToUse);
          if (!travelDateTime) {
              throw new Error(`Invalid travel date/time for transport segment`);
          }

          movementDetailsToCreate.push({
            bookingId: booking.id,
            travelDateTime,
              fromCityId: fromLocation.cityId,
              fromLocationId: fromLocation.id,
              toCityId: toLocation.cityId,
              toLocationId: toLocation.id,
          });
        }
      }

        // Process ziyaraths (old format) - simplified: ziyarath movements already have explicit from/to
      if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths) && step3Data.ziyaraths.length > 0) {
          // Note: Old format ziyaraths need "from" location inferred, but we'll use the last transport destination
          // This is a simplified backward compatibility approach
          let lastLocationId: string | null = null;
          let lastCityId: string | null = null;

          // Get last location from transport segments or hotel bookings
          if (movementDetailsToCreate.length > 0) {
            const lastMovement = movementDetailsToCreate[movementDetailsToCreate.length - 1];
            lastLocationId = lastMovement.toLocationId;
            lastCityId = lastMovement.toCityId;
          } else if (hotelBookingsData.length > 0) {
          const lastHotel = hotelBookingsData[hotelBookingsData.length - 1];
          const lastHotelLocation = locationMap.get(lastHotel.hotelId);
          if (lastHotelLocation) {
              lastLocationId = lastHotelLocation.id;
              lastCityId = lastHotelLocation.cityId;
            }
          }

          for (const ziyarath of step3Data.ziyaraths) {
            const ziyarathLocation = locationMap.get(ziyarath.ziyarathId);
            if (!ziyarathLocation) {
              throw new Error(`Invalid ziyarath location ID: ${ziyarath.ziyarathId}`);
            }

            if (!lastLocationId || !lastCityId) {
              throw new Error(`Cannot determine 'from' location for ziyarath ${ziyarath.ziyarathId}`);
            }

            const ziyarathDate = ziyarath.date instanceof Date 
              ? ziyarath.date.toISOString().split('T')[0] 
              : ziyarath.date;
            const travelDateTime = combineDateTime(ziyarathDate, ziyarath.time);
            if (!travelDateTime) {
              throw new Error(`Invalid travel date/time for ziyarath`);
            }

            movementDetailsToCreate.push({
              bookingId: booking.id,
              travelDateTime,
              fromCityId: lastCityId,
              fromLocationId: lastLocationId,
              toCityId: ziyarathLocation.cityId,
              toLocationId: ziyarathLocation.id,
            });

            // Update last location to ziyarath location
            lastLocationId = ziyarathLocation.id;
            lastCityId = ziyarathLocation.cityId;
          }
        }
      }

      // Create all movement details
      if (movementDetailsToCreate.length > 0) {
        await Promise.all(
          movementDetailsToCreate.map((movement) =>
            tx.umrahMovementDetail.create({
              data: movement,
            })
          )
        );
      }

      // 7. Create UmrahPassenger (all passengers) - using generated passengers from passengerCount
      const passengerRecords = await Promise.all(
        passengers.map((passenger: any) =>
          tx.umrahPassenger.create({
            data: {
              bookingId: booking.id,
              fullName: passenger.fullName.trim(),
              isLeadPassenger: passenger.isLeadPassenger,
            },
          })
        )
      );

      // 7.5. Save uploaded files as Documents (linked to booking, not individual passenger)
      const docsToCreate = [];

      // Handle legacy ZIP file
      if (files?.['panCardZipFile']?.[0]) {
        const zFile = files['panCardZipFile'][0];
        docsToCreate.push({
          bookingId: booking.id,
          documentType: 'pan_card_zip',
          fileName: zFile.originalname,
          filePath: isS3Configured() ? (zFile as any).location : zFile.path,
          fileSize: zFile.size,
          mimeType: zFile.mimetype || 'application/zip',
        });
      }

      // Handle multiple documents
      if (files?.['documents']) {
        for (const f of files['documents']) {
          docsToCreate.push({
            bookingId: booking.id,
            documentType: 'general',
            fileName: f.originalname,
            filePath: isS3Configured() ? (f as any).location : f.path,
            fileSize: f.size,
            mimeType: f.mimetype,
          });
        }
      }

      if (docsToCreate.length > 0) {
        await tx.document.createMany({
          data: docsToCreate,
        });
      }

      // 8. Get party name
      const party = await tx.party.findUnique({
        where: { id: partyId },
        select: { partyName: true },
      });

      // 9. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: 'group_assigned',
          changedBy: user.id,
          reason: 'Group booking created',
        },
      });

          return { booking, travelDetails, passengers: passengerRecords };
        }, {
          maxWait: 15000,
          timeout: 45000,
        });

        break;
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('booking_reference')) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
          continue;
        }
        throw error;
      }
    }

    res.status(201).json({
      message: 'Group Umrah visa booking completed successfully',
      data: {
        bookingId: result.booking.id,
        passengerCount: passengerCount,
        passengers: result.passengers,
        status: 'group_assigned',
      },
    });
  } catch (error) {
    // Handle multer errors
    // File size limit removed as per user requirement
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return res.status(400).json({ error: 'Invalid JSON data in request' });
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    
    console.error('❌ Error creating group booking:', error);
    res.status(500).json({ error: 'Failed to create group booking' });
  }
});

// POST /api/umrah-visa/group/add-to-existing-booking - Add new group to existing booking
router.post('/group/add-to-existing-booking', authenticate, uploadGroup.fields([
  { name: 'panCardZipFile', maxCount: 1 },
  { name: 'passportCopies', maxCount: 100 },
  { name: 'passengerPhotos', maxCount: 100 },
  { name: 'panCardCopies', maxCount: 100 },
  { name: 'iqamaCopies', maxCount: 100 },
  { name: 'onwardTickets', maxCount: 100 },
  { name: 'returnTickets', maxCount: 100 },
  { name: 'nationalAddresses', maxCount: 100 }
]), async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';
    
    // Parse request body (can be JSON or form-data)
    let existingBookingId: string;
    let newGroupNumber: string;
    let newGroupName: string;
    let passengerCount: number;
    let providedPartyId: string | undefined;

    if (req.body && typeof req.body === 'string') {
      // JSON mode
      const body = JSON.parse(req.body);
      existingBookingId = body.existingBookingId;
      newGroupNumber = body.newGroupNumber;
      newGroupName = body.newGroupName;
      passengerCount = parseInt(body.passengerCount);
      providedPartyId = body.partyId;
    } else {
      // Form-data mode
      existingBookingId = req.body.existingBookingId;
      newGroupNumber = req.body.newGroupNumber;
      newGroupName = req.body.newGroupName;
      passengerCount = parseInt(req.body.passengerCount);
      providedPartyId = req.body.partyId;
    }

    // Determine party ID: admin/staff can provide it, party users must use their own
    let partyId: string;
    
    if (isAdminOrStaff && providedPartyId) {
      // Admin/staff provided partyId - validate it exists
      const party = await prisma.party.findUnique({
        where: { id: providedPartyId },
        select: { id: true },
      });
      
      if (!party) {
        return res.status(404).json({ error: 'Party not found' });
      }
      
      partyId = providedPartyId;
    } else if (user.role === 'party') {
      // Party users must use their own party ID
      if (providedPartyId) {
        return res.status(403).json({ error: 'Party users cannot specify partyId' });
      }
      
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!userParty) {
        return res.status(404).json({ error: 'Party not found for this user' });
      }

      partyId = userParty.id;
    } else {
      // Admin/staff but no partyId provided - try to get from user's party (if exists)
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!userParty) {
        return res.status(400).json({ error: 'Party ID is required for admin/staff users' });
      }

      partyId = userParty.id;
    }

    // Validate required fields
    if (!existingBookingId || !newGroupNumber || !newGroupName || !passengerCount) {
      return res.status(400).json({ 
        error: 'Missing required fields: existingBookingId, newGroupNumber, newGroupName, passengerCount' 
      });
    }

    if (passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    // Check if group number already used or exists in database
    const groupNumberExists = await prisma.umrahVisaBooking.findFirst({
      where: {
        groupNumber: {
          contains: newGroupNumber
        },
        isDeleted: false
      }
    });
    if (groupNumberExists) {
      return res.status(400).json({ 
        error: `Group number "${newGroupNumber}" already used or exists in database. Please enter a unique group number.` 
      });
    }

    // Check if existing booking exists and belongs to the party
    const existingBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id: existingBookingId },
      include: {
        passengers: {
          where: { isDeleted: false }
        },
        travelDetails: {
          where: { isAlternate: false }
        },
        hotelBookings: {
          where: { isAlternate: false }
        },
        sponsorIqamaDetails: {
          where: { isAlternate: false }
        },
        transportBookings: {
          where: { isAlternate: false }
        },
        movementDetails: {
          where: { isAlternate: false }
        },
      },
    });

    if (!existingBooking) {
      return res.status(404).json({ error: 'Existing booking not found' });
    }

    if (existingBooking.partyId !== partyId) {
      return res.status(403).json({ error: 'You do not have permission to modify this booking' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate duplicate booking reference with suffix (e.g. UB-260612-052-01)
      const parentRef = existingBooking.bookingReference || `UB-${existingBookingId.slice(0, 8)}`;
      const duplicateCount = await tx.umrahVisaBooking.count({
        where: {
          OR: [
            { id: existingBookingId },
            {
              bookingReference: {
                startsWith: `${parentRef}-`
              }
            }
          ],
          isDeleted: false
        }
      });
      const suffix = String(duplicateCount).padStart(2, '0');
      const duplicateBookingReference = `${parentRef}-${suffix}`;

      // 1. Create duplicate booking (internal duplicate) only in Group assigned status
      const duplicateBooking = await tx.umrahVisaBooking.create({
        data: {
          isDuplicate: true,
          partyId: existingBooking.partyId,
          bookingReference: duplicateBookingReference,
          groupNumber: newGroupNumber,
          groupName: newGroupName,
          passengerCount: passengerCount,
          umrahVisaProviderId: existingBooking.umrahVisaProviderId,
          transportCompanyId: existingBooking.transportCompanyId,
          accommodationType: existingBooking.accommodationType,
          visaType: existingBooking.visaType,
          hasTransportation: existingBooking.hasTransportation,
          status: 'group_assigned',
          brn: existingBooking.brn,
          tripStatus: existingBooking.tripStatus,
          hasMultipleGroup: false
        }
      });

      // 2. Upload and associate all uploaded documents with this duplicate booking
      const docsToCreate: any[] = [];
      const fileFieldsList = [
        'panCardZipFile',
        'passportCopies',
        'passengerPhotos',
        'panCardCopies',
        'iqamaCopies',
        'onwardTickets',
        'returnTickets',
        'nationalAddresses'
      ];

      if (files) {
        for (const fieldName of fileFieldsList) {
          const fieldFiles = files[fieldName];
          if (fieldFiles && Array.isArray(fieldFiles)) {
            for (const f of fieldFiles) {
              const filePath = isS3Configured() ? (f as any).location : f.path;
              let dbType = fieldName;
              if (fieldName === 'panCardZipFile') dbType = 'pan_card_zip';
              else if (fieldName === 'passportCopies') dbType = 'passport_copies';
              else if (fieldName === 'passengerPhotos') dbType = 'passenger_photos';
              else if (fieldName === 'panCardCopies') dbType = 'pan_card_copies';
              else if (fieldName === 'iqamaCopies') dbType = 'iqama_copies';
              else if (fieldName === 'onwardTickets') dbType = 'onward_tickets';
              else if (fieldName === 'returnTickets') dbType = 'return_tickets';
              else if (fieldName === 'nationalAddresses') dbType = 'national_addresses';

              docsToCreate.push({
                bookingId: duplicateBooking.id,
                documentType: dbType,
                fileName: f.originalname,
                filePath: filePath,
                fileSize: f.size,
                mimeType: f.mimetype,
              });
            }
          }
        }
      }

      if (docsToCreate.length > 0) {
        await tx.document.createMany({
          data: docsToCreate,
        });
      }

      // 3. Create passengers for duplicate booking
      const newPassengers = Array(passengerCount).fill(null).map((_, index) => ({
        bookingId: duplicateBooking.id,
        fullName: `${newGroupName} - Passenger ${index + 1}`,
        isLeadPassenger: index === 0,
      }));
      for (const passenger of newPassengers) {
        await tx.umrahPassenger.create({
          data: passenger
        });
      }

      // 4. Copy travel details
      for (const t of existingBooking.travelDetails) {
        await tx.umrahTravelDetails.create({
          data: {
            bookingId: duplicateBooking.id,
            arrivalDateTime: t.arrivalDateTime,
            arrivalFlightNumber: t.arrivalFlightNumber,
            arrivalAirportId: t.arrivalAirportId,
            departureDateTime: t.departureDateTime,
            departureFlightNumber: t.departureFlightNumber,
            departureAirportId: t.departureAirportId,
            brn: t.brn,
            isAlternate: false
          }
        });
      }

      // 5. Copy hotel bookings
      for (const h of existingBooking.hotelBookings) {
        await tx.umrahHotelBooking.create({
          data: {
            bookingId: duplicateBooking.id,
            cityId: h.cityId,
            hotelId: h.hotelId,
            checkInDate: h.checkInDate,
            checkOutDate: h.checkOutDate,
            brn: h.brn as any,
            additionalBrns: h.additionalBrns as any,
            isAlternate: false
          }
        });
      }

      // 6. Copy movement details
      for (const m of existingBooking.movementDetails) {
        await tx.umrahMovementDetail.create({
          data: {
            bookingId: duplicateBooking.id,
            travelDateTime: m.travelDateTime,
            fromCityId: m.fromCityId,
            fromLocationId: m.fromLocationId,
            toCityId: m.toCityId,
            toLocationId: m.toLocationId,
            isAlternate: false
          }
        });
      }

      // 7. Copy sponsor/iqama details
      for (const iq of existingBooking.sponsorIqamaDetails) {
        await tx.umrahSponserIqamaDetails.create({
          data: {
            bookingId: duplicateBooking.id,
            isAlternate: false,
            iqamaNumber: iq.iqamaNumber,
            iqamaSponserName: iq.iqamaSponserName,
            sponserDob: iq.sponserDob,
            sponserMobileNumber: iq.sponserMobileNumber,
            sponserNationalShortAddress: iq.sponserNationalShortAddress,
            makkahHotelName: iq.makkahHotelName,
            makkahBrn: iq.makkahBrn,
            madinahHotelName: iq.madinahHotelName,
            madinahBrn: iq.madinahBrn,
            confirmationImagePath: iq.confirmationImagePath
          }
        });
      }

      // 8. Update original booking details (multiple groups & passenger count) WITHOUT status transition!
      let multipleGroupDetails: any[] = [];
      if (existingBooking.hasMultipleGroup && existingBooking.multipleGroupDetails) {
        multipleGroupDetails = Array.isArray(existingBooking.multipleGroupDetails) 
          ? existingBooking.multipleGroupDetails 
          : [];
      } else {
        if (existingBooking.groupNumber && existingBooking.groupName) {
          multipleGroupDetails.push({
            groupNumber: existingBooking.groupNumber,
            groupName: existingBooking.groupName,
            passengerCount: existingBooking.passengerCount,
            documentId: null,
          });
        }
      }

      multipleGroupDetails.push({
        groupNumber: newGroupNumber,
        groupName: newGroupName,
        passengerCount: passengerCount,
        documentId: null,
      });

      const totalPassengerCount = multipleGroupDetails.reduce(
        (sum, group) => sum + group.passengerCount, 
        0
      );
      const combinedGroupNumbers = multipleGroupDetails.map(g => g.groupNumber).join(', ');
      const combinedGroupNames = multipleGroupDetails.map(g => g.groupName).join(', ');

      const updatedBooking = await tx.umrahVisaBooking.update({
        where: { id: existingBookingId },
        data: {
          hasMultipleGroup: true,
           multipleGroupDetails: multipleGroupDetails as any,
          groupNumber: combinedGroupNumbers,
          groupName: combinedGroupNames,
          passengerCount: totalPassengerCount,
          lastUpdatedBy: user.id,
        },
      });

      return { booking: updatedBooking, duplicateBooking };
    }, {
      maxWait: 15000,
      timeout: 45000,
    });

    res.status(200).json({
      message: 'Group added to existing booking successfully and internal duplicate booking created',
      data: {
        bookingId: result.booking.id,
        duplicateBookingId: result.duplicateBooking.id,
        passengerCount: result.booking.passengerCount,
        status: result.booking.status,
      },
    });
  } catch (error: any) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Error adding group to existing booking:', error);
    res.status(500).json({ error: error.message || 'Failed to add group to existing booking' });
  }
});

export default router;
