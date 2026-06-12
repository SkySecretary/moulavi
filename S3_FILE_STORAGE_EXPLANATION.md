# S3 File Storage - Complete Explanation

## 📋 Overview

This document explains all file upload locations, naming conventions, and storage patterns in the NuSync system.

---

## 🗂️ File Upload Types & Locations

### 1. **Party Documents** ✅
- **Route**: `POST /api/upload/party/:partyId`
- **S3 Location**: `parties/{partyId}/{documentType}/{timestamp}_{filename}`
- **Example**: `parties/abc-123/gst_certificate/1703123456789_gst_cert.pdf`
- **Document Types**: `gst_certificate`, `pan_card`, `aadhaar_card`, `other`
- **Purpose**: Store party-related documents (GST certificates, PAN cards, etc.)
- **Who Can Upload**: Admin/Staff only

---

### 2. **Umrah Visa Group Booking ZIP** ✅
- **Route**: `POST /api/umrah-visa/group/create-booking`
- **S3 Location**: `bookings/group/{timestamp}_{filename}`
- **Example**: `bookings/group/1703123456789_pan_cards.zip`
- **Purpose**: ZIP file containing all passenger PAN cards for group bookings
- **File Type**: ZIP files only
- **Storage**: Files stay in this location permanently (no cleanup)

---

### 3. **Umrah Visa Individual Booking ZIP** ✅
- **Route**: `POST /api/umrah-visa/create-booking`
- **S3 Location**: `bookings/individual/{timestamp}_{filename}`
- **Example**: `bookings/individual/1703123456789_pan_cards.zip`
- **Purpose**: ZIP file containing all passenger PAN cards for individual bookings
- **File Type**: ZIP files only
- **Storage**: Files stay in this location permanently (no cleanup)

---

### 4. **Iqama Confirmation Upload** ✅
- **Route**: `POST /api/upload/booking/:bookingId` (with `document_type='confirmation_image'`)
- **S3 Location**: `bookings/{bookingId}/confirmation_image/{timestamp}_{filename}`
- **Example**: `bookings/xyz-789/confirmation_image/1703123456789_confirmation.jpg`
- **Purpose**: Confirmation image uploaded by admin/staff in Trip Info > Iqama tab
- **File Type**: Images (JPEG, JPG, PNG) or PDF
- **Who Can Upload**: Admin/Staff only
- **Note**: This uses the "Single Booking Document" upload endpoint

---

### 5. **Single Booking Document** ⚠️ (You need to decide if you need this)
- **Route**: `POST /api/upload/booking/:bookingId`
- **S3 Location**: 
  - Without passenger: `bookings/{bookingId}/{documentType}/{timestamp}_{filename}`
  - With passenger: `bookings/{bookingId}/passengers/{passengerId}/{documentType}/{timestamp}_{filename}`
- **Example**: `bookings/abc-123/passport_front/1703123456789_passport.jpg`
- **Purpose**: Upload a single document to an existing booking
- **File Type**: Images (JPEG, JPG, PNG, WEBP) or PDF
- **Document Types**: `pan_card`, `passport_front`, `passport_back`, `visa_copy`, `other`, `confirmation_image`
- **Use Cases**: 
  - Iqama confirmation images (currently used)
  - Adding documents to existing bookings
  - Updating passenger documents

**Question for you**: Do you need this endpoint, or is it only used for iqama confirmation? If only for confirmation, we could create a dedicated endpoint.

---

### 6. **Multiple Passenger Documents** ⚠️ (You need to decide if you need this)
- **Route**: `POST /api/upload/booking/:bookingId/passenger/:passengerId`
- **S3 Location**: `bookings/{bookingId}/passengers/{passengerId}/{documentType}/{timestamp}_{filename}`
- **Example**: `bookings/abc-123/passengers/xyz-456/passport_front/1703123456789_passport.jpg`
- **Purpose**: Upload multiple documents (up to 10) for a specific passenger in a booking
- **File Type**: Images (JPEG, JPG, PNG, WEBP) or PDF
- **Max Files**: 10 files per request

**Question for you**: Do you need this endpoint? Is it used anywhere in the frontend?

---

## 📝 File Naming Convention

### Where File Names Are Generated

#### 1. **Main Function**: `generateUniqueFileName()`
- **Location**: `backend/src/config/s3.ts` (lines 216-223)
- **Function**:
```typescript
export function generateUniqueFileName(originalName: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(mimeType);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${baseName}_${timestamp}_${randomString}${extension}`;
}
```
- **Format**: `{baseName}_{timestamp}_{randomString}.{extension}`
- **Example**: `passport_1703123456789_a3b4c5.jpg`

#### 2. **Used In**:
- **Party Documents**: `backend/src/routes/upload.routes.ts` (line 402)
- **Booking Documents**: `backend/src/routes/upload.routes.ts` (line 26)
- **Umrah Visa ZIP Files**: `backend/src/routes/umrahVisa/shared.ts` (line 24)

#### 3. **Direct Filename Generation** (for Umrah Visa ZIP):
- **Location**: `backend/src/routes/umrahVisa/shared.ts` (lines 24-30)
- **Code**:
```typescript
const uniqueFileName = generateUniqueFileName(file.originalname, file.mimetype || 'application/zip');
const timestamp = Date.now();
const sanitizedFileName = uniqueFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
const key = `bookings/individual/${timestamp}_${sanitizedFileName}`; // or bookings/group/
```

#### 4. **S3 Key Generation**: `generateS3Key()`
- **Location**: `backend/src/config/s3.ts` (lines 84-98)
- **Purpose**: Generates the full S3 path for booking documents
- **Function**:
```typescript
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
```

---

## 🔍 Summary of All Upload Endpoints

| Endpoint | S3 Location | Purpose | File Types | Max Size |
|----------|-------------|---------|------------|----------|
| `POST /api/upload/party/:partyId` | `parties/{partyId}/...` | Party documents | JPEG, JPG, PNG, WEBP, PDF | 10MB |
| `POST /api/umrah-visa/group/create-booking` | `bookings/group/...` | Group booking ZIP | ZIP only | No limit |
| `POST /api/umrah-visa/create-booking` | `bookings/individual/...` | Individual booking ZIP | ZIP only | No limit |
| `POST /api/upload/booking/:bookingId` | `bookings/{bookingId}/...` | Single booking document | JPEG, JPG, PNG, WEBP, PDF | 10MB |
| `POST /api/upload/booking/:bookingId/passenger/:passengerId` | `bookings/{bookingId}/passengers/...` | Multiple passenger docs | JPEG, JPG, PNG, WEBP, PDF | 10MB |

---

## ❓ Questions for You

1. **Single Booking Document** (`POST /api/upload/booking/:bookingId`):
   - Is this only used for iqama confirmation, or do you need it for other purposes?
   - If only for confirmation, should we create a dedicated endpoint?

2. **Multiple Passenger Documents** (`POST /api/upload/booking/:bookingId/passenger/:passengerId`):
   - Is this endpoint used anywhere in your frontend?
   - Do you need the ability to upload multiple documents for passengers after booking creation?

3. **Temp Files**:
   - Previously, umrah visa ZIP files went to `bookings/temp/` and stayed there permanently
   - Now they go to `bookings/individual/` or `bookings/group/` - is this better organization acceptable?

---

## ✅ Changes Made

1. ✅ **Fixed Umrah Visa ZIP Storage**:
   - Individual bookings now upload to: `bookings/individual/{timestamp}_{filename}`
   - Group bookings now upload to: `bookings/group/{timestamp}_{filename}`
   - Removed the `bookings/temp/` folder usage

2. ✅ **Separated Upload Configurations**:
   - Created `uploadIndividual` for individual bookings
   - Created `uploadGroup` for group bookings
   - Both use proper folder structures

---

## 📍 File Naming Locations Summary

1. **`generateUniqueFileName()`**: `backend/src/config/s3.ts:216-223`
   - Main function for generating unique filenames
   - Used by: Party documents, Booking documents

2. **`generateS3Key()`**: `backend/src/config/s3.ts:84-98`
   - Generates full S3 path for booking documents
   - Used by: Single/Multiple booking document uploads

3. **Direct in Umrah Visa Upload**: `backend/src/routes/umrahVisa/shared.ts:24-30`
   - Generates S3 key for individual/group ZIP files
   - Uses `generateUniqueFileName()` then sanitizes

4. **Party Document Upload**: `backend/src/routes/upload.routes.ts:397-408`
   - Generates S3 key for party documents
   - Uses `generateUniqueFileName()` then creates path

