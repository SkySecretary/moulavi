
import { Router, Response } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../types';

const router = Router();

// Validation middleware for creating currency
const createCurrencyValidation = [
  body('currencyCode').isString().notEmpty().trim().withMessage('Currency code is required'),
  body('currencyName').isString().notEmpty().trim().withMessage('Currency name is required'),
  body('symbol').isString().notEmpty().trim().withMessage('Currency symbol is required'),
  body('exchangeRate').isFloat({ min: 0 }).optional().withMessage('Exchange rate must be a positive number'),
];

// Create new currency
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createCurrencyValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currencyCode, currencyName, symbol, exchangeRate } = req.body;

    // Check if currency code already exists
    const existingCurrency = await prisma.currencyMaster.findFirst({
      where: { 
        currencyCode: currencyCode.toUpperCase(),
        isActive: true 
      }
    });

    if (existingCurrency) {
      return res.status(400).json({ 
        error: 'Currency with this code already exists' 
      });
    }

    const currency = await prisma.currencyMaster.create({
      data: {
        currencyCode: currencyCode.toUpperCase(),
        currencyName,
        symbol,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1.0,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      data: currency,
      message: 'Currency created successfully'
    });
  })
);

// Get all currencies
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 1000, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { currencyCode: { contains: search as string } },
        { currencyName: { contains: search as string } },
        { symbol: { contains: search as string } },
      ];
    }

    const [currencies, total] = await Promise.all([
      prisma.currencyMaster.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { currencyCode: 'asc' },
      }),
      prisma.currencyMaster.count({ where }),
    ]);

    res.json({
      success: true,
      data: { currencyMasters: currencies },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get active currencies (public endpoint)
router.get(
  '/active',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const currencies = await prisma.currencyMaster.findMany({
      where: { isActive: true },
      orderBy: { currencyCode: 'asc' }
    });

    res.json({
      success: true,
      data: { currencyMasters: currencies }
    });
  })
);

// Get currency by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const currency = await prisma.currencyMaster.findUnique({
      where: { id }
    });

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json({
      success: true,
      data: currency
    });
  })
);

// Update currency
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  createCurrencyValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { currencyCode, currencyName, symbol, exchangeRate } = req.body;

    // Check if currency exists
    const existingCurrency = await prisma.currencyMaster.findUnique({
      where: { id }
    });

    if (!existingCurrency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Check if currency code already exists (excluding current currency)
    const duplicateCurrency = await prisma.currencyMaster.findFirst({
      where: { 
        currencyCode: currencyCode.toUpperCase(),
        isActive: true,
        id: { not: id }
      }
    });

    if (duplicateCurrency) {
      return res.status(400).json({ 
        error: 'Currency with this code already exists' 
      });
    }

    const updatedCurrency = await prisma.currencyMaster.update({
      where: { id },
      data: {
        currencyCode: currencyCode.toUpperCase(),
        currencyName,
        symbol,
        exchangeRate: exchangeRate !== undefined ? parseFloat(exchangeRate) : existingCurrency.exchangeRate
      }
    });

    res.json({
      success: true,
      data: updatedCurrency,
      message: 'Currency updated successfully'
    });
  })
);

// Delete currency
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const currency = await prisma.currencyMaster.findUnique({
      where: { id }
    });

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // Hard delete
    await prisma.currencyMaster.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Currency deleted successfully'
    });
  })
);


export default router;
