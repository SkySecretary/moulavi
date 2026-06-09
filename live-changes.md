# Live Changes Log

## [2026-06-08] Deployment to Production
- **Goal:** Push local changes to `64.227.158.41`.
- **Pre-deployment:** 
  - Database backup on server: `/var/www/umrasystem/backend/prisma/dev.db.bak_20260608_222847`
- **Changes:**
  - Frontend built locally and synced (excluding `node_modules`).
  - Backend synced (excluding `node_modules`, `*.db*`, and `uploads`).
- **Safety:** Local database (`dev.db`) was NOT pushed to the server to prevent overwriting production data.
- **Fix (2026-06-08):** Ran `npx prisma db push` on the server to sync the schema and add missing columns (`makkah_hotel_name`, etc.) that were causing 500 errors.
