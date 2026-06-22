# Server Incident Resolution & Configuration Cleanup (June 20, 2026)

This document records the diagnostics, resolutions, and cleanups performed on server `64.227.158.41` to resolve website errors for **NuSync (Umrah Visa Management)** and **WhatsWay (WhatsApp Marketing)**.

---

## 🚨 Incident 1: 503 Bad Gateway on `https://umra.moulavi.in` (NuSync)

### Cause
* The PM2 frontend process `umrasystem-frontend` was in a constant restart loop on the server.
* **Error Log**: `Error: Could not find a production build in the '.next' directory. Try building your app with 'next build' before starting the production server.`
* **Trigger**: A deployment was executed from another account using `deploy_v2.sh` without first compiling the production Next.js build locally (which was required because of memory limits on the server). This resulted in an incomplete `.next/` directory (missing `BUILD_ID` and other crucial build files) being synced to the server.

### Solution Applied
1. **Local Compilation**: Compiled both frontend and backend locally to ensure clean build directories existed.
2. **Robust Script Enhancements**: Updated [deploy_v2.sh](file:///Users/awadnejil/Desktop/moulavi-erp/deploy_v2.sh) to automatically build the application in subshells before uploading:
   ```bash
   # Step 0: Local Build to ensure production files are compiled
   echo "🔨 Running local builds..."
   echo "📦 Building backend..."
   (cd backend && npm run build)
   if [ $? -ne 0 ]; then
       echo "❌ Backend build failed! Aborting deployment."
       exit 1
   fi

   echo "📦 Building frontend..."
   (cd frontend && npm run build)
   if [ $? -ne 0 ]; then
       echo "❌ Frontend build failed! Aborting deployment."
       exit 1
   fi
   ```
3. **Redeployment**: Executed the updated `./deploy_v2.sh` script. The script successfully:
   - Compiled local code.
   - Performed a database schema sync without data loss.
   - Uploaded the clean build files and atomically switched PM2 to point to the new release.
   - Confirmed the process remains online with 0 restarts.

---

## 🚨 Incident 2: Wrong Directory/Routing on `https://wa.linalapro.com` (WhatsWay)

### Cause
* The active domain `wa.linalapro.com` was loading a broken/incorrect instance of the application.
* **Diagnostic**: Two duplicate processes were running in PM2:
  1. `wa.linalapro` (ID `1`), running from the incorrect folder `/var/www/wa.linalapro` on port `8003`.
  2. `whatsway` (ID `46`), running from the correct folder `/var/www/wa.linalapro.com` on port `8003`.
* **Port Conflict**: Because `wa.linalapro` (incorrect folder) was started first, it bound to port `8003`. When the correct `whatsway` process started, it failed to listen on port `8003` (error: `EADDRINUSE: address already in use 0.0.0.0:8003`), forcing Nginx to proxy traffic to the wrong version.

### Solution Applied
1. **PM2 Cleanup**: Stopped and deleted the duplicate/wrong process:
   ```bash
   pm2 delete wa.linalapro
   ```
2. **Correct Instance Startup**: Restarted the correct `whatsway` process to let it bind to port `8003`:
   ```bash
   pm2 restart whatsway
   ```
3. **State Persistence**: Saved the PM2 process list to prevent automatic recovery of the wrong process during server reboots:
   ```bash
   pm2 save
   ```
4. **Directory Archiving**: Renamed the incorrect directory `/var/www/wa.linalapro` to `/var/www/wizwat-archive` to prevent accidental starting or confusion.
5. **Nginx Cleanup**: Deleted the unused, disabled Nginx site file `/etc/nginx/sites-available/wa.linalapro.com` (which pointed to port 5005).
6. **Web Server Reload**: Tested the Nginx configuration and successfully restarted both Nginx and Apache to apply the clean proxy configuration.

---

## 🔍 Server Verification Status

### PM2 Process List
All active projects are running stably with 0 restarts:
```
┌────┬────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name                   │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ agentlabs              │ default     │ 3.2.3   │ fork    │ 1855817  │ 24m    │ 6    │ online    │ 0%       │ 64.8mb   │ root     │ disabled │
│ 54 │ umrasystem-backend     │ default     │ 1.0.0   │ fork    │ 1869475  │ 9m     │ 0    │ online    │ 0%       │ 179.4mb  │ root     │ disabled │
│ 55 │ umrasystem-frontend    │ default     │ N/A     │ fork    │ 1869493  │ 9m     │ 0    │ online    │ 0%       │ 55.6mb   │ root     │ disabled │
│ 46 │ whatsway               │ default     │ 3.6.0   │ fork    │ 1871248  │ 10s    │ 33   │ online    │ 0%       │ 195.7mb  │ root     │ disabled │
└────┴────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### Port Bindings
* Port `3001` — NextJS Frontend (`umrasystem-frontend`) is active.
* Port `5001` — Express Backend (`umrasystem-backend`) is active.
* Port `8003` — WhatsApp Service (`whatsway`, PID 1871248) is active.
* Port `5000` — Voice Service (`agentlabs`) is active.

### Endpoint Validation
* `https://umra.moulavi.in` ➡️ `HTTP/2 200`
* `https://wa.linalapro.com` ➡️ `HTTP/1.1 200 OK`

---

## 🚨 Additional Fixes (June 20, 2026 - Evening Update)

### Bug 1: Missing Time of Flight (ETA/ETD) in Voucher PDF
* **Cause**: 
  1. The API returned full ISO strings for flight times (e.g., `2026-06-20T11:45:00.000Z`).
  2. If the user did not click on the time picker field during the "generate voucher" preview, the frontend submitted these raw ISO strings directly.
  3. When storing them, the backend truncated the strings to 20 characters (resulting in `"2026-06-20T11:45:00."` with a trailing dot).
  4. The PDF generator's `new Date("2026-06-20T11:45:00.")` parser failed on the truncated string, producing an `Invalid Date` error and defaulting the printed value to `N/A`.
* **Solution**:
  1. **Frontend**: Updated [VoucherPreviewDialog.tsx](file:///Users/awadnejil/Desktop/moulavi-erp/frontend/components/voucher/VoucherPreviewDialog.tsx) to parse and format `etd` and `eta` to `HH:mm` format when initializing the preview data, ensuring that unmodified times are submitted to the backend in the correct format.
  2. **Backend**: Enhanced `formatTime` in [pdfService.ts](file:///Users/awadnejil/Desktop/moulavi-erp/backend/src/services/pdfService.ts) to directly extract hours/minutes from any ISO-like date-time string using regex, instantly correcting rendering for all existing database records.

### Bug 2: Missing Umrah Company for Travel Details Bookings
* **Cause**: 
  1. When a booking was created under "Travel Details" mode, the "Umrah Visa Providing Company" dropdown was hidden in `BookingModeStep.tsx`, and the field defaulted to empty (`null`).
  2. When the admin tried to assign it later using the "Add/Update Group Number" dialog (`AddGroupNumberDialog.tsx`), the dialog required entering a Group Number and Group Name (both of which are inapplicable for travel details mode bookings).
* **Solution**:
  1. **Booking Step**: Updated [BookingModeStep.tsx](file:///Users/awadnejil/Desktop/moulavi-erp/frontend/components/umrah-booking/steps/BookingModeStep.tsx) to render the "Umrah Visa Providing Company" dropdown optionally for the "Travel Details" mode, allowing users/parties to select it at creation.
  2. **Update Dialog**: Modified [AddGroupNumberDialog.tsx](file:///Users/awadnejil/Desktop/moulavi-erp/frontend/components/AddGroupNumberDialog.tsx) to only require Group Number and Group Name when `bookingMode !== 'travel_details'`, making these optional for "Travel Details" bookings so that admins can easily assign/update the Umrah Company at any time.

