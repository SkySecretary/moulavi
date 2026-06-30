
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
  step3Schema,
  step4Schema,
  step5Schema,
  FLIGHT_NUMBER_REGEX,
  uploadIndividual,
} from './umrahVisa/shared';
import { combineDateTime, splitDateTime } from '../utils/datetime';
import { syncBookingToVoucher } from '../utils/bookingVoucherSync';
import { isS3Configured, s3Client, S3_CONFIG, getEndpoint, extractS3KeyFromUrl } from '../config/s3';
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { generateBookingReference } from '../services/bookingService';

const router = Router();

// Individual Step 1 schema - specific to individual visa
const step1Schema = z.object({
  bookingMode: z.enum(['group_number', 'travel_details']),
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  umrahVisaProviderId: z.string().uuid().optional(),
}).refine((data) => {
  if (data.bookingMode === 'group_number') {
    if (!data.groupNumber || !data.groupName) {
      return false;
    }
    if (!data.umrahVisaProviderId) {
      return false;
    }
  }
  return true;
}, {
  message: "Group number, group name, and umrah visa provider are required when booking mode is 'group_number'",
  path: ["groupNumber"]
});

// Complete booking schema - combines all steps
// Note: step5 is now optional and only used for ZIP file upload (handled via multer)
const completeBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: step1Schema,
  step2: step2Schema,
  step3: step3Schema,
  step4: step4Schema.optional(), // Transport selection (optional)
  step5: step5Schema.optional(), // ZIP file upload (handled via multer, not in JSON)
});

// POST /api/umrah-visa/step1 - Step 1: Validation Only (No DB writes)
router.post('/step1', authenticate, async (req, res) => {
  try {
    const { partyId, ...step1Data } = req.body;
    const user = (req as any).user;
    
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Validate only step1 data (without partyId)
    const validatedData = step1Schema.parse(step1Data);

    // Check if group number is unique system-wide
    if (validatedData.bookingMode === 'group_number' && validatedData.groupNumber) {
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
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 1 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 1 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 1' });
  }
});

// POST /api/umrah-visa/step2 - Step 2: Validation Only (No DB writes)
router.post('/step2', authenticate, async (req, res) => {
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
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 2 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 2 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 2' });
  }
});

// POST /api/umrah-visa/step3 - Step 3: Validation Only (No DB writes)
router.post('/step3', authenticate, async (req, res) => {
  try {
    const validatedData = step3Schema.parse(req.body);

    // Validate iqama passenger count
    if (validatedData.accommodationType === 'iqama' && validatedData.passengerCount && validatedData.passengerCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 passengers allowed for iqama accommodation' });
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 3 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 3 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 3' });
  }
});

// POST /api/umrah-visa/step4 - Step 4: Validation Only (No DB writes)
router.post('/step4', authenticate, async (req, res) => {
  try {
    // Step 4 is transport selection - optional for individual bookings
    // Allow empty/undefined data since transport is optional
    const step4Data = req.body;
    
    // If step4Data is empty or undefined, it's valid (transport is optional)
    if (!step4Data || Object.keys(step4Data).length === 0) {
      return res.status(200).json({
        message: 'Step 4 validation successful (no transport selected)',
        valid: true,
      });
    }

    // Validate using step4Schema if data is provided
    const validatedData = step4Schema.parse(step4Data);

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-booking endpoint
    res.status(200).json({
      message: 'Step 4 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in step 4 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 4' });
  }
});

// POST /api/umrah-visa/create-booking - Create complete booking (all steps in one transaction)
// POST /api/umrah-visa/create-booking - Create complete booking (all steps in one transaction)
router.post('/create-booking', authenticate, uploadIndividual.fields([
  { name: 'panCardZipFile', maxCount: 1 },
  { name: 'documents', maxCount: 500 }, // legacy
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
    
    // Check file size limits for multiple documents (50MB each)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const allFileFields = [
      'documents',
      'passportCopies',
      'passengerPhotos',
      'panCardCopies',
      'iqamaCopies',
      'onwardTickets',
      'returnTickets',
      'nationalAddresses'
    ];
    if (files) {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      for (const field of allFileFields) {
        const fieldFiles = files[field];
        if (fieldFiles && Array.isArray(fieldFiles)) {
          for (const file of fieldFiles) {
            if (file.size > MAX_FILE_SIZE) {
              return res.status(400).json({ error: `File ${file.originalname} exceeds the 50MB size limit` });
            }
          }
        }
      }
    }

    // Parse JSON strings from FormData (if FormData) or use req.body directly (if JSON)
    let step1Data, step2Data, step3Data, step4Data, step5Data: { movements?: any[] } | undefined, partyId;
    let passportNumbers: string[] = [];
    
    if (req.body.step1) {
      // FormData mode - parse JSON strings
      partyId = req.body.partyId;
      step1Data = JSON.parse(req.body.step1);
      step2Data = JSON.parse(req.body.step2);
      step3Data = JSON.parse(req.body.step3);
      step4Data = req.body.step4 ? JSON.parse(req.body.step4) : undefined;
      step5Data = req.body.step5 ? JSON.parse(req.body.step5) : undefined;
      
      if (req.body.passportNumbers) {
        try {
          passportNumbers = JSON.parse(req.body.passportNumbers);
        } catch (e) {
          console.error('Error parsing passport numbers:', e);
        }
      }
      
      // Convert date strings to Date objects for step3Data hotel bookings
      if (step3Data.hotelBookings && Array.isArray(step3Data.hotelBookings)) {
        step3Data.hotelBookings = step3Data.hotelBookings.map((hotel: any) => ({
          ...hotel,
          checkInDate: parseSafeDate(hotel.checkInDate),
          checkOutDate: parseSafeDate(hotel.checkOutDate),
        }));
      }
    } else {
      // JSON mode (backward compatibility)
      const validatedData = completeBookingSchema.parse(req.body);
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
          const limit = 3; // Daily individual limit under throttle
          if (count >= limit) {
            return res.status(429).json({
              error: `Booking throttled: Daily capacity restricted to ${limit} bookings for YELLOW compliance status (current: ${count}).`
            });
          }
        }
      }
    } catch (e: any) {
      console.error('[COMPLIANCE INDIVIDUAL CHECK FAILED]', e.message);
    }

    // Check if group number is unique system-wide (if provided)
    if (step1Data.bookingMode === 'group_number' && step1Data.groupNumber) {
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

    // Additional validations - convert date strings to Date objects for validation
    const arrivalDateObj = parseSafeDate(step2Data.arrivalDate);
    const departureDateObj = parseSafeDate(step2Data.departureDate);
    const dateRangeValidation = validateDateRange(arrivalDateObj, departureDateObj);
    if (!dateRangeValidation.valid) {
      return res.status(400).json({ error: dateRangeValidation.error });
    }

    // Since we know they are valid dates now, cast for the next functions
    const validArrivalDate = arrivalDateObj!;
    const validDepartureDate = departureDateObj!;

    // Validate passenger count (from step2Data)
    const passengerCount = step2Data.passengerCount;
    if (!passengerCount || passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    if (step3Data.accommodationType === 'iqama' && passengerCount > 5) {
      return res.status(400).json({ error: 'Maximum 5 passengers allowed for iqama accommodation' });
    }

    // Validate file upload (ZIP or Multiple files or Split files)
    const zipFile = files?.['panCardZipFile']?.[0];
    const multipleDocs = files?.['documents'];
    const hasSplitFiles = allFileFields.some(field => files?.[field] && files[field].length > 0);
    
    if (!zipFile && (!multipleDocs || multipleDocs.length === 0) && !hasSplitFiles) {
      return res.status(400).json({ 
        error: 'Documents are required. Please upload files in their corresponding categories.' 
      });
    }

    // Create passengers array from passengerCount (no individual names required, same as group booking)
    const finalPassengerCount = passengerCount;
    const finalPassengers = Array(passengerCount).fill(null).map((_, index) => ({
      fullName: step1Data.groupName || `Passenger ${index + 1}`, // Use group name if available, otherwise default
      isLeadPassenger: index === 0,
    }));

    // Calculate hasTransportation
    // Check for both single transport selection and multiple transport selection (for fulltrip routes)
    const hasTransportation = !!(step4Data?.selectedTransport?.transportId || 
      (step4Data?.selectedTransports && step4Data.selectedTransports.length > 0) ||
      (step2Data.transportBookings && step2Data.transportBookings.length > 0));

    // PRE-FETCH: Collect all unique IDs needed for LocationMaster lookups
    const allLocationIds = new Set<string>();
    const allCityIds = new Set<string>();
    
    // Add airport IDs
    if (step2Data.arrivalAirportId) allLocationIds.add(step2Data.arrivalAirportId);
    if (step2Data.departureAirportId) allLocationIds.add(step2Data.departureAirportId);
    
    // Add hotel IDs and city IDs from hotel bookings
    if (step3Data.accommodationType === 'hotel' && step3Data.hotelBookings) {
      step3Data.hotelBookings.forEach((hotel: any) => {
        if (hotel.hotelId) allLocationIds.add(hotel.hotelId);
        // Note: hotel.cityId is now a CityMaster ID (no longer needs conversion)
        if (hotel.cityId) allCityIds.add(hotel.cityId);
      });
    }
    
    // For iqama bookings: Add Jeddah City Center location if movements exist
    // We'll fetch it by name and city if needed
    if (step3Data.accommodationType === 'iqama' && step5Data?.movements && step5Data.movements.length > 0) {
      // Check if any movement has a toLocationId that might be Jeddah City Center
      step5Data.movements.forEach((movement: any) => {
        if (movement.toLocationId) {
          allLocationIds.add(movement.toLocationId);
        }
        if (movement.fromLocationId) {
          allLocationIds.add(movement.fromLocationId);
        }
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
      locationMap.set(lm.id, lm);
      if (lm.cityId) {
        if (!cityToLocationMap.has(lm.cityId)) {
          cityToLocationMap.set(lm.cityId, []);
        }
        cityToLocationMap.get(lm.cityId)!.push(lm);
      }
    });

    // Helper function to resolve location ID
    const resolveLocationId = (id: string, preferType?: string): string | null => {
      // First check if it's a LocationMaster ID
      if (locationMap.has(id)) {
        return id;
      }
      // Otherwise, check if it's a City ID
      const cityLocations = cityToLocationMap.get(id);
      if (cityLocations && cityLocations.length > 0) {
        if (preferType) {
          const preferred = cityLocations.find((l) => l.locationType === preferType);
          if (preferred) return preferred.id;
        }
        return cityLocations[0].id;
      }
      return null;
    };

    // Determine initial status
    let initialStatus: 'pending' | 'group_assigned';
    const hasGroupNumber = !!(step1Data.groupNumber && step1Data.groupName);
    if (!hasGroupNumber) {
      initialStatus = 'pending';
    } else {
      // If hasGroupNumber is true, always set to group_assigned (regardless of accommodation type)
      initialStatus = 'group_assigned';
    }

    // Generate unique booking reference
    const bookingReference = await generateBookingReference();

    // Save everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create UmrahVisaBooking directly with partyId
      const booking = await tx.umrahVisaBooking.create({
        data: {
          partyId: partyId,
          bookingReference,
          submittedAt: new Date(),
          groupNumber: step1Data.groupNumber,
          groupName: step1Data.groupName,
          hasGroupNumber,
          passengerCount: step2Data.passengerCount || finalPassengerCount,
          umrahVisaProviderId: step1Data.umrahVisaProviderId || null,
          status: initialStatus,
          visaType: 'individual_visa',
          accommodationType: step3Data.accommodationType,
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

      // 4. Create accommodation details based on type
      if (step3Data.accommodationType === 'hotel' && step3Data.hotelBookings && Array.isArray(step3Data.hotelBookings) && step3Data.hotelBookings.length > 0) {
          // Create hotel bookings directly linked to booking
          const createdHotelBookings = await Promise.all(
            step3Data.hotelBookings.map(async (hotel: any) => {
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
                  bedsQuantity: hotel.bedsQuantity !== undefined && hotel.bedsQuantity !== null 
                    ? parseInt(hotel.bedsQuantity, 10) 
                    : null,
                },
              });
            })
          );
      } else if (step3Data.accommodationType === 'iqama' && step3Data.iqamaDetails) {
        // Create sponsor iqama details
        await tx.umrahSponserIqamaDetails.create({
          data: {
            bookingId: booking.id,
            iqamaSponserName: step3Data.iqamaDetails.iqamaName || '',
            iqamaNumber: step3Data.iqamaDetails.iqamaNumber || '',
            sponserDob: step3Data.iqamaDetails.iqamaDob ? new Date(step3Data.iqamaDetails.iqamaDob) : new Date(),
            sponserMobileNumber: step3Data.iqamaDetails.iqamaMobile || '',
            sponserNationalShortAddress: step3Data.iqamaDetails.iqamaNationalShortAddress || '',
          },
        });
      }

      // 6. Create UmrahTransportBooking (if provided) - using new format with transportMasterId
      if (step4Data?.selectedTransport?.transportId) {
        await tx.umrahTransportBooking.create({
          data: {
            bookingId: booking.id,
            transportMasterId: step4Data.selectedTransport.transportId,
            travelDateTime: null, // Can be set later if needed
          },
        });
      } else if (step4Data?.selectedTransports && step4Data.selectedTransports.length > 0) {
        // Handle multiple transport selections (for fulltrip routes)
        // Create transport bookings for each selected transport with quantity
        for (const transport of step4Data.selectedTransports) {
          // Create one booking per quantity
          for (let i = 0; i < (transport.quantity || 1); i++) {
            await tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                transportMasterId: transport.transportId,
                travelDateTime: null, // Can be set later if needed
              },
            });
          }
        }
      }

      // 6.5. Create UmrahMovementDetail entries from step5Data.movements (unified model)
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

      // Process unified movements array from step5Data
      // Only process movements if transport is selected (movements should only exist if transport is selected)
      const hasTransport = !!(step4Data?.selectedTransport?.transportId || 
                               (step4Data?.selectedTransports && step4Data.selectedTransports.length > 0));
      if (hasTransport && step5Data?.movements && Array.isArray(step5Data.movements) && step5Data.movements.length > 0) {
        for (const movement of step5Data.movements) {
          // Get LocationMaster for "from" location
          let fromLocation = locationMap.get(movement.fromLocationId);
          if (!fromLocation) {
            // Try to fetch it if not in pre-fetched map (e.g., for iqama bookings)
            const fetchedFromLocation = await tx.locationMaster.findUnique({
              where: { id: movement.fromLocationId },
              select: { id: true, cityId: true, locationType: true },
            });
            if (fetchedFromLocation) {
              locationMap.set(fetchedFromLocation.id, fetchedFromLocation);
              fromLocation = fetchedFromLocation;
            }
          }
          if (!fromLocation) {
            throw new Error(`Invalid fromLocationId in movement: ${movement.fromLocationId}`);
          }

          // Get LocationMaster for "to" location
          let toLocation = locationMap.get(movement.toLocationId);
          if (!toLocation) {
            // Try to fetch it if not in pre-fetched map (e.g., Jeddah City Center for iqama)
            const fetchedToLocation = await tx.locationMaster.findUnique({
              where: { id: movement.toLocationId },
              select: { id: true, cityId: true, locationType: true },
            });
            if (fetchedToLocation) {
              locationMap.set(fetchedToLocation.id, fetchedToLocation);
              toLocation = fetchedToLocation;
            }
          }
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

      // 7. Create UmrahPassenger (all passengers)
      const passengers = await Promise.all(
        finalPassengers.map((passenger, index) => {
          const passportNo = passportNumbers[index] || null;
          return tx.umrahPassenger.create({
            data: {
              bookingId: booking.id,
              fullName: passenger.fullName,
              isLeadPassenger: hasGroupNumber ? (passenger.isLeadPassenger) : passenger.isLeadPassenger,
              passportNumber: passportNo,
            },
          });
        })
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

      // Handle multiple documents (legacy)
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

      // Handle split documents (new feature)
      const splitDocFields: { field: string; type: string; linkToPassenger?: boolean }[] = [
        { field: 'passportCopies', type: 'passport_copy', linkToPassenger: true },
        { field: 'passengerPhotos', type: 'passenger_photo', linkToPassenger: true },
        { field: 'panCardCopies', type: 'pan_card' },
        { field: 'iqamaCopies', type: 'iqama' },
        { field: 'onwardTickets', type: 'onward_ticket' },
        { field: 'returnTickets', type: 'return_ticket' },
        { field: 'nationalAddresses', type: 'national_address' }
      ];

      for (const { field, type, linkToPassenger } of splitDocFields) {
        const fieldFiles = files?.[field];
        if (fieldFiles && Array.isArray(fieldFiles)) {
          for (let idx = 0; idx < fieldFiles.length; idx++) {
            const f = fieldFiles[idx];
            let finalFilePath = isS3Configured() ? (f as any).location : f.path;
            let finalFileName = f.originalname;

            // Append passport number to passport copies and passenger photos
            if ((field === 'passportCopies' || field === 'passengerPhotos') && passengers[idx]) {
              const passportNo = passportNumbers[idx] || '';
              if (passportNo) {
                const ext = path.extname(f.originalname);
                const baseName = path.basename(f.originalname, ext);
                const newFileName = `${passportNo}_${baseName}${ext}`;

                if (isS3Configured() && s3Client) {
                  // S3 key copy and rename
                  const oldKey = (f as any).key || extractS3KeyFromUrl((f as any).location);
                  if (oldKey) {
                    const newKey = `bookings/individual/${Date.now()}_${newFileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    try {
                      const copySource = `${S3_CONFIG.BUCKET_NAME}/${oldKey}`;
                      await s3Client.send(new CopyObjectCommand({
                        Bucket: S3_CONFIG.BUCKET_NAME,
                        CopySource: copySource,
                        Key: newKey,
                      }));
                      
                      await s3Client.send(new DeleteObjectCommand({
                        Bucket: S3_CONFIG.BUCKET_NAME,
                        Key: oldKey,
                      }));

                      const endpoint = getEndpoint() || `https://s3.${S3_CONFIG.REGION}.amazonaws.com`;
                      finalFilePath = endpoint.includes('digitaloceanspaces.com')
                        ? endpoint.replace('https://', `https://${S3_CONFIG.BUCKET_NAME}.`) + `/${newKey}`
                        : `${endpoint}/${S3_CONFIG.BUCKET_NAME}/${newKey}`;
                      finalFileName = newFileName;
                    } catch (s3Error) {
                      console.error('Error renaming S3 object:', s3Error);
                    }
                  }
                } else {
                  // Local file rename
                  const uploadDir = path.dirname(f.path);
                  const newPath = path.join(uploadDir, `${Date.now()}_${newFileName}`);
                  try {
                    fs.renameSync(f.path, newPath);
                    finalFilePath = newPath;
                    finalFileName = newFileName;
                  } catch (fsError) {
                    console.error('Error renaming local file:', fsError);
                  }
                }
              }
            }

            const docData: any = {
              bookingId: booking.id,
              documentType: type,
              fileName: finalFileName,
              filePath: finalFilePath,
              fileSize: f.size,
              mimeType: f.mimetype,
            };

            if (linkToPassenger && passengers[idx]) {
              docData.passengerId = passengers[idx].id;
            }

            docsToCreate.push(docData);
          }
        }
      }

      if (docsToCreate.length > 0) {
        await tx.document.createMany({
          data: docsToCreate,
        });
      }

      // 8. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: initialStatus,
          changedBy: user.id,
          reason: 'Booking created',
        },
      });

      return { booking, travelDetails, passengers };
    }, {
      maxWait: 10000,  // 10 seconds max wait
      timeout: 30000,  // 30 seconds timeout
    });

    res.status(201).json({
      message: 'Booking completed successfully',
      data: {
        bookingId: result.booking.id,
          passengerCount: finalPassengerCount,
          passengers: result.passengers,
          status: initialStatus,
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
    
    console.error('❌ Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PATCH /api/umrah-visa/:bookingId/travel-details - Update travel details (dates/times/flight numbers)
router.patch('/:bookingId/travel-details', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log(`[DEBUG] Updating travel details for booking ${bookingId}`);
    console.log(`[DEBUG] Full Body:`, JSON.stringify(req.body, null, 2));

    const {
      arrivalDate,
      arrivalTime,
      arrivalFlightNumber,
      departureDate,
      departureTime,
      departureFlightNumber,
      brn,
      arrivalDateTime: incomingArrivalDateTime,
      departureDateTime: incomingDepartureDateTime,
    } = req.body || {};
    
    // Combine date and time into datetime before storing
    // Support both separate date/time and direct ISO string
    let arrivalDateTime = incomingArrivalDateTime ? new Date(incomingArrivalDateTime) : undefined;
    if (!arrivalDateTime && arrivalDate) {
      arrivalDateTime = combineDateTime(arrivalDate, arrivalTime || '12:00');
    }
    
    let departureDateTime = incomingDepartureDateTime ? new Date(incomingDepartureDateTime) : undefined;
    if (!departureDateTime && departureDate) {
      departureDateTime = combineDateTime(departureDate, departureTime || '12:00');
    }

    console.log(`[DEBUG] Result: arrivalDateTime=${arrivalDateTime?.toISOString()}, departureDateTime=${departureDateTime?.toISOString()}`);

    // Get existing travel details to preserve values if not provided
    const existing = await prisma.umrahTravelDetails.findUnique({
      where: {
        bookingId_isAlternate: {
          bookingId,
          isAlternate: false,
        },
      },
    });

    const travel = await prisma.umrahTravelDetails.upsert({
      where: {
        bookingId_isAlternate: {
          bookingId,
          isAlternate: false,
        },
      },
      update: {
        arrivalDateTime: arrivalDateTime ?? existing?.arrivalDateTime,
        arrivalFlightNumber: arrivalFlightNumber ?? existing?.arrivalFlightNumber,
        departureDateTime: departureDateTime ?? existing?.departureDateTime,
        departureFlightNumber: departureFlightNumber ?? existing?.departureFlightNumber,
        brn: brn !== undefined ? brn : existing?.brn,
        arrivalAirportId: req.body?.arrivalAirportId ?? existing?.arrivalAirportId,
        departureAirportId: req.body?.departureAirportId ?? existing?.departureAirportId,
      },
      create: {
        bookingId,
        isAlternate: false,
        arrivalDateTime: arrivalDateTime ?? new Date(),
        arrivalFlightNumber: arrivalFlightNumber ?? '',
        departureDateTime: departureDateTime ?? new Date(),
        departureFlightNumber: departureFlightNumber ?? '',
        brn: brn || null,
        arrivalAirportId: req.body?.arrivalAirportId,
        departureAirportId: req.body?.departureAirportId,
      },
    });

    // Sync flight details back to voucher
    await syncBookingToVoucher(prisma, bookingId);

    // Split datetime back to date and time for response (UI compatibility)
    const response = {
      ...travel,
      arrivalDate: splitDateTime(travel.arrivalDateTime)?.date,
      arrivalTime: splitDateTime(travel.arrivalDateTime)?.time,
      departureDate: splitDateTime(travel.departureDateTime)?.date,
      departureTime: splitDateTime(travel.departureDateTime)?.time,
    };

    res.json({ travelDetails: response });
  } catch (error) {
    console.error('Error updating travel details:', error);
    res.status(500).json({ error: 'Failed to update travel details' });
  }
});

// PATCH /api/umrah-visa/:bookingId/accommodation - Update iqama fields and hotel booking dates
router.patch('/:bookingId/accommodation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      accommodationType, 
      iqamaSponserName, 
      iqamaNumber, 
      sponserDob, 
      sponserMobileNumber, 
      sponserNationalShortAddress,
      makkahHotelName,
      makkahBrn,
      madinahHotelName,
      madinahBrn,
      hotelBookings 
    } = req.body || {};

    console.log(`[DEBUG] Updating accommodation for booking ${bookingId}`);
    console.log(`[DEBUG] Type: ${accommodationType}`);

    // Update accommodation type in booking table if provided
    if (accommodationType) {
      await prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: { accommodationType },
      });
    }

    // Get current booking state
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { accommodationType: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update based on accommodation type
    if (booking.accommodationType === 'iqama') {
      // Update or create sponsor iqama details
      const sponsorIqama = await prisma.umrahSponserIqamaDetails.upsert({
        where: {
          bookingId_isAlternate: {
            bookingId,
            isAlternate: false,
          },
        },
        update: {
          iqamaSponserName: iqamaSponserName ?? undefined,
          iqamaNumber: iqamaNumber ?? undefined,
          sponserDob: sponserDob ? new Date(sponserDob) : undefined,
          sponserMobileNumber: sponserMobileNumber ?? undefined,
          sponserNationalShortAddress: sponserNationalShortAddress ?? undefined,
          makkahHotelName: makkahHotelName ?? undefined,
          makkahBrn: makkahBrn ?? undefined,
          madinahHotelName: madinahHotelName ?? undefined,
          madinahBrn: madinahBrn ?? undefined,
        },
        create: {
          bookingId,
          isAlternate: false,
          iqamaSponserName: iqamaSponserName || '',
          iqamaNumber: iqamaNumber || '',
          sponserDob: sponserDob ? new Date(sponserDob) : new Date(),
          sponserMobileNumber: sponserMobileNumber || '',
          sponserNationalShortAddress: sponserNationalShortAddress || '',
          makkahHotelName: makkahHotelName || null,
          makkahBrn: makkahBrn || null,
          madinahHotelName: madinahHotelName || null,
          madinahBrn: madinahBrn || null,
        },
      });

      return res.json({ sponsorIqamaDetails: sponsorIqama });
    } else if (booking.accommodationType === 'hotel') {
      // Update hotel bookings
      if (Array.isArray(hotelBookings)) {
        for (const h of hotelBookings) {
          if (!h?.id) continue;
          await prisma.umrahHotelBooking.update({
            where: { id: h.id },
            data: {
              cityId: h.cityId ?? undefined,
              hotelId: h.hotelId ?? undefined,
              checkInDate: parseSafeDate(h.checkInDate) || undefined,
              checkOutDate: parseSafeDate(h.checkOutDate) || undefined,
              brn: h.brn ?? undefined,
              additionalBrns: h.additionalBrns ? (h.additionalBrns as any) : undefined,
              bedsQuantity: h.bedsQuantity !== undefined ? (h.bedsQuantity !== null ? parseInt(h.bedsQuantity, 10) : null) : undefined,
            },
          });
        }
      }

      // Sync hotel changes to voucher
      await syncBookingToVoucher(prisma, bookingId);

      try {
        const { InventoryService } = require('../services/inventoryService');
        await InventoryService.recalculateAll();
      } catch (err) {
        console.error('Failed to recalculate inventories on accommodation patch:', err);
      }

      const refreshed = await prisma.umrahHotelBooking.findMany({
        where: { bookingId },
        include: { hotel: true, city: true },
        orderBy: { checkInDate: 'asc' },
      });

      return res.json({ hotelBookings: refreshed });
    }

    res.json({ message: 'No accommodation details to update' });
  } catch (error) {
    console.error('Error updating accommodation:', error);
    res.status(500).json({ error: 'Failed to update accommodation' });
  }
});

// PATCH /api/umrah-visa/:bookingId/passengers - Bulk update passenger fields
router.patch('/:bookingId/passengers', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { passengers } = req.body || {};
    if (Array.isArray(passengers)) {
      for (const p of passengers) {
        // Safe date conversion helper
        const parseDate = (d: any) => {
          if (!d) return null;
          const date = new Date(d);
          return isNaN(date.getTime()) ? null : date;
        };

        if (p.id && !p.id.startsWith('new-')) {
          // Update existing passenger
          await prisma.umrahPassenger.update({
            where: { id: p.id },
            data: {
              fullName: p.fullName,
              passportNumber: p.passportNumber || null,
              nationality: p.nationality || null,
              passportExpiry: parseDate(p.passportExpiry),
              dateOfBirth: parseDate(p.dateOfBirth),
              gender: p.gender || null,
              phoneNumber: p.phoneNumber || null,
            },
          });
        } else {
          // Create new passenger
          await prisma.umrahPassenger.create({
            data: {
              bookingId,
              fullName: p.fullName || 'New Passenger',
              passportNumber: p.passportNumber || null,
              nationality: p.nationality || null,
              passportExpiry: parseDate(p.passportExpiry),
              dateOfBirth: parseDate(p.dateOfBirth),
              gender: p.gender || 'male',
              phoneNumber: p.phoneNumber || null,
              isLeadPassenger: p.isLeadPassenger || false,
            },
          });
        }
      }
    }

    const refreshed = await prisma.umrahPassenger.findMany({ where: { bookingId } });
    res.json({ passengers: refreshed });
  } catch (error) {
    console.error('Error updating passengers:', error);
    res.status(500).json({ error: 'Failed to update passengers' });
  }
});

export default router;
