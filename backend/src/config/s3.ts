
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Determine if using DigitalOcean Spaces
// DigitalOcean Spaces regions: nyc3, sgp1, ams3, sfo3, fra1, blr1, syd1
const isDigitalOceanSpacesRegion = (region: string | undefined): boolean => {
  if (!region) return false;
  const doRegions = ['nyc3', 'sgp1', 'ams3', 'sfo3', 'fra1', 'blr1', 'syd1'];
  return doRegions.includes(region.toLowerCase());
};

// Get endpoint URL (for DigitalOcean Spaces or custom S3-compatible storage)
export const getEndpoint = (): string | undefined => {
  // If explicit endpoint is provided, use it
  if (process.env.S3_ENDPOINT) {
    let endpoint = process.env.S3_ENDPOINT;
    // If endpoint includes bucket name (e.g., https://bucket.region.digitaloceanspaces.com),
    // extract just the base endpoint (https://region.digitaloceanspaces.com)
    if (endpoint.includes('.digitaloceanspaces.com')) {
      // Match pattern: https://bucket.region.digitaloceanspaces.com or https://region.digitaloceanspaces.com
      const match = endpoint.match(/https:\/\/([^.]+\.)?([^.]+)\.digitaloceanspaces\.com/);
      if (match && match[2]) {
        // Extract region and construct base endpoint
        endpoint = `https://${match[2]}.digitaloceanspaces.com`;
      }
    }
    return endpoint;
  }
  // Auto-construct DigitalOcean Spaces endpoint from region if region matches DO format
  const region = process.env.AWS_REGION;
  if (region && isDigitalOceanSpacesRegion(region)) {
    return `https://${region}.digitaloceanspaces.com`;
  }
  return undefined; // Use default AWS S3 endpoint
};

// Determine if we're using DigitalOcean Spaces
const isUsingDigitalOceanSpaces = (): boolean => {
  return !!getEndpoint() || !!(process.env.AWS_REGION && isDigitalOceanSpacesRegion(process.env.AWS_REGION));
};

// S3 Client Configuration (optional)
// For DigitalOcean Spaces: region should be 'us-east-1' for SDK compatibility, but endpoint points to actual DO region
export const s3Client = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY 
  ? new S3Client({
      region: isUsingDigitalOceanSpaces() ? 'us-east-1' : (process.env.AWS_REGION || 'us-east-1'),
      endpoint: getEndpoint(),
      forcePathStyle: false, // Use subdomain/virtual calling format (required for DigitalOcean Spaces)
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// Check if S3 is configured
export const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);
};

// S3 Bucket Configuration
export const S3_CONFIG = {
  BUCKET_NAME: process.env.S3_BUCKET_NAME || 'moulavi-erp-documents',
  REGION: process.env.AWS_REGION || 'us-east-1',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'image/webp'
  ],
  DOCUMENT_TYPES: [
    'pan_card',
    'passport_front',
    'passport_back',
    'visa_copy',
    'confirmation_image',
    'other'
  ]
};

// Generate S3 key for document
export function generateS3Key(
  bookingId: string, 
  passengerId: string | null, 
  documentType: string, 
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (passengerId) {
    return `bookings/${bookingId}/passengers/${passengerId}/${documentType}/${timestamp}_${sanitizedFileName}`;
  }
  
  return `bookings/${bookingId}/${documentType}/${timestamp}_${sanitizedFileName}`;
}

// Generate presigned URL for upload
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Metadata: {
      uploadedAt: new Date().toISOString(),
    },
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Generate presigned URL for download
export async function generateDownloadUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  // Extract S3 key from filePath
  // filePath can be either:
  // 1. A full S3 URL (https://bucket.s3.region.amazonaws.com/key)
  // 2. Just the S3 key (bookings/...)
  let s3Key: string;
  
  try {
    // Try to parse as URL first
    const urlObj = new URL(filePath);
    // If it's a URL, extract the key
    s3Key = extractS3KeyFromUrl(filePath) || filePath;
  } catch {
    // If it's not a URL, assume it's already a key
    s3Key = filePath;
  }
  
  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Delete file from S3
export async function deleteS3File(key: string): Promise<void> {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }
  
  const command = new DeleteObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Validate file type
export function isValidFileType(mimeType: string): boolean {
  return S3_CONFIG.ALLOWED_FILE_TYPES.includes(mimeType);
}

// Validate file size
export function isValidFileSize(size: number): boolean {
  return size <= S3_CONFIG.MAX_FILE_SIZE;
}

// Validate document type
export function isValidDocumentType(documentType: string): boolean {
  return S3_CONFIG.DOCUMENT_TYPES.includes(documentType);
}

// Extract S3 key from URL
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // S3 URL formats:
    // AWS S3: https://bucket.s3.region.amazonaws.com/key or https://bucket.s3-region.amazonaws.com/key
    // DigitalOcean Spaces: https://bucket.region.digitaloceanspaces.com/key
    // The pathname is the key (starts with /)
    let key = urlObj.pathname;
    
    // Remove leading slash if present
    if (key.startsWith('/')) {
      key = key.substring(1);
    }

    // Strip bucket name if it's in the path (path-style URLs like https://s3.amazonaws.com/bucket/key)
    const bucketName = S3_CONFIG.BUCKET_NAME;
    if (bucketName && key.startsWith(bucketName + '/')) {
      key = key.substring(bucketName.length + 1);
    }
    
    return key;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}

// Get file extension from MIME type
export function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
    'image/webp': '.webp',
  };
  
  return extensions[mimeType] || '.bin';
}

// Generate unique filename
export function generateUniqueFileName(originalName: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(mimeType);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${baseName}_${timestamp}_${randomString}${extension}`;
}
