import { Router, Response } from 'express';
import { body } from 'express-validator';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../types';

const router = Router();

// Validation middleware for creating/updating whatsapp channel
const channelValidation = [
  body('name').isString().notEmpty().trim().withMessage('Name is required'),
  body('baseUrl').isString().notEmpty().trim().withMessage('Base URL is required'),
  body('apiKey').isString().notEmpty().trim().withMessage('API Key is required'),
  body('apiSecret').isString().notEmpty().trim().withMessage('API Secret is required'),
  body('channelId').isString().notEmpty().trim().withMessage('Channel ID is required'),
  body('isActive').isBoolean().optional(),
];

// Create channel
router.post(
  '/',
  authenticate,
  authorize('admin'),
  channelValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, baseUrl, apiKey, apiSecret, channelId, isActive } = req.body;

    const channel = await prisma.whatsappChannel.create({
      data: {
        name,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        channelId: channelId.trim(),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      success: true,
      data: channel,
      message: 'WhatsApp channel profile created successfully',
    });
  })
);

// Get all channels (including mappings)
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const channels = await prisma.whatsappChannel.findMany({
      include: {
        mappings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { whatsappChannels: channels },
    });
  })
);

// Update channel
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  channelValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, baseUrl, apiKey, apiSecret, channelId, isActive } = req.body;

    const existing = await prisma.whatsappChannel.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'WhatsApp channel not found' });
    }

    const updated = await prisma.whatsappChannel.update({
      where: { id },
      data: {
        name,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        channelId: channelId.trim(),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'WhatsApp channel profile updated successfully',
    });
  })
);

// Delete channel
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.whatsappChannel.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'WhatsApp channel not found' });
    }

    await prisma.whatsappChannel.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'WhatsApp channel profile deleted successfully',
    });
  })
);

// Get all use case mappings
router.get(
  '/mappings',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const mappings = await prisma.whatsappUseCaseMapping.findMany({
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { mappings },
    });
  })
);

// Map use case to channel
router.post(
  '/mappings',
  authenticate,
  authorize('admin'),
  [
    body('useCase').isString().notEmpty().trim().withMessage('Use case is required'),
    body('channelId').isString().notEmpty().trim().withMessage('Channel ID is required'),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { useCase, channelId, isActive } = req.body;

    // Check if channel exists
    const channel = await prisma.whatsappChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: 'WhatsApp channel not found' });
    }

    // Upsert the mapping
    const mapping = await prisma.whatsappUseCaseMapping.upsert({
      where: { useCase },
      update: { channelId, isActive: isActive !== undefined ? isActive : true },
      create: { useCase, channelId, isActive: isActive !== undefined ? isActive : true },
    });

    res.json({
      success: true,
      data: mapping,
      message: `Use case '${useCase}' mapped successfully to channel '${channel.name}'`,
    });
  })
);

// Toggle mapping active status
router.patch(
  '/mappings/:id',
  authenticate,
  authorize('admin'),
  [
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const mapping = await prisma.whatsappUseCaseMapping.update({
      where: { id },
      data: { isActive },
    });

    res.json({
      success: true,
      data: mapping,
      message: `Use case mapping status updated successfully`,
    });
  })
);

// Test channel configuration by sending a test message
router.post(
  '/test-config',
  authenticate,
  authorize('admin'),
  [
    body('baseUrl').isString().notEmpty().trim(),
    body('apiKey').isString().notEmpty().trim(),
    body('apiSecret').isString().notEmpty().trim(),
    body('channelId').isString().notEmpty().trim(),
    body('to').isString().notEmpty().trim().withMessage('Recipient phone number is required'),
    body('message').isString().notEmpty().trim().withMessage('Message content is required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { baseUrl, apiKey, apiSecret, channelId, to, message } = req.body;

    // Clean phone number (remove +, spaces, leading zeroes, etc.)
    const cleanTo = to.replace(/\D/g, '');
    const formattedTo = cleanTo.startsWith('+') ? cleanTo : `+${cleanTo}`;

    const headers = {
      'x-api-key': apiKey.trim(),
      'x-api-secret': apiSecret.trim(),
      'x-channel-id': channelId.trim(),
      'Content-Type': 'application/json',
    };

    const payload = {
      to: formattedTo,
      message: message,
    };

    const targetUrl = `${baseUrl.trim().replace(/\/$/, '')}/messages`;

    console.log(`[WHATSAPP-CHANNEL-TEST] Sending test request to ${targetUrl}`);
    console.log(`[WHATSAPP-CHANNEL-TEST] Recipient: ${formattedTo}`);

    try {
      const response = await axios.post(targetUrl, payload, {
        headers,
        timeout: 10000,
      });

      console.log(`[WHATSAPP-CHANNEL-TEST] Response:`, response.status, response.data);

      res.json({
        success: true,
        message: 'Test message sent successfully!',
        data: response.data,
      });
    } catch (error: any) {
      console.error(`[WHATSAPP-CHANNEL-TEST] Request failed:`, error?.message || 'Unknown error');
      if (error?.response) {
        console.error(`[WHATSAPP-CHANNEL-TEST] Response data:`, error.response.data);
        return res.status(error.response.status || 400).json({
          success: false,
          error: error.response.data?.message || error.response.data?.error || `API returned status ${error.response.status}`,
          details: error.response.data,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to make WhatsApp API request',
      });
    }
  })
);

export default router;
