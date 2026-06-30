import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// GET /api/hotel-inventories - List all hotel inventory records
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: any, res: Response) => {
    const { cityId, hotelId } = req.query;

    const where: any = {};
    if (cityId) {
      where.hotel = { cityId };
    }
    if (hotelId) {
      where.hotelId = hotelId;
    }

    const inventories = await prisma.hotelInventory.findMany({
      where,
      include: {
        hotel: {
          select: {
            name: true,
            city: true,
            cityId: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    res.json(inventories);
  })
);

// GET /api/hotel-inventories/available - Get available BRNs for front-end selection popup
router.get(
  '/available',
  authenticate,
  asyncHandler(async (req: any, res: Response) => {
    const { hotelId } = req.query;

    if (!hotelId) {
      return res.status(400).json({ error: 'hotelId query parameter is required' });
    }

    const inventories = await prisma.hotelInventory.findMany({
      where: {
        hotelId,
        availableBeds: { gt: 0 }
      },
      orderBy: {
        availableBeds: 'desc'
      }
    });

    res.json(inventories);
  })
);

// POST /api/hotel-inventories - Create a new hotel inventory record
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: any, res: Response) => {
    const { hotelId, brnNumber, totalBeds, checkInDate, checkOutDate } = req.body;

    if (!hotelId || !brnNumber || totalBeds === undefined || totalBeds === null) {
      return res.status(400).json({ error: 'hotelId, brnNumber, and totalBeds are required' });
    }

    const bedsCount = parseInt(totalBeds, 10);
    if (isNaN(bedsCount) || bedsCount < 0) {
      return res.status(400).json({ error: 'totalBeds must be a non-negative number' });
    }

    // Check if the hotel exists
    const hotel = await prisma.locationMaster.findUnique({
      where: { id: hotelId }
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Check if this BRN is already registered for this hotel
    const existing = await prisma.hotelInventory.findUnique({
      where: {
        hotelId_brnNumber: {
          hotelId,
          brnNumber
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'This BRN is already registered for this hotel' });
    }

    const newInventory = await prisma.hotelInventory.create({
      data: {
        hotelId,
        brnNumber,
        totalBeds: bedsCount,
        availableBeds: bedsCount,
        checkInDate: checkInDate ? new Date(checkInDate) : null,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : null,
      },
      include: {
        hotel: true
      }
    });

    res.status(201).json(newInventory);
  })
);

// PUT /api/hotel-inventories/:id - Edit an existing inventory record
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { totalBeds, availableBeds, brnNumber, checkInDate, checkOutDate } = req.body;

    const inventory = await prisma.hotelInventory.findUnique({
      where: { id }
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    const data: any = {};
    if (brnNumber !== undefined) {
      data.brnNumber = brnNumber;
    }

    if (checkInDate !== undefined) {
      data.checkInDate = checkInDate ? new Date(checkInDate) : null;
    }

    if (checkOutDate !== undefined) {
      data.checkOutDate = checkOutDate ? new Date(checkOutDate) : null;
    }

    if (totalBeds !== undefined) {
      const parsedTotal = parseInt(totalBeds, 10);
      if (isNaN(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({ error: 'totalBeds must be a non-negative number' });
      }
      data.totalBeds = parsedTotal;

      if (availableBeds === undefined) {
        const diff = parsedTotal - inventory.totalBeds;
        const newAvailable = inventory.availableBeds + diff;
        data.availableBeds = newAvailable >= 0 ? newAvailable : 0;
      }
    }

    if (availableBeds !== undefined) {
      const parsedAvailable = parseInt(availableBeds, 10);
      if (isNaN(parsedAvailable) || parsedAvailable < 0) {
        return res.status(400).json({ error: 'availableBeds must be a non-negative number' });
      }
      data.availableBeds = parsedAvailable;
    }

    const updated = await prisma.hotelInventory.update({
      where: { id },
      data,
      include: {
        hotel: true
      }
    });

    res.json(updated);
  })
);

// DELETE /api/hotel-inventories/:id - Delete an inventory record
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;

    const inventory = await prisma.hotelInventory.findUnique({
      where: { id }
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    await prisma.hotelInventory.delete({
      where: { id }
    });

    res.json({ message: 'Inventory record deleted successfully' });
  })
);

export default router;
