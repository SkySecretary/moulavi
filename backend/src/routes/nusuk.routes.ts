import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { NusukService } from '../services/nusukService';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Validation for saving settings
const saveSettingsValidation = [
  body('token').isString().notEmpty().withMessage('Bearer token is required'),
  body('activeEntityId').optional().isString().trim(),
  body('activeEntityTypeId').optional().isString().trim(),
  body('entityId').optional().isString().trim(),
  body('selectedUmrahCompanyIds').optional().isString().trim(),
  body('checkByPassport').optional().isBoolean(),
  body('externalAgentCodes').optional().isString().trim(),
  body('syncSchedule').optional().isString().trim(),
  body('syncType').optional().isIn(['excel', 'listing']).withMessage('Sync type must be excel or listing'),
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

    const { token, activeEntityId, activeEntityTypeId, entityId, selectedUmrahCompanyIds, checkByPassport, externalAgentCodes, syncSchedule, syncType, allowOneWayTicket, allowWithoutTicket } = req.body;
    
    let cleanedToken = String(token || '').trim();
    if (cleanedToken.toUpperCase().startsWith('BEARER ')) {
      cleanedToken = cleanedToken.substring(7).trim();
    }

    const settings = await NusukService.saveSettings({
      token: cleanedToken,
      activeEntityId,
      activeEntityTypeId,
      entityId,
      selectedUmrahCompanyIds,
      checkByPassport,
      externalAgentCodes,
      syncSchedule,
      syncType,
      allowOneWayTicket: allowOneWayTicket !== undefined ? Boolean(allowOneWayTicket) : undefined,
      allowWithoutTicket: allowWithoutTicket !== undefined ? Boolean(allowWithoutTicket) : undefined,
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
      const partyId = (req.query.partyId || req.body.partyId) as string | undefined;
      const result = await NusukService.triggerSync(partyId);
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

// Manual Excel Report Upload Synchronization
router.post(
  '/sync-excel',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded.' });
    }

    try {
      const partyId = (req.query.partyId || req.body.partyId) as string | undefined;
      const result = await NusukService.processExcelSync(req.file.buffer, partyId);
      res.json({
        message: 'Manual Excel synchronization completed successfully.',
        ...result,
      });
    } catch (error: any) {
      console.error('[MANUAL EXCEL SYNC ROUTE ERROR]', error);
      res.status(400).json({
        error: error.message || 'Manual Excel synchronization failed',
      });
    }
  })
);

// Get consulate review list with pagination and filters
router.get(
  '/consulate-review',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const partyId = req.query.partyId as string || 'all';
    const search = req.query.search as string || undefined;

    const result = await NusukService.getConsulateReview({
      page,
      limit,
      partyId,
      search
    });
    res.json(result);
  })
);

// Get travel mismatches list with pagination and filters
router.get(
  '/mismatches',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const resolved = req.query.resolved === 'true' ? true : (req.query.resolved === 'false' ? false : undefined);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const mismatchType = req.query.mismatchType as string || 'all';
    const partyId = req.query.partyId as string || 'all';
    const search = req.query.search as string || undefined;

    const result = await NusukService.getMismatches({
      resolved,
      page,
      limit,
      mismatchType,
      partyId,
      search
    });
    res.json(result);
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

// Recalculate compliance metrics manually
router.post(
  '/compliance/recalculate',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await NusukService.recalculateCompliance();
      res.json(result);
    } catch (error: any) {
      console.error('[COMPLIANCE RECALCULATE ROUTE ERROR]', error);
      res.status(400).json({
        error: error.message || 'Recalculation failed',
      });
    }
  })
);

// Get compliance summary stats
router.get(
  '/compliance/summary',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await NusukService.getComplianceSummary();
    res.json(summary);
  })
);

// Get compliance active agent registry
router.get(
  '/compliance/agents',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const registry = await NusukService.getComplianceAgents();
    res.json(registry);
  })
);

// Get compliance agent audit logs timeline
router.get(
  '/compliance/agents/:partyId/logs',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    const logs = await NusukService.getComplianceAgentLogs(partyId);
    res.json(logs);
  })
);

// Override agent status (Throttle/Suspend/Unsuspend)
router.post(
  '/compliance/agents/:partyId/override',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    const { status, reason } = req.body;
    
    if (!status || !['GREEN', 'YELLOW', 'RED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status override (GREEN, YELLOW, RED) is required.' });
    }

    await NusukService.overrideComplianceStatus(partyId, status, reason || 'No details provided');
    res.json({ message: `Agent status overridden to ${status} successfully.` });
  })
);

// Get compliance dashboard metrics for current logged-in user context
router.get(
  '/compliance/dashboard',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const role = req.user.role;
    const partyId = req.user.partyId || undefined;
    
    const dashboardStats = await NusukService.getComplianceDashboard(role, partyId);
    res.json(dashboardStats);
  })
);

// Search passengers globally by passport number (autocomplete/match search)
router.get(
  '/passengers/search',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json([]);
    }

    const results = await NusukService.searchPassengersByPassport(query, req.user?.role, req.user?.partyId || undefined);
    res.json(results);
  })
);

export default router;
