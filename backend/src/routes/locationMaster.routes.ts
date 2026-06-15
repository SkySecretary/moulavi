
import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateLocationMasterRequest, UpdateLocationMasterRequest } from '../types';
import { LocationType } from '@prisma/client';

const router = Router();

const createLocationMasterValidation = [
  body('code').isString().notEmpty().trim().isLength({ min: 2, max: 20 }),
  body('name').isString().notEmpty().trim(),
  body('locationType').isIn(['HOTEL', 'AIRPORT', 'ZIYARAT', 'OTHERS']),
  body('countryId').isUUID(),
  body('cityId').isUUID(),
  body('city').isString().notEmpty().trim(),
  body('isActive').isBoolean().optional(),
];

const updateLocationMasterValidation = [
  body('code').isString().notEmpty().trim().isLength({ min: 2, max: 20 }).optional(),
  body('name').isString().notEmpty().trim().optional(),
  body('locationType').isIn(['HOTEL', 'AIRPORT', 'ZIYARAT', 'OTHERS']).optional(),
  body('countryId').isUUID().optional(),
  body('cityId').isUUID().optional(),
  body('city').isString().notEmpty().trim().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Location Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  createLocationMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { code, name, locationType, countryId, cityId, city, isActive } = req.body as CreateLocationMasterRequest;

    // Check if location with same code and type already exists
    const existingLocation = await prisma.locationMaster.findUnique({
      where: {
        code_locationType: {
          code,
          locationType: locationType as LocationType,
        },
      },
    });

    if (existingLocation) {
      return res.status(400).json({ 
        error: `Location with code '${code}' and type '${locationType}' already exists` 
      });
    }

    // Verify country exists
    const country = await prisma.countryMaster.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return res.status(400).json({ error: 'Invalid country ID' });
    }

    // Verify city exists
    const cityMaster = await prisma.cityMaster.findUnique({
      where: { id: cityId },
    });

    if (!cityMaster) {
      return res.status(400).json({ error: 'Invalid city ID' });
    }

    // Verify city belongs to the country
    if (cityMaster.countryId !== countryId) {
      return res.status(400).json({ error: 'City does not belong to the selected country' });
    }

    const locationMaster = await prisma.locationMaster.create({
      data: {
        code,
        name,
        locationType: locationType as LocationType,
        countryId,
        cityId,
        city,
        isActive: isActive ?? true,
      },
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ locationMaster });
  })
);

// Get all Location Masters with optional filtering
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, locationType, isActive } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { city: { contains: search as string } },
        { code: { contains: search as string } },
      ];
    }
    if (locationType) {
      where.locationType = locationType as LocationType;
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }

    const [locationMasters, total] = await Promise.all([
      prisma.locationMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
        include: {
          country: {
            select: {
              id: true,
              countryCode: true,
              countryName: true,
            },
          },
          cityMaster: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.locationMaster.count({ where }),
    ]);

    res.json({
      locationMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active Location Masters only (for dropdowns/selects)
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { locationType } = req.query;

    const where: any = {
      isActive: true,
    };

    if (locationType) {
      where.locationType = locationType as LocationType;
    }

    const locationMasters = await prisma.locationMaster.findMany({
      where,
      orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ locationMasters });
  })
);

// Get Location Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const locationMaster = await prisma.locationMaster.findUnique({
      where: { id },
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!locationMaster) {
      return res.status(404).json({ error: 'Location master not found' });
    }

    res.json({ locationMaster });
  })
);

// Update Location Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateLocationMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { code, name, locationType, countryId, cityId, city, isActive } = req.body as UpdateLocationMasterRequest;

    // Check if location exists
    const existingLocation = await prisma.locationMaster.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Location master not found' });
    }

    // If code or locationType is being changed, check for duplicates
    if (code || locationType) {
      const newCode = code || existingLocation.code;
      const newType = (locationType as LocationType) || existingLocation.locationType;

      if (newCode !== existingLocation.code || newType !== existingLocation.locationType) {
        const duplicate = await prisma.locationMaster.findUnique({
          where: {
            code_locationType: {
              code: newCode,
              locationType: newType,
            },
          },
        });

        if (duplicate && duplicate.id !== id) {
          return res.status(400).json({ 
            error: `Location with code '${newCode}' and type '${newType}' already exists` 
          });
        }
      }
    }

    // Verify country if being updated
    const finalCountryId = countryId || existingLocation.countryId;
    if (countryId) {
      const country = await prisma.countryMaster.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        return res.status(400).json({ error: 'Invalid country ID' });
      }
    }

    // Verify city if being updated
    const finalCityId = cityId || existingLocation.cityId;
    if (cityId) {
      const cityMaster = await prisma.cityMaster.findUnique({
        where: { id: cityId },
      });

      if (!cityMaster) {
        return res.status(400).json({ error: 'Invalid city ID' });
      }

      // Verify city belongs to the country
      if (cityMaster.countryId !== finalCountryId) {
        return res.status(400).json({ error: 'City does not belong to the selected country' });
      }
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (locationType !== undefined) updateData.locationType = locationType as LocationType;
    if (countryId !== undefined) updateData.countryId = countryId;
    if (cityId !== undefined) updateData.cityId = cityId;
    if (city !== undefined) updateData.city = city;
    if (isActive !== undefined) updateData.isActive = isActive;

    const locationMaster = await prisma.locationMaster.update({
      where: { id },
      data: updateData,
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ locationMaster });
  })
);

// Toggle Location Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const locationMaster = await prisma.locationMaster.findUnique({
      where: { id },
    });

    if (!locationMaster) {
      return res.status(404).json({ error: 'Location master not found' });
    }

    const updatedLocationMaster = await prisma.locationMaster.update({
      where: { id },
      data: { isActive: !locationMaster.isActive },
      include: {
        country: {
          select: {
            id: true,
            countryCode: true,
            countryName: true,
          },
        },
        cityMaster: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ locationMaster: updatedLocationMaster });
  })
);

// Delete Location Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const locationMaster = await prisma.locationMaster.findUnique({
      where: { id },
    });

    if (!locationMaster) {
      return res.status(404).json({ error: 'Location master not found' });
    }

    await prisma.locationMaster.delete({
      where: { id },
    });

    res.json({ message: 'Location master deleted successfully' });
  })
);

export default router;
