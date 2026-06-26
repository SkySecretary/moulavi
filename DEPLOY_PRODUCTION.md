# NuSync Production Deployment (Robust Versioning)
# URL: https://umra.moulavi.in
# Server: 64.227.158.41

## 🚀 Recommended Deployment Workflow

We now use a **Releases & Symlink** mechanism for safe deployments. This allows for instant rollbacks and zero-downtime updates.

### 1. Execute Deployment Script
Simply run the provided `deploy.sh` from the project root. This script will automatically compile both the backend and frontend locally (to save server memory), sync the files to the remote server, initialize shared databases, create symlinks, and restart the PM2 services.

```bash
./deploy.sh
```

**Note:** The script uses the deploy SSH key `/Users/awadnejil/.ssh/id_rsa_deploy` to authenticate with the server. Ensure this key is set up on your machine.

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
