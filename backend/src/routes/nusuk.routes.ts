import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { NusukService } from '../services/nusukService';

const router = Router();

// Validation for saving settings
const saveSettingsValidation = [
  body('token').isString().notEmpty().withMessage('Bearer token is required'),
  body('activeEntityId').optional().isString().trim(),
  body('activeEntityTypeId').optional().isString().trim(),
  body('entityId').optional().isString().trim(),
  body('checkByPassport').optional().isBoolean(),
  body('externalAgentCodes').optional().isString().trim(),
  body('syncSchedule').optional().isString().trim(),
];

// Get Nusuk settings
router.get(
  '/settings',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await NusukService.getSettings();
    res.json(settings);
  })
);

// Save Nusuk settings
router.post(
  '/settings',
  authenticate,
  saveSettingsValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { token, activeEntityId, activeEntityTypeId, entityId, checkByPassport, externalAgentCodes, syncSchedule } = req.body;
    const settings = await NusukService.saveSettings({
      token,
      activeEntityId,
      activeEntityTypeId,
      entityId,
      checkByPassport,
      externalAgentCodes,
      syncSchedule,
    });
    
    res.json({
      message: 'Nusuk settings updated successfully',
      settings,
    });
  })
);

// Trigger synchronization manually
router.post(
  '/sync',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await NusukService.triggerSync();
      res.json({
        message: 'Sync completed successfully',
        ...result,
      });
    } catch (error: any) {
      console.error('[NUSUK SYNC ROUTE ERROR]', error);
      res.status(400).json({
        error: error.message || 'Synchronization failed',
      });
    }
  })
);

// Get travel mismatches list
router.get(
  '/mismatches',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const resolved = req.query.resolved === 'true';
    const mismatches = await NusukService.getMismatches({ resolved });
    res.json(mismatches);
  })
);

// Resolve travel mismatch
router.post(
  '/mismatches/:id/resolve',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const mismatch = await NusukService.resolveMismatch(id);
    res.json({
      message: 'Mismatch resolved successfully',
      mismatch,
    });
  })
);

export default router;
