# Project Context: NuSync (Umrah Visa Management)

This document serves as the foundational reference for the NuSync project. It captures the system architecture, deployment configuration, and critical operational mandates.

## 🚀 Deployment Overview
- **Domain:** [https://umra.moulavi.in](https://umra.moulavi.in)
- **Server IP:** `64.227.158.41`
- **Internal Stack:**
  - **Apache:** Front-facing reverse proxy handling SSL (Certbot).
  - **Nginx:** Internal load balancer/router listening on port `81`.
  - **Backend (API):** Node.js/Express running on port `5001` via PM2 (`umrasystem-backend`).
  - **Frontend (UI):** Next.js running on port `3001` via PM2 (`umrasystem-frontend`).
- **Database:** SQLite managed via Prisma (`backend/prisma/dev.db`).

## 🏗️ Architecture & Features

### Core Modules
1.  **Bookings Listing:** Centralized dashboard for creating Individual and Group bookings.
2.  **Voucher Management:** 
    *   **Vouchers Tab:** Listing and Quick Create (manual entry).
    *   **Movements Tab:** Today/Tomorrow view for transport tracking with editable driver/vehicle details. Includes **PDF Print** functionality for Tafweej.
3.  **Tafweej (Daily Overview):** Comprehensive operational view with PDF Print support for daily scheduling.
4.  **Settings:** Gear icon in Navbar leads to centralized management of all master data (Users, Cities, Countries, Transport Routes, etc.).

### Database & Backup
- **Database:** SQLite managed via Prisma (`backend/prisma/dev.db`).
- **Auto-Backup:** A scheduled task runs every 12 hours (via `backend/src/server.ts`) backing up the database to `backend/backups/`. It keeps the last 10 backups.
- **Manual Backup:** Can be triggered via `node backend/scripts/backup-db.js`.

### Alternate Booking Information (Mandate)
The system supports "Alternate Info" for all bookings. This allows users to store placeholder/dummy details (flights, hotels, transport) separately from the confirmed main information.
- **Implementation:** Data is stored in the same tables as main info but differentiated by the `isAlternate: true` flag.
- **Frontend:** Managed via the "Manage Alternate Info" dialog in the Booking View page.

## 🛠️ Operational Commands

### Local Development
```bash
# Start both backend and frontend
npm run dev
```

### Deployment Workflow
Due to server memory limitations, the frontend should be built locally before syncing:
1.  **Local Build:** `cd frontend && npm run build`
2.  **Sync:** `rsync -avz --exclude "node_modules" .next ... root@64.227.158.41:/var/www/umrasystem/`
3.  **Restart:** `pm2 restart umrasystem-frontend`

## ⚠️ Critical Mandates
- **No Sidebar:** The side menu has been intentionally removed. All navigation must reside in the Top Navbar (Main Apps) or the Settings page (Masters).
- **Prisma Regeneration:** After any schema change, always run `npx prisma generate` in the `backend` folder to update the client.
- **Disk Space:** PM2 logs on this server can grow rapidly (e.g., `wa.linalapro`). Use `pm2 flush` if builds fail with `SIGBUS`.

---
*Last updated: April 10, 2026*
