import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Default initial seed configuration for Umrah Package Calculator Master
 */
export const DEFAULT_CALCULATOR_CONFIG = {
  defaultPersons: 1,
  minPersons: 1,
  maxPersons: 50,
  defaultDays: 1,
  minDays: 1,
  maxDays: 30,
  defaultRooms: 1,
  minRooms: 1,
  maxRooms: 20,
  defaultCurrency: 'INR',
  defaultTier: 'comfort',
  defaultRoomType: 'double',
  doubleRoomRateSAR: 220,
  tripleRoomRateSAR: 280,
  quadRoomRateSAR: 340,
  sharingRoomRateSAR: 180,
  singleRoomRateSAR: 380,
  visaFeeSAR: 450,
  insuranceFeeSAR: 50,
  ziyaratCostSAR: 150,
  foodPerDaySAR: 60,
  economyMakkahRateSAR: 220,
  comfortMakkahRateSAR: 360,
  luxuryMakkahRateSAR: 550,
  economyMadinahRateSAR: 200,
  comfortMadinahRateSAR: 330,
  luxuryMadinahRateSAR: 520,
  transportBaseSAR: 450,
  transportGroupSAR: 650,
  madinahTransferSAR: 250,
  madinahTransferGroupSAR: 400,
  discountPercentage: 9,
  sarToInrRate: 22.8,
  sarToUsdRate: 0.266,
  sarToAedRate: 0.98,
  sarToEurRate: 0.245,
  sarToGbpRate: 0.21,
  isActive: true,
};

/**
 * Helper to ensure a valid config exists in DB
 */
async function getOrCreateCalculatorConfig() {
  let config = await prisma.umrahCalculatorMaster.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!config) {
    config = await prisma.umrahCalculatorMaster.create({
      data: DEFAULT_CALCULATOR_CONFIG as any,
    });
  }
  return config;
}

/**
 * GET /api/calculator-master
 * Public & Admin: Get current active Umrah Calculator master configuration
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await getOrCreateCalculatorConfig();
    res.json({
      success: true,
      data: config,
    });
  })
);

/**
 * PUT /api/calculator-master
 * Admin: Update Umrah Calculator master configuration
 */
router.put(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: any, res: Response) => {
    const current = await getOrCreateCalculatorConfig();

    const {
      defaultPersons,
      minPersons,
      maxPersons,
      defaultDays,
      minDays,
      maxDays,
      defaultRooms,
      minRooms,
      maxRooms,
      defaultCurrency,
      defaultTier,
      defaultRoomType,
      doubleRoomRateSAR,
      tripleRoomRateSAR,
      quadRoomRateSAR,
      sharingRoomRateSAR,
      singleRoomRateSAR,
      visaFeeSAR,
      insuranceFeeSAR,
      ziyaratCostSAR,
      foodPerDaySAR,
      economyMakkahRateSAR,
      comfortMakkahRateSAR,
      luxuryMakkahRateSAR,
      economyMadinahRateSAR,
      comfortMadinahRateSAR,
      luxuryMadinahRateSAR,
      transportBaseSAR,
      transportGroupSAR,
      madinahTransferSAR,
      madinahTransferGroupSAR,
      discountPercentage,
      sarToInrRate,
      sarToUsdRate,
      sarToAedRate,
      sarToEurRate,
      sarToGbpRate,
      isActive,
    } = req.body;

    const updated = await prisma.umrahCalculatorMaster.update({
      where: { id: current.id },
      data: {
        defaultPersons: defaultPersons !== undefined ? parseInt(defaultPersons, 10) : current.defaultPersons,
        minPersons: minPersons !== undefined ? parseInt(minPersons, 10) : current.minPersons,
        maxPersons: maxPersons !== undefined ? parseInt(maxPersons, 10) : current.maxPersons,
        defaultDays: defaultDays !== undefined ? parseInt(defaultDays, 10) : current.defaultDays,
        minDays: minDays !== undefined ? parseInt(minDays, 10) : current.minDays,
        maxDays: maxDays !== undefined ? parseInt(maxDays, 10) : current.maxDays,
        defaultRooms: defaultRooms !== undefined ? parseInt(defaultRooms, 10) : current.defaultRooms,
        minRooms: minRooms !== undefined ? parseInt(minRooms, 10) : current.minRooms,
        maxRooms: maxRooms !== undefined ? parseInt(maxRooms, 10) : current.maxRooms,
        defaultCurrency: defaultCurrency !== undefined ? String(defaultCurrency).trim().toUpperCase() : current.defaultCurrency,
        defaultTier: defaultTier !== undefined ? String(defaultTier).toLowerCase() : current.defaultTier,
        defaultRoomType: defaultRoomType !== undefined ? String(defaultRoomType).toLowerCase() : (current as any).defaultRoomType || 'double',
        doubleRoomRateSAR: doubleRoomRateSAR !== undefined ? Number(doubleRoomRateSAR) : (current as any).doubleRoomRateSAR ?? 220,
        tripleRoomRateSAR: tripleRoomRateSAR !== undefined ? Number(tripleRoomRateSAR) : (current as any).tripleRoomRateSAR ?? 280,
        quadRoomRateSAR: quadRoomRateSAR !== undefined ? Number(quadRoomRateSAR) : (current as any).quadRoomRateSAR ?? 340,
        sharingRoomRateSAR: sharingRoomRateSAR !== undefined ? Number(sharingRoomRateSAR) : (current as any).sharingRoomRateSAR ?? 180,
        singleRoomRateSAR: singleRoomRateSAR !== undefined ? Number(singleRoomRateSAR) : (current as any).singleRoomRateSAR ?? 380,
        visaFeeSAR: visaFeeSAR !== undefined ? Number(visaFeeSAR) : current.visaFeeSAR,
        insuranceFeeSAR: insuranceFeeSAR !== undefined ? Number(insuranceFeeSAR) : (current as any).insuranceFeeSAR ?? 50,
        ziyaratCostSAR: ziyaratCostSAR !== undefined ? Number(ziyaratCostSAR) : (current as any).ziyaratCostSAR ?? 150,
        foodPerDaySAR: foodPerDaySAR !== undefined ? Number(foodPerDaySAR) : (current as any).foodPerDaySAR ?? 60,
        economyMakkahRateSAR: economyMakkahRateSAR !== undefined ? Number(economyMakkahRateSAR) : current.economyMakkahRateSAR,
        comfortMakkahRateSAR: comfortMakkahRateSAR !== undefined ? Number(comfortMakkahRateSAR) : current.comfortMakkahRateSAR,
        luxuryMakkahRateSAR: luxuryMakkahRateSAR !== undefined ? Number(luxuryMakkahRateSAR) : current.luxuryMakkahRateSAR,
        economyMadinahRateSAR: economyMadinahRateSAR !== undefined ? Number(economyMadinahRateSAR) : current.economyMadinahRateSAR,
        comfortMadinahRateSAR: comfortMadinahRateSAR !== undefined ? Number(comfortMadinahRateSAR) : current.comfortMadinahRateSAR,
        luxuryMadinahRateSAR: luxuryMadinahRateSAR !== undefined ? Number(luxuryMadinahRateSAR) : current.luxuryMadinahRateSAR,
        transportBaseSAR: transportBaseSAR !== undefined ? Number(transportBaseSAR) : current.transportBaseSAR,
        transportGroupSAR: transportGroupSAR !== undefined ? Number(transportGroupSAR) : current.transportGroupSAR,
        madinahTransferSAR: madinahTransferSAR !== undefined ? Number(madinahTransferSAR) : current.madinahTransferSAR,
        madinahTransferGroupSAR: madinahTransferGroupSAR !== undefined ? Number(madinahTransferGroupSAR) : current.madinahTransferGroupSAR,
        discountPercentage: discountPercentage !== undefined ? Number(discountPercentage) : current.discountPercentage,
        sarToInrRate: sarToInrRate !== undefined ? Number(sarToInrRate) : current.sarToInrRate,
        sarToUsdRate: sarToUsdRate !== undefined ? Number(sarToUsdRate) : current.sarToUsdRate,
        sarToAedRate: sarToAedRate !== undefined ? Number(sarToAedRate) : current.sarToAedRate,
        sarToEurRate: sarToEurRate !== undefined ? Number(sarToEurRate) : current.sarToEurRate,
        sarToGbpRate: sarToGbpRate !== undefined ? Number(sarToGbpRate) : current.sarToGbpRate,
        isActive: isActive !== undefined ? Boolean(isActive) : current.isActive,
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Umrah Calculator Master updated successfully',
    });
  })
);

/**
 * POST /api/calculator-master/reset
 * Admin: Reset to default configuration
 */
router.post(
  '/reset',
  authenticate,
  authorize('admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const current = await getOrCreateCalculatorConfig();

    const resetConfig = await prisma.umrahCalculatorMaster.update({
      where: { id: current.id },
      data: DEFAULT_CALCULATOR_CONFIG as any,
    });

    res.json({
      success: true,
      data: resetConfig,
      message: 'Umrah Calculator Master reset to system defaults',
    });
  })
);

export default router;
