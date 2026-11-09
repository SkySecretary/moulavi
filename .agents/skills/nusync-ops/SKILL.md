---
name: nusync-ops
description: >-
  Operational workflows, deployment commands, database diagnostics, and third-party API 
  integrations for the NuSync (Moulavi ERP) Umrah Visa Management platform.
---

# NuSync (Moulavi ERP) Operational Guide & Skill

This skill contains the operational runbooks, system commands, database management procedures, and third-party API integration patterns for NuSync (Moulavi ERP).

---

## 1. System Architecture & Deployment

### Deployment Topology
* **Production Domain:** `https://umra.moulavi.in`
* **Server IP:** `64.227.158.41` (User: `root`)
* **Remote Path:** `/var/www/umrasystem`
* **SSH Key Requirement:** `/Users/awadnejil/.ssh/id_rsa_deploy`
* **Reverse Proxy Stack:**
  * Apache (Port 80/443 SSL via Certbot) -> Nginx (Port 81) -> Node.js & Next.js
* **PM2 Services:**
  * `umrasystem-backend` (Port 5001)
  * `umrasystem-frontend` (Port 3001)

### Deployment Procedure
The deployment script compiles all three subsystems locally before packaging and uploading to conserve server memory:

```bash
# Unified deployment
./deploy.sh
```

**What `./deploy.sh` executes:**
1. Builds `backend` (`npm run build`).
2. Builds `frontend` (`npm run build`).
3. Builds `b2c` (`npm run build`).
4. Bundles release archive (`release.tgz`) excluding `node_modules` and database files.
5. Uploads via `scp` using `-i ~/.ssh/id_rsa_deploy`.
6. Unpacks into `/var/www/umrasystem/releases/<timestamp>`.
7. Symlinks shared files (e.g., `uploads/`, `dev.db`, `.env`).
8. Symlinks to `/var/www/umrasystem/current` and restarts PM2 services.

---

## 2. Database & Schema Operations

* **Database Engine:** SQLite managed via Prisma (`backend/prisma/dev.db`).
* **Schema File:** `backend/prisma/schema.prisma`
* **Automated Backups:** Runs every 2 hours via `backend/src/server.ts`, saving to `backend/backups/` (keeps the last 10 backups).
* **Manual Backup Command:**
  ```bash
  node backend/scripts/backup-db.js
  ```
* **Schema Updates:**
  Always regenerate the Prisma client after modifying `schema.prisma`:
  ```bash
  cd backend && npx prisma generate
  ```

### System Diagnostics Tool
Audit database consistency, trace vouchers, inspect group codes, and detect sequence gaps:

```bash
# Run full diagnostic audit
node backend/scripts/troubleshoot.js

# Deep search by keyword (Voucher #, Group Code, Booking Reference, Agency)
node backend/scripts/troubleshoot.js --search <keyword>

# Audit pending bookings and database integrity
node backend/scripts/troubleshoot.js --pending
node backend/scripts/troubleshoot.js --db-check
```

---

## 3. External API Integrations Reference

### A. Saudi Ministry / Masar Nusuk APIs
* **Host:** `https://masar.nusuk.sa`
* **Authentication:** `Authorization: Bearer <JWT>`
* **Required Headers:**
  * `activeentityid`: e.g. `719133` or `525375`
  * `activeentitytypeid`: e.g. `52` or `32`
  * `entity-id`: Matching active entity ID
  * `x-lang`: `en`
* **Key Endpoints:**
  * **Export Mutamers Report:**
    `POST https://masar.nusuk.sa/umrah/reports_apis/api/Reports/ExportData?exportDataType=1&reportType=1`
    *Payload:* `{"limit":1000000,"offset":0,"filterList":[{"propertyName":"entryDate","operation":"day_equal","propertyValue":"DD/MM/YYYY"}],"sortColumn":null,"sortCriteria":[]}`
  * **Submit Mutamer Personal Info:**
    `POST https://masar.nusuk.sa/umrah/groups_apis/api/Mutamer/SubmitPersonalAndContactInfos`
    *Header requirement:* `contractid`

### B. UmrahBus Invoicing Gateway
* **Host:** `https://report.umrabus.com`
* **Endpoint:** `POST /api/passport/upload-invoices`
* **Payload Structure:**
  ```json
  [
    {
      "partyID": 2,
      "remarks": "Voucher No",
      "qty": 10,
      "rate": 500,
      "amt": 5000,
      "visaFileDetailID": 1,
      "typ": 2,
      "umrahCompanyID": 442,
      "groupCode": "UMR001",
      "cost": 200,
      "costAmt": 2000,
      "umrahType": 1
    }
  ]
  ```

### C. LinalaPro WhatsApp Cloud API Gateway
* **Host:** `https://wa.linalapro.com`
* **Headers:**
  * `X-API-Key: <api_key>`
  * `X-API-Secret: <api_secret>`
  * `X-Channel-Id: <channel_uuid>`
* **Template Endpoint:** `POST /api/v1/messages/template`
  ```json
  {
    "to": "966509179792",
    "templateName": "ecom_payment_status_alert",
    "language": "en_US",
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "value" }] }
    ]
  }
  ```
* **Text Message Endpoint:** `POST /api/v1/messages`
  ```json
  { "to": "+919633348491", "message": "Notification text" }
  ```

### D. WizWat WhatsApp Gateway
* **Host:** `https://app.wizwat.com`
* **Endpoints:**
  * `POST /api/qr/rest/send_message`
  * `POST /api/v1/send-message?token=<JWT>`
* **Payload Structure:**
  ```json
  {
    "token": "<JWT_TOKEN>",
    "from": "97334599814",
    "to": "919633348491",
    "messageType": "text",
    "requestType": "POST",
    "text": "Your booking confirmation..."
  }
  ```

### E. ZeptoMail Transactional Emails
* **Host:** `https://api.zeptomail.in`
* **Endpoint:** `POST /v1.1/email`
* **Header:** `Authorization: Zoho-enczapikey <KEY>`
* **Payload:**
  ```json
  {
    "from": { "address": "noreply@linalapro.com" },
    "to": [{ "email_address": { "address": "awad@linalapro.com", "name": "Awad" } }],
    "subject": "Booking Update",
    "htmlbody": "<div><b>Booking details...</b></div>"
  }
  ```

---

## 4. Operational Mandates
1. **No Sidebar:** The UI strictly uses the Top Navigation Bar for primary modules and the Settings Page for master configuration.
2. **Local Pre-compilation:** Always build on local machine before syncing to production droplet to avoid out-of-memory kernel kills (`SIGBUS`/`SIGKILL`).
3. **PM2 Log Hygiene:** If builds fail with disk space warnings, execute `pm2 flush` on the remote server.
4. **Retry Loop on Booking Reference:** Concurrency protection retry loops must remain active on `/create-booking` and `/group/create-booking`.
