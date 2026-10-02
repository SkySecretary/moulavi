import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import {
  sendSupportTicketCreatedEmail,
  sendSupportTicketUpdatedEmail,
  sendSupportTicketCommentAddedEmail
} from '../services/emailService';

const router = Router();

// Helper to generate next sequential Ticket ID
const generateTicketId = async (): Promise<string> => {
  const lastTicket = await prisma.supportTicket.findFirst({
    orderBy: { ticketId: 'desc' }
  });
  if (!lastTicket || !lastTicket.ticketId.startsWith('TKT-')) {
    return 'TKT-10001';
  }
  const numPart = parseInt(lastTicket.ticketId.replace('TKT-', ''));
  if (isNaN(numPart)) {
    return 'TKT-10001';
  }
  return `TKT-${numPart + 1}`;
};

// Validation chains
const createTicketValidation = [
  body('subject').isString().notEmpty().trim(),
  body('description').isString().notEmpty().trim(),
  body('contactName').isString().notEmpty().trim(),
  body('contactEmail').isEmail().normalizeEmail(),
  body('contactPhone').optional({ nullable: true }).isString(),
  body('category').optional().isString().trim(),
  body('priority').optional().isString().trim(),
];

const commentValidation = [
  body('comment').isString().notEmpty().trim(),
];

// Get support ticket stats (for reports)
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdminOrStaff = req.user!.role === 'admin' || req.user!.role === 'staff';
    let whereClause: any = {};

    if (!isAdminOrStaff) {
      const party = await prisma.party.findUnique({
        where: { userId: req.user!.id }
      });
      whereClause = {
        OR: [
          { userId: req.user!.id },
          ...(party ? [{ partyId: party.id }] : [])
        ]
      };
    }

    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      low,
      medium,
      high,
      urgent,
      billing,
      booking,
      technical,
      general
    ] = await Promise.all([
      prisma.supportTicket.count({ where: whereClause }),
      prisma.supportTicket.count({ where: { ...whereClause, status: 'open' } }),
      prisma.supportTicket.count({ where: { ...whereClause, status: 'in_progress' } }),
      prisma.supportTicket.count({ where: { ...whereClause, status: 'resolved' } }),
      prisma.supportTicket.count({ where: { ...whereClause, status: 'closed' } }),
      
      prisma.supportTicket.count({ where: { ...whereClause, priority: 'low' } }),
      prisma.supportTicket.count({ where: { ...whereClause, priority: 'medium' } }),
      prisma.supportTicket.count({ where: { ...whereClause, priority: 'high' } }),
      prisma.supportTicket.count({ where: { ...whereClause, priority: 'urgent' } }),

      prisma.supportTicket.count({ where: { ...whereClause, category: 'billing' } }),
      prisma.supportTicket.count({ where: { ...whereClause, category: 'booking' } }),
      prisma.supportTicket.count({ where: { ...whereClause, category: 'technical' } }),
      prisma.supportTicket.count({ where: { ...whereClause, category: 'general' } }),
    ]);

    res.json({
      total,
      status: { open, inProgress, resolved, closed },
      priority: { low, medium, high, urgent },
      category: { billing, booking, technical, general }
    });
  })
);

// List tickets
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, priority, category, search } = req.query;
    const isAdminOrStaff = req.user!.role === 'admin' || req.user!.role === 'staff';
    
    let whereClause: any = {};

    if (!isAdminOrStaff) {
      const party = await prisma.party.findUnique({
        where: { userId: req.user!.id }
      });
      whereClause = {
        OR: [
          { userId: req.user!.id },
          ...(party ? [{ partyId: party.id }] : [])
        ]
      };
    }

    if (status) {
      whereClause.status = status as string;
    }
    if (priority) {
      whereClause.priority = priority as string;
    }
    if (category) {
      whereClause.category = category as string;
    }
    if (search) {
      const searchStr = search as string;
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { ticketId: { contains: searchStr } },
            { subject: { contains: searchStr } },
            { description: { contains: searchStr } },
            { contactName: { contains: searchStr } },
            { contactEmail: { contains: searchStr } },
          ]
        }
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        party: {
          select: {
            partyName: true,
            partyCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ tickets });
  })
);

// Create support ticket
router.post(
  '/',
  authenticate,
  createTicketValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { subject, description, contactName, contactEmail, contactPhone, category, priority } = req.body;
    
    // Get associated party if creator is B2B agent
    let partyId: string | undefined;
    if (req.user!.role === 'party') {
      const party = await prisma.party.findUnique({
        where: { userId: req.user!.id }
      });
      if (party) {
        partyId = party.id;
      }
    }

    const ticketId = await generateTicketId();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId,
        subject,
        description,
        contactName,
        contactEmail,
        contactPhone,
        category: category || 'general',
        priority: priority || 'medium',
        userId: req.user!.id,
        partyId,
      },
      include: {
        party: {
          select: {
            partyName: true
          }
        }
      }
    });

    // Forward to mail (non-blocking async)
    sendSupportTicketCreatedEmail(ticket).catch(err => {
      console.error('[SUPPORT] Failed to send ticket creation email:', err);
    });

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    });
  })
);

// Get single ticket details
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const isAdminOrStaff = req.user!.role === 'admin' || req.user!.role === 'staff';

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        party: {
          select: {
            partyName: true,
            partyCode: true
          }
        },
        comments: {
          orderBy: {
            createdAt: 'asc'
          },
          include: {
            user: {
              select: {
                name: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Permission check for party role
    if (!isAdminOrStaff) {
      const party = await prisma.party.findUnique({
        where: { userId: req.user!.id }
      });
      const isOwner = ticket.userId === req.user!.id || (party && ticket.partyId === party.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ ticket });
  })
);

// Update support ticket (status/priority/category)
router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, priority, category } = req.body;
    const isAdminOrStaff = req.user!.role === 'admin' || req.user!.role === 'staff';

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Permission check for party role
    if (!isAdminOrStaff) {
      const party = await prisma.party.findUnique({
        where: { userId: req.user!.id }
      });
      const isOwner = ticket.userId === req.user!.id || (party && ticket.partyId === party.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Parties can only close their own tickets
      if (status && status !== 'closed') {
        return res.status(403).json({ error: 'Parties can only close their tickets' });
      }
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
      }
    });

    // Notify client of status updates
    if (status && status !== ticket.status) {
      sendSupportTicketUpdatedEmail(updatedTicket).catch(err => {
        console.error('[SUPPORT] Failed to send ticket update email:', err);
      });
    }

    res.json({
      message: 'Support ticket updated successfully',
      ticket: updatedTicket
    });
  })
);

// Add comment to support ticket
router.post(
  '/:id/comments',
  authenticate,
  commentValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { id } = req.params;
    const { comment } = req.body;
    const isAdminOrStaff = req.user!.role === 'admin' || req.user!.role === 'staff';

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Permission check for party role
    if (!isAdminOrStaff) {
      const party = await prisma.party.findUnique({
        where: { userId: req.user!.id }
      });
      const isOwner = ticket.userId === req.user!.id || (party && ticket.partyId === party.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Fetch user details to get the sender name
    const sender = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true }
    });

    const senderName = sender?.name || 'User';

    const newComment = await prisma.supportTicketComment.create({
      data: {
        ticketId: id,
        userId: req.user!.id,
        senderName,
        comment,
      },
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });

    // Update ticket's updatedAt timestamp
    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    // Send email notification (non-blocking)
    sendSupportTicketCommentAddedEmail(ticket, newComment, isAdminOrStaff).catch(err => {
      console.error('[SUPPORT] Failed to send ticket comment email:', err);
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });
  })
);

export default router;
