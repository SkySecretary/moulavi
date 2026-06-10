# Moulavi ERP Production Deployment (Robust Versioning)
# URL: https://umra.moulavi.in
# Server: 64.227.158.41

## 🚀 Recommended Deployment Workflow

We now use a **Releases & Symlink** mechanism for safe deployments. This allows for instant rollbacks and zero-downtime updates.

### 1. Local Build (Mandatory)
Always build locally to prevent the server from running out of memory:
```bash
# Build Frontend
cd frontend && npm install && npm run build

# Build Backend
cd ../backend && npm install && npm run build
```

### 2. Execute Deployment Script
Run the provided `deploy.sh` from the project root. This script handles directory preparation, code upload, schema updates, and atomic switching.

```bash
./deploy.sh
```

**Note:** You will be prompted for the root password for the server `64.227.158.41` multiple times during the process (or once if using SSH keys).

### 3. Verification
Once completed, verify the status of the services on the server:
```bash
ssh root@64.227.158.41 "pm2 status"
```

## 🔄 Rollback Strategy
If a deployment fails or introduces a bug, you can instantly rollback by pointing the `current` symlink to the previous release:

```bash
ssh root@64.227.158.41
cd /var/www/umrasystem
ls -la releases/ # Find the previous timestamp
ln -sfn releases/PREVIOUS_TIMESTAMP current
pm2 restart all
```

---
*Updated: June 10, 2026*
