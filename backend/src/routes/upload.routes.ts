
import { Router, Response } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, S3_CONFIG, generateS3Key, generateDownloadUrl, deleteS3File, isValidFileType, isValidFileSize, isValidDocumentType, generateUniqueFileName, isS3Configured } from '../config/s3';
import { AuditService } from '../services/auditService';

const router = Router();

// Configure multer storage (S3 or local)
const storage = isS3Configured() 
  ? multerS3({
      s3: s3Client!,
      bucket: S3_CONFIG.BUCKET_NAME,
      key: (req: any, file: Express.Multer.File, cb: any) => {
        const { bookingId } = req.params;
        const { passenger_id, document_type } = req.body;
        
        // Generate unique filename
        const uniqueFileName = generateUniqueFileName(file.originalname, file.mimetype);
        
        // Generate S3 key
        const key = generateS3Key(bookingId, passenger_id || null, document_type || 'general', uniqueFileName);
        console.log('[UPLOAD] Generated S3 key:', key);
        cb(null, key);
      },
      metadata: (req: any, file: Express.Multer.File, cb: any) => {
        cb(null, {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.id || 'unknown'
        });
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
      // Additional configuration for DigitalOcean Spaces compatibility
      acl: 'public-read', // Make files publicly readable (optional, adjust based on your needs)
      serverSideEncryption: undefined, // DigitalOcean Spaces doesn't support SSE
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    });

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('[UPLOAD] File filter - File:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    document_type: req.body?.document_type,
  });
  
  // Validate file type
  if (!isValidFileType(file.mimetype)) {
    console.error('[UPLOAD] Invalid file type:', file.mimetype);
    return cb(new Error(`Invalid file type. Allowed types: ${S3_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`));
  }
  
  // Validate document type (but allow confirmation_image even if not in DOCUMENT_TYPES for backward compatibility)
  const { document_type } = req.body;
  const allowedTypes = [...S3_CONFIG.DOCUMENT_TYPES, 'confirmation_image'];
  if (document_type && !allowedTypes.includes(document_type)) {
    console.error('[UPLOAD] Invalid document type:', document_type);
    return cb(new Error(`Invalid document type. Allowed types: ${allowedTypes.join(', ')}`));
  }
  
  console.log('[UPLOAD] File validation passed');
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: S3_CONFIG.MAX_FILE_SIZE, // Use configurable limit
  },
});

// Error handler for multer uploads
const handleUploadError = (error: any, req: any, res: any, next: any) => {
  console.error('[UPLOAD] ❌ Upload Error:', {
    error: error?.message || 'Unknown error',
    stack: error?.stack,
    code: error?.code,
    statusCode: error?.statusCode,
  });
  
  if (error?.code === 'SignatureDoesNotMatch' || error?.message?.includes('signature')) {
    console.error('[UPLOAD] ❌ S3 Signature Error - Possible causes:');
    console.error('[UPLOAD]   1. Wrong AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY');
    console.error('[UPLOAD]   2. Wrong S3_ENDPOINT configuration');
    console.error('[UPLOAD]   3. Wrong AWS_REGION');
    console.error('[UPLOAD]   4. Server clock is out of sync');
    console.error('[UPLOAD]   5. S3 client configuration mismatch');
    console.error('[UPLOAD] Current S3 Config:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      bucket: S3_CONFIG.BUCKET_NAME,
      region: process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT,
      isS3Configured: isS3Configured(),
    });
    return res.status(500).json({ 
      error: 'S3 signature error. Check your S3 configuration and credentials.',
      details: error?.message 
    });
  }
  
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
    console.error('[UPLOAD] ❌ S3 Connection Error - Cannot reach S3 endpoint');
    return res.status(500).json({ 
      error: 'Cannot connect to S3. Check your S3_ENDPOINT configuration.',
      details: error?.message 
    });
  }
  
  // Default error handler
  return res.status(500).json({ 
    error: 'File upload failed',
    details: error?.message || 'Unknown error'
  });
};

// Upload document for a booking
router.post(
  '/booking/:bookingId',
  authenticate,
  (req, res, next) => {
    upload.single('document')(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  },
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.params;
    const { document_type, passenger_id } = req.body;
    
    console.log('[UPLOAD] ========== Document Upload Request ==========');
    console.log('[UPLOAD] Booking ID:', bookingId);
    console.log('[UPLOAD] Document Type:', document_type);
    console.log('[UPLOAD] Passenger ID:', passenger_id || 'none');
    console.log('[UPLOAD] S3 Configured:', isS3Configured());
    console.log('[UPLOAD] User:', req.user?.email || 'unknown');
    
    if (!req.file) {
      console.error('[UPLOAD] ❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('[UPLOAD] File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      location: isS3Configured() ? (req.file as any).location : req.file.path,
    });
    
    // Verify booking exists and user has access
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { partyId: true }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== booking.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // If passenger_id is provided, verify it belongs to the booking
    if (passenger_id) {
      const passenger = await prisma.umrahPassenger.findFirst({
        where: {
          id: passenger_id,
          bookingId: bookingId
        }
      });
      
      if (!passenger) {
        return res.status(404).json({ error: 'Passenger not found for this booking' });
      }
    }
    
    // Get file path (S3 URL or relative local path)
    const filePath = isS3Configured() 
      ? (req.file as any).location 
      : req.file.path.replace(/.*[\/\\]uploads[\/\\]/, 'uploads/');
    console.log('[UPLOAD] File path for DB:', filePath);
    
    // Save document record
    const document = await prisma.document.create({
      data: {
        bookingId,
        passengerId: passenger_id || null,
        documentType: document_type || 'general',
        fileName: req.file.originalname,
        filePath: filePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    console.log('[UPLOAD] ✅ Document saved to database:', document.id);

    // Log document upload
    try {
      await AuditService.logDocumentUpload(
        document.id,
        req.user!.id,
        {
          fileName: document.fileName,
          documentType: document.documentType,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          passengerId: document.passengerId,
        },
        req
      );
      console.log('[UPLOAD] ✅ Audit log created');
    } catch (auditError: any) {
      console.error('[UPLOAD] ⚠️ Failed to create audit log:', auditError?.message);
      // Don't fail the request if audit logging fails
    }
    
    console.log('[UPLOAD] ========== Upload Complete ==========');
    res.status(201).json({
      document,
      message: 'Document uploaded successfully',
    });
  })
);

// Upload multiple documents for Umrah visa booking
router.post(
  '/booking/:bookingId/passenger/:passengerId',
  authenticate,
  upload.array('documents', 50), // Max 50 files
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId, passengerId } = req.params;
    const { document_types } = req.body; // Array of document types
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Verify booking exists and user has access
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        partyId: true,
        passengers: {
          where: { id: passengerId }
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.passengers.length === 0) {
      return res.status(404).json({ error: 'Passenger not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== booking.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Parse document types (should be JSON array)
    let documentTypes: string[] = [];
    try {
      documentTypes = JSON.parse(document_types || '[]');
    } catch {
      documentTypes = ['general'];
    }
    
    // Create document records
    const documents = await Promise.all(
      files.map((file, index) => 
        prisma.document.create({
          data: {
            bookingId: bookingId,
            passengerId: passengerId,
            documentType: documentTypes[index] || 'general',
            fileName: file.originalname,
            filePath: isS3Configured() ? (file as any).location : file.path, // S3 URL or local path
            fileSize: file.size,
            mimeType: file.mimetype
          }
        })
      )
    );

    // Log document uploads
    for (const document of documents) {
      await AuditService.logDocumentUpload(
        document.id,
        req.user!.id,
        {
          fileName: document.fileName,
          documentType: document.documentType,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          passengerId: document.passengerId,
        },
        req
      );
    }
    
    res.status(201).json({
      documents,
      message: `${documents.length} documents uploaded successfully`,
    });
  })
);

// Get document
router.get(
  '/:documentId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        booking: {
          select: { partyId: true }
        }
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== document.booking.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Handle file download based on storage type
    if (isS3Configured()) {
      // Generate presigned URL for S3 file
      try {
        const downloadUrl = await generateDownloadUrl(document.filePath);
        res.json({
          downloadUrl,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType
        });
      } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      // Serve local file
      if (fs.existsSync(document.filePath)) {
        res.download(document.filePath, document.fileName);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    }
  })
);

// Delete document
router.delete(
  '/:documentId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        booking: {
          select: { partyId: true }
        }
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check authorization
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== document.booking.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Log document deletion
    await AuditService.logDocumentDeletion(
      documentId,
      req.user!.id,
      {
        fileName: document.fileName,
        documentType: document.documentType,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        passengerId: document.passengerId,
      },
      req
    );

    // Delete file based on storage type
    if (isS3Configured()) {
      // Delete file from S3
      try {
        await deleteS3File(document.filePath);
      } catch (error) {
        console.error('Error deleting S3 file:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    } else {
      // Delete local file
      if (fs.existsSync(document.filePath)) {
        try {
          fs.unlinkSync(document.filePath);
        } catch (error) {
          console.error('Error deleting local file:', error);
          // Continue with database deletion even if file deletion fails
        }
      }
    }
    
    // Delete database record
    await prisma.document.delete({
      where: { id: documentId }
    });
    
    res.json({ message: 'Document deleted successfully' });
  })
);

// Party Document Upload Routes

// Configure multer storage for party documents
const partyDocumentStorage = isS3Configured()
  ? multerS3({
      s3: s3Client!,
      bucket: S3_CONFIG.BUCKET_NAME,
      key: (req: any, file: Express.Multer.File, cb: any) => {
        const { partyId } = req.params;
        const { document_type } = req.body;
        
        // Generate unique filename
        const uniqueFileName = generateUniqueFileName(file.originalname, file.mimetype);
        
        // Generate S3 key for party documents
        const timestamp = Date.now();
        const sanitizedFileName = uniqueFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `parties/${partyId}/${document_type || 'general'}/${timestamp}_${sanitizedFileName}`;
        cb(null, key);
      },
      metadata: (req: any, file: Express.Multer.File, cb: any) => {
        cb(null, {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.id || 'unknown'
        });
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../../uploads/parties');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    });

const partyDocumentUpload = multer({
  storage: partyDocumentStorage,
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate file type
    if (!isValidFileType(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: ${S3_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`));
    }
    
    // Validate document type for party documents
    const { document_type } = req.body;
    const validPartyDocumentTypes = ['gst_certificate', 'pan_card', 'aadhaar_card', 'logo', 'other'];
    if (document_type && !validPartyDocumentTypes.includes(document_type)) {
      return cb(new Error(`Invalid document type. Allowed types: ${validPartyDocumentTypes.join(', ')}`));
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: S3_CONFIG.MAX_FILE_SIZE,
  },
});

// Upload document for a party
router.post(
  '/party/:partyId',
  authenticate,
  authorize('admin', 'staff'),
  partyDocumentUpload.single('document'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    const { document_type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    // Validate document type
    const validPartyDocumentTypes = ['gst_certificate', 'pan_card', 'aadhaar_card', 'logo', 'other'];
    if (!document_type || !validPartyDocumentTypes.includes(document_type)) {
      return res.status(400).json({ error: 'Valid document_type is required. Allowed types: gst_certificate, pan_card, aadhaar_card, logo, other' });
    }
    
    // Get file path (S3 URL or relative local path)
    const filePath = isS3Configured() 
      ? (req.file as any).location 
      : req.file.path.replace(/.*[\/\\]uploads[\/\\]/, 'uploads/');

    // Save document record
    const document = await prisma.partyDocument.create({
      data: {
        partyId,
        documentType: document_type as any,
        fileName: req.file.originalname,
        filePath: filePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    // If this is a logo, update the party's logoPath
    if (document_type === 'logo') {
      await prisma.party.update({
        where: { id: partyId },
        data: { logoPath: filePath }
      });
    }
    
    res.status(201).json({
      document,
      message: 'Document uploaded successfully',
    });
  })
);

// Get all documents for a party
router.get(
  '/party/:partyId/documents',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { partyId } = req.params;
    
    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      select: { id: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const documents = await prisma.partyDocument.findMany({
      where: {
        partyId,
        isDeleted: false
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    res.json({ documents });
  })
);

// Get party document download
router.get(
  '/party-document/:documentId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const document = await prisma.partyDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Handle file download based on storage type
    if (isS3Configured()) {
      // Generate presigned URL for S3 file
      try {
        const downloadUrl = await generateDownloadUrl(document.filePath);
        res.json({
          downloadUrl,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType
        });
      } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      // Serve local file
      if (fs.existsSync(document.filePath)) {
        res.download(document.filePath, document.fileName);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    }
  })
);

// Delete party document (soft delete)
router.delete(
  '/party-document/:documentId',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    
    const document = await prisma.partyDocument.findUnique({
      where: { id: documentId }
    });
    
    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Soft delete
    await prisma.partyDocument.update({
      where: { id: documentId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
    
    res.json({ message: 'Document deleted successfully' });
  })
);

// Diagnostic endpoint to check S3 configuration
router.get(
  '/diagnostics/s3-config',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const config = {
      isS3Configured: isS3Configured(),
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      bucket: S3_CONFIG.BUCKET_NAME,
      region: process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT,
      s3ClientExists: !!s3Client,
      maxFileSize: S3_CONFIG.MAX_FILE_SIZE,
      allowedFileTypes: S3_CONFIG.ALLOWED_FILE_TYPES,
      allowedDocumentTypes: S3_CONFIG.DOCUMENT_TYPES,
    };
    
    // Mask sensitive information
    const safeConfig = {
      ...config,
      accessKeyPreview: process.env.AWS_ACCESS_KEY_ID 
        ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` 
        : 'NOT SET',
    };
    
    res.json({
      message: 'S3 Configuration Diagnostics',
      config: safeConfig,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
