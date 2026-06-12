# NuSync — Umrah Visa Management System

Professional ERP system for managing Umrah Visa bookings, transport vouchers, and automated document handling.

## 🚀 Deployment & Fresh Start (Quick Guide)

To reset all transaction data (Bookings, Vouchers, Passengers) and start from ID 1 on a production server:

1. **Upload Reset Script:**
   ```bash
   scp clear_data.js root@YOUR_SERVER_IP:/var/www/umrasystem/backend/
   ```

2. **Execute Reset:**
   ```bash
   ssh root@YOUR_SERVER_IP "cd /var/www/umrasystem/backend && node clear_data.js && npx prisma db push --accept-data-loss && pm2 restart all"
   ```
   *Note: `prisma db push` ensures your database schema matches the latest code (fixing issues like missing `logo_path` or `booking_reference` columns).*

---

## 🛠️ Installation Guide

### Prerequisites
- **Node.js** v18 or higher
- **npm** or **yarn**
- **SQLite3** (for local development)
- **Google Chrome / Chromium** (required for PDF generation)

### 1. Local Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd moulavi-erp
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables:**
   - Create `.env` in `backend/` (use `.env.example` as a template).
   - Create `.env` in `frontend/` (use `.env.example` as a template).
   - *Key variables:* `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`.

4. **Initialize Database:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npm run seed:all  # Creates admin user: admin@moulavi.com / admin123
   ```

5. **Start Development Servers:**
   ```bash
   # From the root directory
   npm run dev
   ```
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:5001](http://localhost:5001)

### 2. Production Deployment

Due to server memory limitations, always **build the frontend locally** before syncing:

1. **Build Locally:**
   ```bash
   cd frontend && npm run build
   cd ../backend && npm run build
   ```

2. **Deploy Files:**
   Use the provided `deploy.sh` or manual rsync:
   ```bash
   rsync -avz --exclude "node_modules" . root@YOUR_SERVER_IP:/var/www/umrasystem/
   ```

3. **Server-Side Initialization:**
   ```bash
   ssh root@YOUR_SERVER_IP "cd /var/www/umrasystem/backend && npm install --production && npx prisma generate && npx prisma db push"
   ```

4. **Restart Services:**
   ```bash
   ssh root@YOUR_SERVER_IP "pm2 restart umrasystem-backend umrasystem-frontend"
   ```

---

## 📄 Key Features & Mandates

- **Dynamic Vouchers:** Professional transport vouchers generated via Puppeteer using high-quality SVG icons and dynamic company branding.
- **Fresh Start Mechanism:** Use `clear_data.js` to wipe transactions while preserving master data (Users, Cities, Countries).
- **Validation Rules:** 
    - Friday Ziyarah: Must be scheduled after 14:00 (2 PM).
    - Makkah to Madinah: Transport movements must be after 14:00 (2 PM).
- **Deployment Safety:** Never build on the server; always sync the `.next` folder from a local build to prevent SIGBUS/OOM crashes.

---
*Last updated: June 2026*
