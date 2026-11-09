# Critical Machine Reset & Migration Guide

> [!CAUTION]
> **DO NOT RESET THIS MACHINE UNTIL YOU COMPLETE ALL STEPS IN THIS CHECKLIST.**
> Resetting the machine without taking these actions will cause permanent data loss of uncommitted/unpushed code, SSH private keys (locking you out of production servers), environment secrets, and databases.

---

## 1. Git Repositories: Push All Local Commits Immediately!

In `moulavi-erp`, there are branches with dozens of unpushed commits that exist **ONLY on this computer's local disk**:

### Branch `feature/b2c-channel`: **48 Unpushed Commits!**
```bash
cd /Users/awadnejil/Desktop/moulavi-erp
git checkout feature/b2c-channel
git push origin feature/b2c-channel
```

### Branch `feature/fixes-and-updates-new`: **Unpushed Commits!**
```bash
cd /Users/awadnejil/Desktop/moulavi-erp
git checkout feature/fixes-and-updates-new
git push origin feature/fixes-and-updates-new
```

### Check other branches & other projects on Desktop:
```bash
# Check status across branches
git branch -a
git status
```
Also check other git repos on your Desktop before formatting:
* `~/Desktop/wa.linala`
* `~/Desktop/pos-professional`
* `~/Desktop/orderown-pos-mobile`
* `~/Desktop/orderown-waiter`
* `~/Desktop/zaak_project` / `zaak_broast` / `zatca`
* `~/Desktop/skypos` / `sky-zeinvoice`

---

## 2. SSH Keys: Essential for Server & GitHub Access

The file `~/.ssh/id_rsa_deploy` is hardcoded into `./deploy.sh`. Without it, you **cannot deploy** to `64.227.158.41`!

**Copy the entire `~/.ssh` directory to a secure USB drive or encrypted cloud storage:**
```bash
tar -czvf ~/Desktop/ssh_backup_$(date +%Y%m%d).tar.gz ~/.ssh
```
Key files:
* `~/.ssh/id_rsa_deploy` (Used for `./deploy.sh` and root access to `64.227.158.41`)
* `~/.ssh/id_rsa_deploy.pub`
* `~/.ssh/id_ed25519` (GitHub SSH Authentication key)
* `~/.ssh/id_ed25519.pub`
* `~/.ssh/id_rsa_temp`
* `~/.ssh/known_hosts` (Reference list of all droplet IPs)

---

## 3. Environment Secrets (`.env` files)

These files are ignored by git (`.gitignore`) and will disappear if the disk is wiped:

### A. `backend/.env`
Contains:
* `DATABASE_URL="file:./dev.db"`
* `JWT_SECRET` & `JWT_REFRESH_SECRET`
* `SMTP_HOST=smtp.bizmail.yahoo.com`, `SMTP_USER=info@moulavi.com`, `SMTP_PASSWORD`
* `FRONTEND_URL=https://umra.moulavi.in`
* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME=nusync-leadanalytical`, `AWS_REGION=eu-central-1`
* `AVIATIONSTACK_API_KEY`

### B. `frontend/.env.production` & `frontend/.env.development`
* `NEXT_PUBLIC_API_URL=https://umra.moulavi.in/api`
* `NEXT_PUBLIC_API_URL=http://localhost:5001/api`

**Create a bundle of your environment configurations:**
```bash
tar -czvf ~/Desktop/env_files_backup.tar.gz \
  /Users/awadnejil/Desktop/moulavi-erp/backend/.env \
  /Users/awadnejil/Desktop/moulavi-erp/frontend/.env.production \
  /Users/awadnejil/Desktop/moulavi-erp/frontend/.env.development
```

---

## 4. Local SQLite Database (`dev.db`)

* **Path:** `/Users/awadnejil/Desktop/moulavi-erp/backend/prisma/dev.db` (28MB)
* This database contains all local development data, test bookings, vouchers, and party details.
* **Backup command:**
```bash
cp /Users/awadnejil/Desktop/moulavi-erp/backend/prisma/dev.db ~/Desktop/dev.db.bak_$(date +%Y%m%d)
```

---

## 5. AI Personas & Prompts

* **Path:** `~/prompts/system.md`
* Set in `~/.zshrc` via `export GEMINI_SYSTEM_MD=~/prompts/system.md`.
* Contains your 30KB custom AI assistant persona, architecture principles, and execution guidelines.
* **Backup command:**
```bash
cp -r ~/prompts ~/Desktop/prompts_backup
```

---

## 6. Planning & Urgent Notes on Desktop

Back up your urgent notes and consolidation plans located on the Desktop:
* `~/Desktop/TODO URGENT.txt`
* `~/Desktop/Highlveel.text`
* `~/Desktop/INSTRUCTIONS-FOR-OPUS.md`

---

## 7. Fast Backup Script (Run Everything in One Command)

To archive all the above critical assets into a single timestamped tarball on your Desktop before resetting:

```bash
mkdir -p ~/Desktop/COMPUTER_PRE_RESET_BACKUP
cd ~/Desktop/COMPUTER_PRE_RESET_BACKUP

# 1. Archive SSH keys
cp -r ~/.ssh ./ssh_backup

# 2. Archive Prompts
cp -r ~/prompts ./prompts_backup

# 3. Archive Shell config
cp ~/.zshrc ./.zshrc_backup

# 4. Archive Moulavi env files & database
mkdir -p ./moulavi_assets
cp /Users/awadnejil/Desktop/moulavi-erp/backend/.env ./moulavi_assets/backend.env
cp /Users/awadnejil/Desktop/moulavi-erp/frontend/.env.production ./moulavi_assets/frontend.env.production
cp /Users/awadnejil/Desktop/moulavi-erp/backend/prisma/dev.db ./moulavi_assets/dev.db

# 5. Archive Desktop notes
cp ~/Desktop/*.txt ~/Desktop/*.text ./ 2>/dev/null || true

# 6. Compress entire bundle
cd ~/Desktop
tar -czvf computer_reset_backup_$(date +%Y%m%d_%H%M%S).tar.gz COMPUTER_PRE_RESET_BACKUP
```

After running this, copy `computer_reset_backup_*.tar.gz` to Google Drive, iCloud, or a flash drive, and make sure `git push origin feature/b2c-channel` completes cleanly!
