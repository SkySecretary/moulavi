
import { Router, Response } from 'express';
import { body, query as validateQuery } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendCredentialsEmail } from '../services/emailService';

const router = Router();

// Validation middleware
const createPartyValidation = [
  body('party_name').isString().notEmpty().trim(),
  body('party_code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Party code must be between 1 and 10 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .custom((value) => {
      // Email domain validation for business emails
      const businessDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
        'company.com', 'business.com', 'corp.com', 'enterprise.com'
      ];
      const domain = value.split('@')[1]?.toLowerCase();
      
      // Allow common business domains and custom domains
      if (domain && !businessDomains.includes(domain)) {
        // For custom domains, check if it looks like a business domain
        if (domain.includes('.') && domain.length > 3) {
          return true; // Allow custom business domains
        }
      }
      return true; // Allow all valid email formats for now
    }),
  body('contact_number')
    .optional()
    .isString()
    .matches(/^[+]?[0-9]{10,15}$/, 'g')
    .withMessage('Contact number must be 10-15 digits, optionally starting with +'),
  body('whatsapp_number')
    .optional()
    .isString()
    .matches(/^[+]?[0-9]{10,15}$/, 'g')
    .withMessage('WhatsApp number must be 10-15 digits, optionally starting with +'),
  body('address').optional().isString(),
  body('gst_number').optional().isString(),
  body('pan_number').optional().isString().trim(),
  body('aadhaar_number').optional().isString().trim(),
  body('supplier_service_types').optional().isArray().custom((value) => {
    if (!Array.isArray(value)) return false;
    const validTypes = ['ticket_issuing', 'umrah_service', 'hotel_service', 'transport_service'];
    return value.every((type: string) => validTypes.includes(type));
  }).withMessage('Supplier service types must be an array containing one or more of: ticket_issuing, umrah_service, hotel_service, transport_service'),
  body('contacts').optional().isArray().custom((value) => {
    if (!Array.isArray(value)) return false;
    return value.every((contact: any) => 
      contact.contact_name && typeof contact.contact_name === 'string' &&
      contact.contact_number && typeof contact.contact_number === 'string'
    );
  }).withMessage('Contacts must be an array of objects with contact_name and contact_number'),
  body('customer_type')
    .optional()
    .isIn(['direct', 'b2b'])
    .withMessage('Customer type must be either direct or b2b'),
  body('account_currency_id').isUUID().withMessage('Valid currency ID is required'),
  body('is_supplier').optional().isBoolean(),
  body('is_customer').optional().isBoolean(),
  body('login_required').optional().isBoolean(),
  body('email_notification').optional().isBoolean(),
  body('sms_notification').optional().isBoolean(),
  body('marketing_notification').optional().isBoolean(),
  body('nusuk_entity_id').optional().isString().trim(),
  body('nusuk_active_entity_id').optional().isString().trim(),
  body('nusuk_active_entity_type_id').optional().isString().trim(),
  body('nusuk_external_agent_codes').optional().isString().trim(),
];

// Create party
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createPartyValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      party_name,
      party_code,
      email,
      contact_number,
      whatsapp_number,
      address,
      gst_number,
      pan_number,
      aadhaar_number,
      supplier_service_types,
      contacts,
      customer_type,
      account_currency_id,
      is_supplier = false,
      is_customer = true,
      login_required = false,
      email_notification = true,
      sms_notification = true,
      marketing_notification = false,
      nusuk_entity_id,
      nusuk_active_entity_id,
      nusuk_active_entity_type_id,
      nusuk_external_agent_codes,
    } = req.body;
    
    // Validate customer_type is required if is_customer is true
    if (is_customer && !customer_type) {
      return res.status(400).json({ error: 'Customer type is required when party is a customer' });
    }
    
    // Validate supplier service types if supplier is selected
    if (is_supplier && (!supplier_service_types || !Array.isArray(supplier_service_types) || supplier_service_types.length === 0)) {
      return res.status(400).json({ error: 'At least one supplier service type is required when is_supplier is true' });
    }
    
    // Check if party_code already exists (if provided)
    if (party_code) {
      const existingPartyCode = await prisma.party.findUnique({
        where: { partyCode: party_code }
      });
      
      if (existingPartyCode) {
        return res.status(400).json({ error: 'Party code already exists' });
      }
    }
    
    // Check if party email already exists
    const existingParty = await prisma.party.findUnique({
      where: { email }
    });
    
    if (existingParty) {
      return res.status(400).json({ error: 'Party with this email already exists' });
    }
    
    let userId = null;
    let generatedPassword = null;
    
    // Create user account if login is required
    if (login_required) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      generatedPassword = generateRandomPassword();
      const hashedPassword = await hashPassword(generatedPassword);
      
      const user = await prisma.user.create({
        data: {
          name: party_name,
          email,
          password: hashedPassword,
          role: 'party'
        }
      });
      
      userId = user.id;
    }
    
    // Create party
    const party = await prisma.party.create({
      data: {
        partyName: party_name,
        partyCode: party_code || null,
        email,
        contactNumber: contact_number,
        whatsappNumber: whatsapp_number,
        address,
        gstNumber: gst_number,
        panNumber: pan_number,
        aadhaarNumber: aadhaar_number,
        nusukEntityId: nusuk_entity_id || null,
        nusukActiveEntityId: nusuk_active_entity_id || null,
        nusukActiveEntityTypeId: nusuk_active_entity_type_id || null,
        nusukExternalAgentCodes: nusuk_external_agent_codes || null,
        supplierServiceTypes: supplier_service_types ? JSON.parse(JSON.stringify(supplier_service_types)) : null,
        customerType: customer_type || 'direct', // Default to 'direct' if not provided
        accountCurrencyId: account_currency_id,
        isSupplier: is_supplier,
        isCustomer: is_customer,
        loginRequired: login_required,
        emailNotification: email_notification,
        smsNotification: sms_notification,
        marketingNotification: marketing_notification,
        userId,
        createdBy: req.user!.id,
        contacts: contacts && Array.isArray(contacts) ? {
          create: contacts.map((contact: any) => ({
            contactName: contact.contact_name,
            contactNumber: contact.contact_number,
            department: contact.department || null
          }))
        } : undefined
      },
      include: {
        contacts: true,
        documents: {
          where: { isDeleted: false }
        }
      }
    });
    
    // Send credentials email if login is required
    if (login_required && generatedPassword) {
      try {
        await sendCredentialsEmail(email, party_name, email, generatedPassword, whatsapp_number);
      } catch (error) {
        console.error('Failed to send credentials email:', error);
        // Don't fail the request if email fails
      }
    }
    
    res.status(201).json({
      party,
      ...(login_required && generatedPassword && {
        message: 'Party created and credentials sent via email',
      }),
    });
  })
);

// Get all parties (with filters and pagination)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      customer_type, 
      is_supplier, 
      is_customer,
      search,
      supplier_service_type,
      page = '1',
      limit = '10'
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Build where clause
    const where: any = {};
    
    // If user is a party, they can only view their own party or filtered suppliers
    // Admin/staff can view all parties
    if (req.user!.role === 'party') {
      // Party users can only fetch suppliers (for dropdowns like umrah visa providers)
      // They cannot see all parties
      if (!supplier_service_type) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Only allow fetching suppliers, not all parties
      where.isSupplier = true;
    }
    
    if (customer_type) {
      where.customerType = customer_type;
    }
    
    if (is_supplier !== undefined) {
      where.isSupplier = is_supplier === 'true';
    }
    
    if (is_customer !== undefined) {
      where.isCustomer = is_customer === 'true';
    }
    
    // If filtering by supplier service type, ensure isSupplier is true
    if (supplier_service_type) {
      where.isSupplier = true;
    }
    
    if (search) {
      where.OR = [
        { partyName: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    // Get parties with pagination
    let parties = await prisma.party.findMany({
        where,
      skip: 0, // Fetch all matching suppliers first
      take: 10000, // Large limit to get all suppliers
        orderBy: { createdAt: 'desc' },
        include: {
          accountCurrency: true,
          contacts: true,
          complianceMetrics: true,
          documents: {
            where: { isDeleted: false }
          }
        }
    });
    
    // Filter by supplier service type if specified (filter after fetching due to JSON array)
    if (supplier_service_type) {
      parties = parties.filter((party: any) => {
        const serviceTypes = party.supplierServiceTypes;
        return Array.isArray(serviceTypes) && serviceTypes.includes(supplier_service_type);
      });
    }
    
    // Apply pagination after filtering
    const total = parties.length;
    parties = parties.slice(skip, skip + limitNum);
    
    res.json({
      parties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get current user's party (for party role) - MUST come before /:id route
router.get(
  '/my-party',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only party role can access this endpoint
    if (req.user!.role !== 'party') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const party = await prisma.party.findUnique({
      where: { userId: req.user!.id },
      include: {
        accountCurrency: true,
        complianceMetrics: true
      }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ party });
  })
);

// Update own party (for party role users)
router.put(
  '/my-party',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only party role can access this endpoint
    if (req.user!.role !== 'party') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get the party associated with this user
    const existingParty = await prisma.party.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });
    
    if (!existingParty) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const {
      party_name,
      contact_number,
      whatsapp_number,
      address,
      gst_number,
      pan_number,
      aadhaar_number,
      email_notification,
      sms_notification,
      marketing_notification,
    } = req.body;
    
    const updateData: any = {};
    
    // Party users can only update these fields (not email, customer type, currency, etc.)
    if (party_name !== undefined) updateData.partyName = party_name;
    if (contact_number !== undefined) updateData.contactNumber = contact_number;
    if (whatsapp_number !== undefined) updateData.whatsappNumber = whatsapp_number;
    if (address !== undefined) updateData.address = address;
    if (gst_number !== undefined) updateData.gstNumber = gst_number;
    if (pan_number !== undefined) updateData.panNumber = pan_number;
    if (aadhaar_number !== undefined) updateData.aadhaarNumber = aadhaar_number;
    if (email_notification !== undefined) updateData.emailNotification = email_notification;
    if (sms_notification !== undefined) updateData.smsNotification = sms_notification;
    if (marketing_notification !== undefined) updateData.marketingNotification = marketing_notification;
    
    const party = await prisma.party.update({
      where: { id: existingParty.id },
      data: updateData,
      include: {
        accountCurrency: true,
        contacts: true,
      }
    });
    
    res.json({ party });
  })
);

// Get party by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        accountCurrency: true,
        complianceMetrics: true
      }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ party });
  })
);

// Update party
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      party_name,
      party_code,
      email,
      contact_number,
      whatsapp_number,
      address,
      gst_number,
      pan_number,
      aadhaar_number,
      supplier_service_types,
      contacts,
      customer_type,
      account_currency_id,
      is_supplier,
      is_customer,
      login_required,
      email_notification,
      sms_notification,
      marketing_notification,
      nusuk_entity_id,
      nusuk_active_entity_id,
      nusuk_active_entity_type_id,
      nusuk_external_agent_codes,
    } = req.body;
    
    // Validate supplier service types if supplier is being set to true
    const existingParty = await prisma.party.findUnique({
      where: { id },
      select: { 
        isSupplier: true,
        isCustomer: true,
        userId: true,
        email: true,
        partyName: true,
        whatsappNumber: true,
        customerType: true,
        partyCode: true
      }
    });
    
    if (!existingParty) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const updateData: any = {};

    // Validate email changes
    if (email !== undefined && email !== existingParty.email) {
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      const anotherParty = await prisma.party.findUnique({
        where: { email }
      });
      if (anotherParty) {
        return res.status(400).json({ error: 'Another party with this email already exists' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser && existingUser.id !== existingParty.userId) {
        return res.status(400).json({ error: 'Another user account with this email already exists' });
      }

      updateData.email = email;
    }
    
    // Handle login account creation if login_required is being enabled
    if (login_required !== undefined && login_required === true && !existingParty.userId) {
      const userEmail = email || existingParty.email;
      const userName = party_name || existingParty.partyName;
      const userWhatsapp = whatsapp_number || existingParty.whatsappNumber;

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userEmail }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists. Cannot create login account.' });
      }
      
      // Generate password and create user account
      const generatedPassword = generateRandomPassword();
      const hashedPassword = await hashPassword(generatedPassword);
      
      const user = await prisma.user.create({
        data: {
          name: userName,
          email: userEmail,
          password: hashedPassword,
          role: 'party'
        }
      });
      
      // Add userId to update data
      updateData.userId = user.id;
      updateData.loginRequired = true;
      
      // Send credentials email
      try {
        await sendCredentialsEmail(
          userEmail,
          userName,
          userEmail,
          generatedPassword,
          userWhatsapp || undefined
        );
      } catch (error) {
        console.error('Failed to send credentials email:', error);
        // Don't fail the request if email fails
      }
    } else if (login_required !== undefined) {
      updateData.loginRequired = login_required;
    }
    
    // Validate customer_type is required if is_customer is true
    const willBeCustomer = is_customer !== undefined ? is_customer : existingParty.isCustomer;
    if (willBeCustomer) {
      // If customer_type is being updated or is_customer is being set to true, validate it
      if (customer_type === undefined && is_customer === undefined) {
        // Not updating customer type, use existing
        if (!existingParty.customerType) {
          return res.status(400).json({ error: 'Customer type is required when party is a customer' });
        }
      } else if (customer_type === undefined && is_customer === true) {
        // Setting is_customer to true but no customer_type provided
        if (!existingParty.customerType) {
          return res.status(400).json({ error: 'Customer type is required when party is a customer' });
        }
      } else if (customer_type === '' || customer_type === null) {
        // Explicitly setting empty customer_type when is_customer is true
        return res.status(400).json({ error: 'Customer type is required when party is a customer' });
      }
    }
    
    // Check if party_code already exists (if provided and different from current)
    if (party_code !== undefined && party_code !== existingParty.partyCode) {
      const existingPartyCode = await prisma.party.findUnique({
        where: { partyCode: party_code }
      });
      
      if (existingPartyCode) {
        return res.status(400).json({ error: 'Party code already exists' });
      }
    }
    
    const willBeSupplier = is_supplier !== undefined ? is_supplier : existingParty?.isSupplier;
    if (willBeSupplier && supplier_service_types !== undefined && (!Array.isArray(supplier_service_types) || supplier_service_types.length === 0)) {
      return res.status(400).json({ error: 'At least one supplier service type is required when is_supplier is true' });
    }
    
    if (party_name !== undefined) updateData.partyName = party_name;
    if (party_code !== undefined) updateData.partyCode = party_code || null;
    if (contact_number !== undefined) updateData.contactNumber = contact_number;
    if (whatsapp_number !== undefined) updateData.whatsappNumber = whatsapp_number;
    if (address !== undefined) updateData.address = address;
    if (gst_number !== undefined) updateData.gstNumber = gst_number;
    if (pan_number !== undefined) updateData.panNumber = pan_number;
    if (aadhaar_number !== undefined) updateData.aadhaarNumber = aadhaar_number;
    if (nusuk_entity_id !== undefined) updateData.nusukEntityId = nusuk_entity_id || null;
    if (nusuk_active_entity_id !== undefined) updateData.nusukActiveEntityId = nusuk_active_entity_id || null;
    if (nusuk_active_entity_type_id !== undefined) updateData.nusukActiveEntityTypeId = nusuk_active_entity_type_id || null;
    if (nusuk_external_agent_codes !== undefined) updateData.nusukExternalAgentCodes = nusuk_external_agent_codes || null;
    if (supplier_service_types !== undefined) updateData.supplierServiceTypes = JSON.parse(JSON.stringify(supplier_service_types));
    if (customer_type !== undefined) updateData.customerType = customer_type;
    if (account_currency_id !== undefined) updateData.accountCurrencyId = account_currency_id;
    if (is_supplier !== undefined) updateData.isSupplier = is_supplier;
    if (is_customer !== undefined) updateData.isCustomer = is_customer;
    if (email_notification !== undefined) updateData.emailNotification = email_notification;
    if (sms_notification !== undefined) updateData.smsNotification = sms_notification;
    if (marketing_notification !== undefined) updateData.marketingNotification = marketing_notification;
    
    // Handle updates in a transaction to sync Party and associated User account email atomically
    const party = await prisma.$transaction(async (tx) => {
      // If email changed and user account exists, update the user account email first
      if (email !== undefined && email !== existingParty.email && existingParty.userId) {
        await tx.user.update({
          where: { id: existingParty.userId },
          data: { email }
        });
      }

      // Handle contacts update
      if (contacts !== undefined && Array.isArray(contacts)) {
        await tx.partyContact.deleteMany({
          where: { partyId: id }
        });
        
        if (contacts.length > 0) {
          updateData.contacts = {
            create: contacts.map((contact: any) => ({
              contactName: contact.contact_name,
              contactNumber: contact.contact_number,
              department: contact.department || null
            }))
          };
        }
      }

      return await tx.party.update({
        where: { id },
        data: updateData,
        include: {
          contacts: true,
          documents: {
            where: { isDeleted: false }
          }
        }
      });
    });
    
    res.json({ party });
  })
);

// Delete party
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    // First get the party to check if it has a user_id
    const party = await prisma.party.findUnique({
      where: { id },
      select: { userId: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    // Delete the party (this will cascade to related records)
    await prisma.party.delete({
      where: { id }
    });
    
    // If the party had a user account, delete it too
    if (party.userId) {
      await prisma.user.delete({
        where: { id: party.userId }
      });
    }
    
    res.json({ message: 'Party deleted successfully' });
  })
);

export default router;
