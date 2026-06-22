import { PDFDocument } from 'pdf-lib';
import { isS3Configured, s3Client, S3_CONFIG } from '../config/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

// Order for appending documents
const DOC_TYPE_ORDER: { [key: string]: number } = {
  iqama: 1,
  onward_ticket: 2,
  return_ticket: 3,
};

/**
 * Extracts S3 key from S3 file path / URL
 */
function extractS3KeyFromUrl(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const bucketName = S3_CONFIG.BUCKET_NAME;
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === bucketName) {
      return parts.slice(1).join('/');
    }
    return parts.join('/');
  } catch (e) {
    return null;
  }
}

/**
 * Downloads a file from S3 or reads it from the local filesystem
 */
async function getFileBuffer(filePath: string): Promise<Buffer | null> {
  try {
    if (isS3Configured() && s3Client) {
      const s3Key = extractS3KeyFromUrl(filePath);
      if (!s3Key) {
        console.error('[PDF MERGE] Could not extract S3 key from path:', filePath);
        return null;
      }

      const command = new GetObjectCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } else {
      // Local file
      let resolvedPath = filePath;
      if (!path.isAbsolute(resolvedPath)) {
        resolvedPath = path.resolve(process.cwd(), resolvedPath);
      }

      if (!fs.existsSync(resolvedPath)) {
        console.error('[PDF MERGE] Local file does not exist:', resolvedPath);
        return null;
      }

      return fs.readFileSync(resolvedPath);
    }
  } catch (error) {
    console.error('[PDF MERGE] Error reading file buffer:', filePath, error);
    return null;
  }
}

/**
 * Merges iqama copy, onward ticket, and return ticket into the booking PDF if they exist.
 * Only applies for individual iqama type bookings.
 */
export async function appendBookingAttachments(
  bookingId: string,
  basePdfBuffer: Buffer
): Promise<Buffer> {
  try {
    // 1. Fetch booking to verify individual + iqama
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: {
        visaType: true,
        accommodationType: true,
      },
    });

    if (!booking) {
      console.warn('[PDF MERGE] Booking not found:', bookingId);
      return basePdfBuffer;
    }

    // Check criteria: visaType must be individual_visa and accommodationType must be iqama
    if (
      booking.visaType !== 'individual_visa' ||
      booking.accommodationType !== 'iqama'
    ) {
      return basePdfBuffer;
    }

    // 2. Fetch the required attachments
    const documents = await prisma.document.findMany({
      where: {
        bookingId,
        documentType: { in: ['iqama', 'onward_ticket', 'return_ticket'] },
        isDeleted: false,
      },
    });

    if (documents.length === 0) {
      return basePdfBuffer;
    }

    // Sort documents in the order: 1) iqama, 2) onward_ticket, 3) return_ticket
    documents.sort((a, b) => {
      const orderA = DOC_TYPE_ORDER[a.documentType] || 99;
      const orderB = DOC_TYPE_ORDER[b.documentType] || 99;
      return orderA - orderB;
    });

    // 3. Load the base PDF Document
    const mergedPdf = await PDFDocument.load(basePdfBuffer);

    // 4. Process each attachment
    for (const doc of documents) {
      if (!doc.filePath) continue;

      console.log(`[PDF MERGE] Processing attachment: ${doc.documentType} (${doc.fileName})`);
      const fileBuffer = await getFileBuffer(doc.filePath);
      if (!fileBuffer || fileBuffer.length === 0) {
        console.warn('[PDF MERGE] Skipping document due to empty buffer:', doc.fileName);
        continue;
      }

      const mimeType = (doc.mimeType || '').toLowerCase();
      const ext = path.extname(doc.fileName).toLowerCase();

      if (mimeType === 'application/pdf' || ext === '.pdf') {
        try {
          const srcPdf = await PDFDocument.load(fileBuffer);
          const copiedPages = await mergedPdf.copyPages(
            srcPdf,
            srcPdf.getPageIndices()
          );
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          console.log(`[PDF MERGE] Appended PDF pages for: ${doc.fileName}`);
        } catch (pdfError) {
          console.error(`[PDF MERGE] Error loading attachment PDF: ${doc.fileName}`, pdfError);
        }
      } else if (
        mimeType.startsWith('image/') ||
        ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
      ) {
        try {
          let embeddedImage;
          if (mimeType === 'image/png' || ext === '.png') {
            embeddedImage = await mergedPdf.embedPng(fileBuffer);
          } else if (
            mimeType === 'image/jpeg' ||
            mimeType === 'image/jpg' ||
            ['.jpg', '.jpeg'].includes(ext)
          ) {
            embeddedImage = await mergedPdf.embedJpg(fileBuffer);
          } else {
            // Attempt to embed webp or other image formats. Since pdf-lib doesn't natively support webp,
            // we first try jpg, then png, and log if unsupported.
            try {
              embeddedImage = await mergedPdf.embedJpg(fileBuffer);
            } catch (e) {
              try {
                embeddedImage = await mergedPdf.embedPng(fileBuffer);
              } catch (err) {
                console.error(`[PDF MERGE] pdf-lib unsupported image format for file: ${doc.fileName}. Skipping.`);
                continue;
              }
            }
          }

          if (embeddedImage) {
            // A4 page size in points: 595.28 x 841.89
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const page = mergedPdf.addPage([pageWidth, pageHeight]);

            const imgWidth = embeddedImage.width;
            const imgHeight = embeddedImage.height;

            // Compute scaling to fit A4 page while preserving aspect ratio, using margins of 20 points
            const margin = 20;
            const maxW = pageWidth - margin * 2;
            const maxH = pageHeight - margin * 2;

            const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1);
            const drawW = imgWidth * scale;
            const drawH = imgHeight * scale;

            // Centering image on the page
            const drawX = (pageWidth - drawW) / 2;
            const drawY = (pageHeight - drawH) / 2;

            page.drawImage(embeddedImage, {
              x: drawX,
              y: drawY,
              width: drawW,
              height: drawH,
            });
            console.log(`[PDF MERGE] Embedded image page for: ${doc.fileName}`);
          }
        } catch (imgError) {
          console.error(`[PDF MERGE] Error embedding image attachment: ${doc.fileName}`, imgError);
        }
      } else {
        console.warn(`[PDF MERGE] Unsupported attachment type: ${mimeType} for file: ${doc.fileName}`);
      }
    }

    // 5. Serialize and return the merged PDF buffer
    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  } catch (error) {
    console.error('[PDF MERGE] Fatal error in appendBookingAttachments:', error);
    // If anything fails catastrophically, fall back to base PDF buffer
    return basePdfBuffer;
  }
}
