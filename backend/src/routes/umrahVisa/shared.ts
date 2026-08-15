
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { combineDateTime } from '../../utils/datetime';
import { parseDateDDMMYYYY, parseSafeDate } from '../../utils/dateParser';
export { parseSafeDate };
import { s3Client, S3_CONFIG, generateS3Key, generateUniqueFileName, isS3Configured } from '../../config/s3';

// Export Prisma client instance (shared across all route files)
export const prisma = new PrismaClient();

// Flight number validation regex: 2-3 alphanumeric + optional dash + 1-10 alphanumeric
export const FLIGHT_NUMBER_REGEX = /^[A-Z0-9]{2,3}-?[A-Z0-9]{1,10}$/;

// Configure multer storage for individual bookings (S3 or local)
const individualStorage = isS3Configured()
  ? multerS3({
      s3: s3Client!,
      bucket: S3_CONFIG.BUCKET_NAME,
      key: (req: any, file: Express.Multer.File, cb: any) => {
        // For individual booking creation, upload to bookings/individual/ folder
        const uniqueFileName = generateUniqueFileName(file.originalname, file.mimetype || 'application/zip');
        const timestamp = Date.now();
        const sanitizedFileName = uniqueFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `bookings/individual/${timestamp}_${sanitizedFileName}`;
        cb(null, key);
      },
      metadata: (req: any, file: Express.Multer.File, cb: any) => {
        cb(null, {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.id || 'unknown'
        });
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = 'uploads/umrah-visa/individual';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

// Configure multer storage for group bookings (S3 or local)
const groupStorage = isS3Configured()
  ? multerS3({
      s3: s3Client!,
      bucket: S3_CONFIG.BUCKET_NAME,
      key: (req: any, file: Express.Multer.File, cb: any) => {
        // For group booking creation, upload to bookings/group/ folder
        const uniqueFileName = generateUniqueFileName(file.originalname, file.mimetype || 'application/zip');
        const timestamp = Date.now();
        const sanitizedFileName = uniqueFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `bookings/group/${timestamp}_${sanitizedFileName}`;
        cb(null, key);
      },
      metadata: (req: any, file: Express.Multer.File, cb: any) => {
        cb(null, {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.id || 'unknown'
        });
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = 'uploads/umrah-visa/group';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

// Common file filter for both individual and group
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow ZIP files and various images for PAN card uploads (legacy/alternate support)
  if (file.fieldname === 'panCardZipFile' || file.fieldname === 'documents') {
    const allowedTypes = /zip|application\/zip|application\/x-zip-compressed|jpeg|jpg|png|pdf|heic|heif|webp|image\/(jpeg|jpg|png|heic|heif|webp)/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype || extname || file.originalname.toLowerCase().endsWith('.zip')) {
      return cb(null, true);
    } else {
      cb(new Error('Only ZIP, images (JPEG, JPG, PNG, HEIC, WEBP) and PDF files are allowed'));
    }
    return;
  }
  
  // For other files, use expanded validation
  const allowedTypes = /jpeg|jpg|png|pdf|heic|heif|webp|image\/(jpeg|jpg|png|heic|heif|webp)/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG, HEIC, WEBP) and PDF files are allowed'));
  }
};

// Export separate upload middlewares for individual and group bookings
export const uploadIndividual = multer({ 
  storage: individualStorage,
  limits: { 
    fileSize: Infinity // Individual file limit will be checked in the route/frontend
  },
  fileFilter,
});

export const uploadGroup = multer({ 
  storage: groupStorage,
  limits: { 
    fileSize: Infinity
  },
  fileFilter,
});

// Keep backward compatibility - default to individual
export const upload = uploadIndividual;

// Helper function to validate date range (80 days max)
export const validateDateRange = (arrivalDate: Date | null, departureDate: Date | null): { valid: boolean; error?: string; days?: number } => {
  if (!arrivalDate || isNaN(arrivalDate.getTime())) {
    return { valid: false, error: 'Invalid arrival date format' };
  }
  if (!departureDate || isNaN(departureDate.getTime())) {
    return { valid: false, error: 'Invalid departure date format' };
  }
  
  // Use UTC to calculate difference to avoid timezone issues
  const start = Date.UTC(arrivalDate.getUTCFullYear(), arrivalDate.getUTCMonth(), arrivalDate.getUTCDate());
  const end = Date.UTC(departureDate.getUTCFullYear(), departureDate.getUTCMonth(), departureDate.getUTCDate());
  
  if (end < start) {
    return { valid: false, error: 'Departure date cannot be before arrival date' };
  }
  
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 80) {
    return { 
      valid: false, 
      error: `Travel duration (${diffDays} days) cannot exceed 80 days`,
      days: diffDays
    };
  }
  
  return { valid: true, days: diffDays };
};

// Helper function to validate Umrah visa dates against master dates
export const validateUmrahVisaDates = (
  arrivalDate: Date, 
  departureDate: Date, 
  masterDates: { lastArrivalDate: Date; lastDepartureDate: Date } | null
): { valid: boolean; error?: string } => {
  if (!masterDates) {
    // If no master dates are set, allow all dates (backward compatibility)
    return { valid: true };
  }
  
  // Check if arrival date is within master limit
  if (arrivalDate > masterDates.lastArrivalDate) {
    return { 
      valid: false, 
      error: `Final Date of Umra Visa Arrival is ${masterDates.lastArrivalDate.toISOString().split('T')[0]}`
    };
  }
  
  // Check if departure date is within master limit
  if (departureDate > masterDates.lastDepartureDate) {
    return { 
      valid: false, 
      error: `Final Date of Umra Visa Departure is ${masterDates.lastDepartureDate.toISOString().split('T')[0]}`
    };
  }
  
  return { valid: true };
};

// Helper function to find city by name with spelling variations
export const findCityByName = async (cityName: string) => {
  const cityVariations = [cityName];
  if (cityName === 'Medina') cityVariations.push('Madinah');
  if (cityName === 'Madinah') cityVariations.push('Medina');
  if (cityName === 'Mecca') cityVariations.push('Makkah');
  if (cityName === 'Makkah') cityVariations.push('Mecca');
  
  return await prisma.cityMaster.findFirst({
    where: {
      name: { in: cityVariations },
      isActive: true,
    },
  });
};

// Common Zod schemas used by multiple route files

// Step 2 schema - used by both individual and group
// Note: Date and time are kept as separate strings for UI compatibility
// They will be combined into datetime before storing in the database
export const step2Schema = z.object({
  isOneWay: z.boolean().optional().nullable(),
  isWithoutTicket: z.boolean().optional().nullable(),
  arrivalDate: z.string().optional().nullable().or(z.literal('')),
  arrivalTime: z.string().optional().nullable().or(z.literal('')),
  arrivalAirportId: z.string().optional().nullable().or(z.literal('')),
  arrivalFlightNumber: z.string().optional().nullable().or(z.literal('')),
  departureDate: z.string().optional().nullable().or(z.literal('')),
  departureTime: z.string().optional().nullable().or(z.literal('')),
  departureAirportId: z.string().optional().nullable().or(z.literal('')),
  departureFlightNumber: z.string().optional().nullable().or(z.literal('')),
  brn: z.string().optional(),
  passengerCount: z.number().min(1).max(50).optional(),
  transportBookings: z.array(z.object({
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    vehicleType: z.string(),
    paxCount: z.number().min(1),
    price: z.number().min(0),
    travelDate: z.string().optional(),
    travelTime: z.string().optional(),
  })).optional(),
  hotelBookings: z.array(z.object({
    cityId: z.string().uuid(),
    hotelId: z.string().uuid(),
    checkInDate: z.string().transform((str) => new Date(str)),
    checkOutDate: z.string().transform((str) => new Date(str)),
    brn: z.array(z.string()).optional(),
    cateringBrn: z.array(z.string()).optional().nullable(),
  })).optional(),
}).refine((data) => {
  if (data.isWithoutTicket) {
    return true;
  }
  
  if (!data.arrivalDate || !data.arrivalTime || !data.arrivalAirportId || !data.arrivalFlightNumber) {
    return false;
  }
  if (!FLIGHT_NUMBER_REGEX.test(data.arrivalFlightNumber)) {
    return false;
  }

  if (!data.isOneWay) {
    if (!data.departureFlightNumber || !FLIGHT_NUMBER_REGEX.test(data.departureFlightNumber)) {
      return false;
    }
    return !!data.departureDate && !!data.departureTime && !!data.departureAirportId;
  }
  return true;
}, {
  message: "Flight details and valid flight number formats are required based on ticket options selected",
  path: ["arrivalFlightNumber"]
});

// Step 3 schema - used by both individual and group
export const step3Schema = z.object({
  accommodationType: z.enum(['hotel', 'iqama']),
  passengerCount: z.number().min(1).max(50).optional(), // Made optional since it comes in Step 4
  iqamaDetails: z.object({
    iqamaNumber: z.string().optional(),
    iqamaName: z.string().optional(),
    iqamaDob: z.string().transform((str) => new Date(str)).optional(),
    iqamaMobile: z.string().optional(),
    iqamaNationalShortAddress: z.string().optional(),
  }).optional(),
  hotelBookings: z.array(z.object({
    cityId: z.string().uuid(),
    hotelId: z.string().uuid(),
    checkInDate: z.string().transform((str) => new Date(str)),
    checkOutDate: z.string().transform((str) => new Date(str)),
    brn: z.array(z.string()).optional(),
  })).optional(),
}).refine((data) => {
  if (data.accommodationType === 'iqama' && data.passengerCount && data.passengerCount > 5) {
    return false;
  }
  return true;
}, {
  message: "Maximum 5 passengers allowed for iqama accommodation",
  path: ["passengerCount"]
});

// Step 4 schema - used by individual only (transport selection)
export const step4Schema = z.object({
  // Single transport selection (for non-fulltrip routes)
  selectedTransport: z.object({
    routeId: z.string().uuid(),
    transportId: z.string().uuid(),
    vehicleTypeId: z.string().uuid(),
    price: z.number(),
  }).optional(),
  // Multiple transport selection (for fulltrip routes only)
  selectedTransports: z.array(z.object({
    routeId: z.string().uuid(),
    transportId: z.string().uuid(),
    vehicleTypeId: z.string().uuid(),
    price: z.number(),
    quantity: z.number().min(1), // Number of vehicles of this type
  })).optional(),
  // Backward compatibility: support old format with passengers
  passengerCount: z.number().min(1).max(50).optional(),
  passengers: z.array(z.object({
    fullName: z.string().min(1).max(255),
    isLeadPassenger: z.boolean().default(false),
    documents: z.object({
      panCardPhoto: z.any().optional(),
      passportFront: z.any().optional(),
      passportBack: z.any().optional(),
      iqamaPhoto: z.any().optional(),
      hotelBooking: z.any().optional(),
      ticketCopy: z.any().optional(),
    }).optional(),
  })).optional(),
});

// Step 5 schema - used by individual only (ZIP file upload, same as group booking)
// No validation needed - ZIP file is handled via multer middleware
export const step5Schema = z.object({}).optional();

// Group Step 1 schema
export const groupStep1Schema = z.object({
  groupNumber: z.string().min(1, 'Group number is required'),
  groupName: z.string().min(1, 'Group name is required'),
  umrahVisaProviderId: z.string().uuid('Valid umrah visa provider ID is required').optional(),
});

// Group Step 3 schema - only transport segments and ziyaraths (hotels validated in step2)
export const groupStep3Schema = z.object({
  transportSegments: z.array(z.object({
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    fromHotelId: z.string().uuid().optional(), // LocationMaster ID for specific "from" location
    toHotelId: z.string().uuid().optional(),   // LocationMaster ID for specific "to" location
    vehicleType: z.string().optional(), // Made optional since it's not displayed in UI
    paxCount: z.number().min(0), // Changed to allow 0 (will be updated later)
    price: z.number().min(0),
    travelDate: z.string().optional(), // YYYY-MM-DD format
    travelTime: z.string().optional(), // HH:mm format
  })).optional(),
  ziyaraths: z.array(z.object({
    id: z.string(),
    ziyarathId: z.string().uuid(), // LocationMaster ID of ziyarath
    date: z.string().transform((str) => new Date(str)),
    time: z.string(),
  })).optional(),
});
