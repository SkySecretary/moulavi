
import { Router, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest, CreateUserRequest, UpdateUserRequest } from '../types';
import { prisma } from '../config/database';
import { hashPassword } from '../utils/password';
import { AuditService } from '../services/auditService';

const router = Router();

const createUserMasterValidation = [
  body('name').isString().notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'staff', 'party']).withMessage('Valid role is required'),
];

const updateUserMasterValidation = [
  body('name').optional().isString().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'staff', 'party']),
];

// Create user master
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createUserMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, email, password, role, is_active = true } = req.body as CreateUserRequest;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive: is_active
      }
    });
    
    // Log audit trail
    await AuditService.logAudit({
      entityType: 'user',
      entityId: user.id,
      action: 'create',
      newValues: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      changedBy: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({ 
      user: userWithoutPassword,
      message: 'User created successfully'
    });
  })
);

// Get all user masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, role } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    
    if (role && role !== 'all') {
      where.role = role;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get user master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  })
);

// Update user master
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateUserMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is being changed and if new email already exists
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });
      
      if (emailExists) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    }
    
    // Prepare update data
    const dataToUpdate: any = {
      ...updateData,
      isActive: updateData.is_active !== undefined ? updateData.is_active : undefined
    };
    
    // Hash password if provided
    if (updateData.password) {
      dataToUpdate.password = await hashPassword(updateData.password);
    }
    
    // Remove is_active from dataToUpdate as it's mapped to isActive
    delete dataToUpdate.is_active;
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Log audit trail
    await AuditService.logAudit({
      entityType: 'user',
      entityId: id,
      action: 'update',
      oldValues: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive
      },
      newValues: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      },
      changedBy: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ 
      user: updatedUser,
      message: 'User updated successfully'
    });
  })
);

// Delete user master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting the current user
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Log audit trail before deletion
    await AuditService.logAudit({
      entityType: 'user',
      entityId: id,
      action: 'delete',
      oldValues: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive
      },
      changedBy: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await prisma.user.delete({
      where: { id }
    });
    
    res.json({ message: 'User deleted successfully' });
  })
);

export default router;
