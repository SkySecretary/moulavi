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
  body('isCloudApi').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

// Create channel
router.post(
  '/',
  authenticate,
  authorize('admin'),
  channelValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, baseUrl, apiKey, apiSecret, channelId, isCloudApi, isActive } = req.body;

    const channel = await prisma.whatsappChannel.create({
      data: {
        name,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        channelId: channelId.trim(),
        isCloudApi: isCloudApi !== undefined ? Boolean(isCloudApi) : false,
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
    const { name, baseUrl, apiKey, apiSecret, channelId, isCloudApi, isActive } = req.body;

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
        isCloudApi: isCloudApi !== undefined ? Boolean(isCloudApi) : false,
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
            isCloudApi: true,
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

// Map use case to channel (with templateName, language, customMessage, isCloudApi)
router.post(
  '/mappings',
  authenticate,
  authorize('admin'),
  [
    body('useCase').isString().notEmpty().trim().withMessage('Use case is required'),
    body('channelId').isString().notEmpty().trim().withMessage('Channel ID is required'),
    body('templateName').optional({ nullable: true }).isString(),
    body('language').optional({ nullable: true }).isString(),
    body('customMessage').optional({ nullable: true }).isString(),
    body('isCloudApi').optional({ nullable: true }).isBoolean(),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { useCase, channelId, templateName, language, customMessage, isCloudApi, isActive } = req.body;

    // Check if channel exists
    const channel = await prisma.whatsappChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return res.status(404).json({ error: 'WhatsApp channel not found' });
    }

    const effectiveIsCloudApi = isCloudApi !== undefined ? isCloudApi : channel.isCloudApi;

    // Upsert the mapping
    const mapping = await prisma.whatsappUseCaseMapping.upsert({
      where: { useCase },
      update: {
        channelId,
        templateName: templateName !== undefined ? (templateName ? templateName.trim() : null) : undefined,
        language: language !== undefined ? (language ? language.trim() : 'en_US') : undefined,
        customMessage: customMessage !== undefined ? (customMessage ? customMessage.trim() : null) : undefined,
        isCloudApi: effectiveIsCloudApi,
        isActive: isActive !== undefined ? isActive : true,
      },
      create: {
        useCase,
        channelId,
        templateName: templateName ? templateName.trim() : null,
        language: language ? language.trim() : 'en_US',
        customMessage: customMessage ? customMessage.trim() : null,
        isCloudApi: effectiveIsCloudApi,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.json({
      success: true,
      data: mapping,
      message: `Use case '${useCase}' configured successfully for channel '${channel.name}'`,
    });
  })
);

// Update single mapping details
router.put(
  '/mappings/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { channelId, templateName, language, customMessage, isCloudApi, isActive } = req.body;

    const dataToUpdate: any = {};
    if (channelId !== undefined) dataToUpdate.channelId = channelId;
    if (templateName !== undefined) dataToUpdate.templateName = templateName ? templateName.trim() : null;
    if (language !== undefined) dataToUpdate.language = language ? language.trim() : 'en_US';
    if (customMessage !== undefined) dataToUpdate.customMessage = customMessage ? customMessage.trim() : null;
    if (isCloudApi !== undefined) dataToUpdate.isCloudApi = isCloudApi;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    const mapping = await prisma.whatsappUseCaseMapping.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json({
      success: true,
      data: mapping,
      message: 'Use case configuration updated successfully',
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
    body('isCloudApi').optional().isBoolean(),
    body('templateName').optional().isString(),
    body('language').optional().isString(),
    body('message').optional().isString(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { baseUrl, apiKey, apiSecret, channelId, to, isCloudApi, templateName, language, message } = req.body;

    // Clean phone number (e.g. +1234567890)
    const cleanTo = to.replace(/\D/g, '');
    const formattedTo = cleanTo.startsWith('+') ? cleanTo : `+${cleanTo}`;

    const headers = {
      'x-api-key': apiKey.trim(),
      'x-api-secret': apiSecret.trim(),
      'x-channel-id': channelId.trim(),
      'Content-Type': 'application/json',
    };

    let targetUrl: string;
    let payload: any;

    if (isCloudApi) {
      targetUrl = `${baseUrl.trim().replace(/\/$/, '')}/messages/template`;
      payload = {
        to: formattedTo,
        templateName: templateName ? templateName.trim() : 'hello_world',
        language: language ? language.trim() : 'en_US',
      };
    } else {
      targetUrl = `${baseUrl.trim().replace(/\/$/, '')}/messages`;
      payload = {
        to: formattedTo,
        message: message || 'Hello! This is a test message from NuSync WhatsApp Multichannel system.',
      };
    }

    console.log(`[WHATSAPP-CHANNEL-TEST] Sending ${isCloudApi ? 'Cloud Template' : 'QR Text'} test request to ${targetUrl}`);
    console.log(`[WHATSAPP-CHANNEL-TEST] Recipient: ${formattedTo}`);
    console.log(`[WHATSAPP-CHANNEL-TEST] Payload:`, JSON.stringify(payload));

    try {
      const response = await axios.post(targetUrl, payload, {
        headers,
        timeout: 10000,
      });

      console.log(`[WHATSAPP-CHANNEL-TEST] Response:`, response.status, response.data);

      res.json({
        success: true,
        message: isCloudApi ? 'Cloud template message sent successfully!' : 'Test message sent successfully!',
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
