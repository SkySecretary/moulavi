# Infrastructure & Server Reference

This document maintains the active server inventory, network architecture, and operational daemon configuration across production environments.

---

## 1. Production Deployment Server (NuSync / Moulavi ERP)

* **Domain:** `https://umra.moulavi.in`
* **Public IP:** `64.227.158.41`
* **Default User:** `root`
* **Root Application Directory:** `/var/www/umrasystem`
* **SSH Key Required:** `~/.ssh/id_rsa_deploy`

### Directory Layout on Server
```
/var/www/umrasystem/
├── current -> /var/www/umrasystem/releases/YYYYMMDD_HHMMSS
├── releases/
│   ├── 20261026_145000/
│   └── ... (versioned releases)
└── shared/
    ├── dev.db             # Shared persistent SQLite database
    ├── .env               # Shared backend environment configuration
    └── uploads/           # Uploaded mutamer passports & documents
```

### Network Topology & Reverse Proxy
1. **Public Inbound:** Hits Apache on ports `80` (HTTP) and `443` (HTTPS with Let's Encrypt / Certbot).
2. **Internal Proxy:** Apache forwards traffic internally to Nginx listening on port `81`.
3. **Application Routing (Nginx Port 81):**
   * `/` -> Next.js Frontend (`http://127.0.0.1:3001`)
   * `/api/` -> Express Backend (`http://127.0.0.1:5001`)
   * `/b2c/` -> B2C Vite/Static application

### PM2 Process Inventory
The application daemons are managed via PM2 under the `root` user:
```bash
# View active processes
pm2 status

# Restart processes
pm2 restart umrasystem-backend
pm2 restart umrasystem-frontend

# Flush log files if disk space is low (prevents SIGBUS build crashes)
pm2 flush
```

---

## 2. Known Server Fleet (DigitalOcean / Dedicated)

The following servers were discovered from the machine's SSH history and known hosts. Ensure credentials and access are verified before computer reset:

| IP / Hostname | User | Notes / Context |
| :--- | :--- | :--- |
| `64.227.158.41` | `root` | **Active Production:** `umra.moulavi.in` (NuSync / Moulavi ERP) |
| `167.172.140.253` | `root` | DigitalOcean droplet used for waiter / mobile backend |
| `64.225.76.6` | `root` | DigitalOcean droplet |
| `64.225.66.31` | `root` | DigitalOcean droplet |
| `164.90.224.143` | `root` | DigitalOcean droplet |
| `139.59.33.135` | `skysecretary` / `root` | SkySecretary server |
| `139.59.43.1` | `root` | DigitalOcean droplet |
| `50.6.204.133` | `Administrator` / `serveradmin` | Windows / Dedicated server |
| `15.185.41.94` | `root` | Cloud instance |
| `[93.127.208.48]:65002`| `root` | Custom SSH port instance |

---

## 3. Storage & Cloud Assets

* **AWS S3 / DigitalOcean Spaces:**
  * **Bucket Name:** `nusync-leadanalytical`
  * **Region:** `eu-central-1`
  * **Purpose:** Mutamer passport photos, vaccination records, and generated voucher/ticket PDFs.
