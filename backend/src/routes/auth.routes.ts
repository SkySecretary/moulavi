
import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { comparePassword, hashPassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';

const router = Router();

// Validation middleware
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

// Login endpoint
router.post('/login', loginValidation, asyncHandler(async (req: AuthRequest, res: Response) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email, password } = req.body;
  
  console.log(`[Auth] Login attempt for email: ${email}`);
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { party: true }
  });
  
  if (!user) {
    console.log(`[Auth] User not found for email: ${email}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  console.log(`[Auth] User found: ${user.name} (${user.role}), isActive: ${user.isActive}`);
  
  // Check if user is active
  if (!user.isActive) {
    if (user.role === 'admin' || user.role === 'staff') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    // For 'party' role, we allow login but handle the restricted state in the frontend
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  console.log(`[Auth] Password validation result: ${isPasswordValid}`);
  
  if (!isPasswordValid) {
    console.log(`[Auth] Invalid password for user: ${email}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate tokens
  const payload = { 
    id: user.id, 
    email: user.email, 
    role: user.role,
    partyId: user.party?.id 
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry()
    }
  });
  
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      partyId: user.party?.id
    },
    accessToken,
    refreshToken,
  });
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database
    const token = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: {
          gt: new Date()
        }
      }
    });
    
    if (!token) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      partyId: payload.partyId,
    });
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

// Logout endpoint
router.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }
  
  res.json({ message: 'Logged out successfully' });
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
}));

// Change password endpoint
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    body('newPassword').isString().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  })
);

// Test email endpoint (for debugging)
router.post(
  '/test-email',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    try {
      const { sendCredentialsEmail } = await import('../services/emailService');
      await sendCredentialsEmail(to, 'Test User', to, 'TestPassword123');
      
      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  })
);

// Test WhatsApp endpoint (for debugging)
router.post(
  '/test-whatsapp',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { phoneNumber, message, testType } = req.body;
    
    console.log('[TEST-WHATSAPP] ========== Test WhatsApp Request ==========');
    console.log('[TEST-WHATSAPP] Request Body:', {
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
      messageLength: message?.length || 0,
      testType: testType || 'custom',
    });
    
    if (!phoneNumber) {
      console.error('[TEST-WHATSAPP] ❌ Phone number is required');
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    try {
      const whatsappService = await import('../services/whatsappService');
      let result;
      
      switch (testType) {
        case 'credentials':
          console.log('[TEST-WHATSAPP] Testing credentials template...');
          await whatsappService.sendCredentialsWhatsApp(
            phoneNumber,
            'Test User',
            'test@example.com',
            'TestPassword123'
          );
          result = 'Credentials WhatsApp message sent successfully';
          break;
          
        case 'service-confirmation':
          console.log('[TEST-WHATSAPP] Testing service confirmation template...');
          await whatsappService.sendServiceConfirmationWhatsApp(
            phoneNumber,
            'Test User',
            'Umrah Visa',
            'TEST-BOOKING-001'
          );
          result = 'Service confirmation WhatsApp message sent successfully';
          break;
          
        case 'movement-update':
          console.log('[TEST-WHATSAPP] Testing movement update template...');
          await whatsappService.sendMovementUpdateWhatsApp(
            phoneNumber,
            'Test Party',
            'VOUCHER-001',
            {
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              fromLocation: 'Test Location A',
              toLocation: 'Test Location B',
              driverDetails1: 'Driver 1 - Test',
              driverDetails2: 'Driver 2 - Test',
              vehicleNumber: 'TEST-1234',
            }
          );
          result = 'Movement update WhatsApp message sent successfully';
          break;
          
        case 'iqama-confirmation':
          console.log('[TEST-WHATSAPP] Testing iqama confirmation template...');
          await whatsappService.sendIqamaConfirmationWhatsApp(
            phoneNumber,
            'Test User'
          );
          result = 'Iqama confirmation WhatsApp message sent successfully';
          break;
          
        case 'custom':
        default:
          console.log('[TEST-WHATSAPP] Testing custom message...');
          const testMessage = message || '🧪 Test message from NuSync system\n\nThis is a test to verify WhatsApp messaging is working correctly.\n\nTimestamp: ' + new Date().toISOString();
          await whatsappService.sendCustomWhatsApp(phoneNumber, testMessage);
          result = 'Custom WhatsApp message sent successfully';
          break;
      }
      
      console.log('[TEST-WHATSAPP] ✅ Test completed successfully');
      console.log('[TEST-WHATSAPP] ===========================================');
      
      res.json({ 
        success: true,
        message: result,
        testType: testType || 'custom',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[TEST-WHATSAPP] ❌ Test failed');
      console.error('[TEST-WHATSAPP] Error:', error?.message || 'Unknown error');
      console.error('[TEST-WHATSAPP] Stack:', error?.stack);
      console.error('[TEST-WHATSAPP] ===========================================');
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to send test WhatsApp message',
        details: error?.message || 'Unknown error',
        testType: testType || 'custom',
      });
    }
  })
);

// Comprehensive WhatsApp test endpoint (tests all message types)
router.post(
  '/test-whatsapp-all',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { phoneNumber } = req.body;
    
    console.log('[TEST-WHATSAPP-ALL] ========== Comprehensive WhatsApp Test ==========');
    console.log('[TEST-WHATSAPP-ALL] Phone Number:', phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null');
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const results: any = {
      timestamp: new Date().toISOString(),
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
      tests: {},
    };
    
    const whatsappService = await import('../services/whatsappService');
    const testTypes = [
      { name: 'custom', func: () => whatsappService.sendCustomWhatsApp(phoneNumber, '🧪 Custom message test') },
      { name: 'credentials', func: () => whatsappService.sendCredentialsWhatsApp(phoneNumber, 'Test User', 'test@example.com', 'TestPass123') },
      { name: 'service-confirmation', func: () => whatsappService.sendServiceConfirmationWhatsApp(phoneNumber, 'Test User', 'Umrah Visa', 'TEST-001') },
      { name: 'movement-update', func: () => whatsappService.sendMovementUpdateWhatsApp(phoneNumber, 'Test Party', 'VOUCHER-001', {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        fromLocation: 'Location A',
        toLocation: 'Location B',
        driverDetails1: 'Driver 1',
        driverDetails2: 'Driver 2',
        vehicleNumber: 'TEST-123',
      }) },
      { name: 'iqama-confirmation', func: () => whatsappService.sendIqamaConfirmationWhatsApp(phoneNumber, 'Test User') },
    ];
    
    for (const test of testTypes) {
      try {
        console.log(`[TEST-WHATSAPP-ALL] Testing ${test.name}...`);
        await test.func();
        results.tests[test.name] = { success: true, message: 'Sent successfully' };
        console.log(`[TEST-WHATSAPP-ALL] ✅ ${test.name} passed`);
        
        // Wait 2 seconds between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        results.tests[test.name] = { 
          success: false, 
          error: error?.message || 'Unknown error' 
        };
        console.error(`[TEST-WHATSAPP-ALL] ❌ ${test.name} failed:`, error?.message);
      }
    }
    
    const successCount = Object.values(results.tests).filter((t: any) => t.success).length;
    const totalCount = testTypes.length;
    
    results.summary = {
      total: totalCount,
      successful: successCount,
      failed: totalCount - successCount,
    };
    
    console.log('[TEST-WHATSAPP-ALL] Summary:', results.summary);
    console.log('[TEST-WHATSAPP-ALL] ===========================================');
    
    res.json(results);
  })
);

// Test WhatsApp image endpoint
router.post(
  '/test-whatsapp-image',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { phoneNumber, imageUrl, caption, filename } = req.body;
    
    console.log('[TEST-WHATSAPP-IMAGE] ========== Test WhatsApp Image Request ==========');
    console.log('[TEST-WHATSAPP-IMAGE] Request Body:', {
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
      imageUrl: imageUrl || 'null',
      caption: caption || 'null',
      filename: filename || 'null',
    });
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    try {
      const { sendWhatsAppImage } = await import('../services/whatsappService');
      await sendWhatsAppImage(phoneNumber, imageUrl, caption, filename);
      
      console.log('[TEST-WHATSAPP-IMAGE] ✅ Test completed successfully');
      res.json({ 
        success: true,
        message: 'WhatsApp image sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[TEST-WHATSAPP-IMAGE] ❌ Test failed:', error?.message);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send WhatsApp image',
        details: error?.message || 'Unknown error',
      });
    }
  })
);

// Test bulk WhatsApp messages endpoint
router.post(
  '/test-whatsapp-bulk',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messages, delayBetweenMessages, stopOnError } = req.body;
    
    console.log('[TEST-WHATSAPP-BULK] ========== Test Bulk WhatsApp Messages ==========');
    console.log('[TEST-WHATSAPP-BULK] Messages Count:', messages?.length || 0);
    console.log('[TEST-WHATSAPP-BULK] Delay:', delayBetweenMessages || 1000, 'ms');
    console.log('[TEST-WHATSAPP-BULK] Stop On Error:', stopOnError || false);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and must not be empty' });
    }
    
    // Validate each message
    for (const msg of messages) {
      if (!msg.phoneNumber || !msg.message) {
        return res.status(400).json({ error: 'Each message must have phoneNumber and message fields' });
      }
    }
    
    try {
      const { sendBulkWhatsAppMessages } = await import('../services/whatsappService');
      const result = await sendBulkWhatsAppMessages(messages, {
        delayBetweenMessages,
        stopOnError,
      });
      
      console.log('[TEST-WHATSAPP-BULK] ✅ Test completed');
      res.json(result);
    } catch (error: any) {
      console.error('[TEST-WHATSAPP-BULK] ❌ Test failed:', error?.message);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send bulk WhatsApp messages',
        details: error?.message || 'Unknown error',
      });
    }
  })
);

export default router;
