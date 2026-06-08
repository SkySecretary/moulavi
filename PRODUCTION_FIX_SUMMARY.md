# PRODUCTION_FIX_SUMMARY.md

---

**Date:** 2026-06-08 (User's locale date)

### Database Backup

- **Action:** Created a backup of the production database `dev.db` before deploying new code.
- **Location:** The backup is named `dev.db.backup_manual` and is located in `/var/www/umrasystem/backend/`.
- **Purpose:** To ensure data integrity and provide a rollback point in case of unforeseen issues during deployment, specifically as requested by the user to avoid data loss.

### Code Deployment Summary (Current State)

This deployment includes fixes and enhancements for the voucher PDF, UI components, and backend logic.

**Frontend Changes:**
- **`frontend/components/voucher/VoucherPreviewDialog.tsx`**:
    - Initialized `selectedTransportCompanyId` from `data.transportCompany?.id` for proper pre-selection.
    - Fixed syntax error: Removed extra closing parenthesis after `setSelectedRouteId(firstTransportRouteId);`.
- **`frontend/app/dashboard/umrah-visa/voucher/page.tsx`**:
    - Modified `filterData` function to include bookings with `'bill'` status, making them visible in the voucher generation list.
- **`frontend/app/dashboard/umrah-visa/trip-info/page.tsx`**:
    - Updated `handleCopyAll` to extract Makkah/Madinah hotel and BRN from `sponsorIqamaDetails` for Iqama bookings.
- **`frontend/components/CreatePartyDialog.tsx`**:
    - Fixed `logoPath` URL to be absolute from the root (prepended leading slash if missing) to correctly display company logos.
- **`frontend/components/ui/checkbox.tsx`**:
    - Created the missing `Checkbox` UI component.
- **`frontend/package.json`**:
    - Added `@radix-ui/react-checkbox` dependency.

**Backend Changes:**
- **`backend/prisma/schema.prisma`**:
    - Added `makkahHotelName`, `makkahBrn`, `madinahHotelName`, `madinahBrn` to `UmrahSponserIqamaDetails`.
    - Added `viaBdr` to `VoucherMovement` model.
- **`backend/src/routes/upload.routes.ts`**:
    - Modified upload routes to save relative file paths (`uploads/...`) instead of absolute paths.
    - Increased max file limit for document uploads from 10 to 50.
- **`backend/src/services/pdfService.ts`**:
    - Removed `VIA` column from movement table; integrated `(VIA BDR)` tag into `FROM LOCATION` column when `viaBdr` is true.
    - Changed "FLIGHT CONNECTIVITY" label to "Flight Details".
    - Updated `getImageAsBase64` to resolve relative `uploads/` paths correctly.
    - Dynamically extracts unique vehicle types from `transportBookings` to display in the header info block (e.g., "12 Seater, Sedan, GMC").
- **`backend/src/services/emailService.ts`**:
    - Added `sendVoucherGeneratedEmail` function to send PDF vouchers as attachments.
    - Restored `sendVerificationEmail` function.
- **`backend/src/routes/umrahVisaWorkflow.routes.ts`**:
    - Modified `generate-voucher` route to correctly save/update all voucher sub-records (movements, hotels, flights).
    - Added call to `sendVoucherGeneratedEmail` after PDF generation.
    - Updated `fullVoucher` query to explicitly include `umrahCompany` details for the PDF header.
    - Updated `GET /api/umrah-visa/:bookingId/voucher-data` to explicitly select `logoPath` for `umrahVisaProvider` and derive top-level `vehicleType` from `transportBookings`.
    - Corrected `voucherId` to `voucher` after the transaction return.
- **`backend/src/routes/umrahVisa.routes.ts`**:
    - Explicitly selected `makkahHotelName`, `makkahBrn`, `madinahHotelName`, `madinahBrn` in `sponsorIqamaDetails` include for the main bookings query.
- **`backend/app/dashboard/umrah-visa/visa-management/edit/[id]/page.tsx`**:
    - Added state variables and UI inputs for Iqama Makkah/Madinah hotel names and BRNs.
    - Updated `load` and `handleSave` functions to handle new Iqama hotel fields.
- **`backend/scripts/alter_db.js`**:
    - Script to non-destructively add new columns (`logo_path`, `vehicle_type`, `via_bdr`, `viabadr_override`) to the `dev.db` using raw SQL queries via Prisma.
- **`backend/scripts/fix-logo-paths.js`**:
    - Script to convert absolute database paths to relative paths for `logoPath` and `filePath` columns.

### Post-Deployment Actions on Server

- **`npx prisma db push`**: Will be run to apply new schema changes.
- **`node scripts/fix-logo-paths.js`**: Will be re-run to ensure all logo paths in the database are relative.

### Deployment Issue (2026-06-08)

- **Problem:** Attempting to build the frontend directly on the production server resulted in a `SIGBUS` error, indicating a memory limitation.
- **Cause:** The `GEMINI.md` explicitly states that due to server memory limitations, the frontend should be built locally and then synced. My previous deployment command failed to adhere to this.
- **Resolution:** I will now build the frontend locally and sync only the `.next` output directory to the server, then restart PM2.

---
**Prepared by Gemini CLI**