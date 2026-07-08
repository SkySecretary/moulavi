# Database Sharing Instructions 🔄

To share this SQLite database between developers, we use a SQL text dump (`seed.sql`) instead of tracking the binary `dev.db` file directly in Git. This keeps Git diffs readable and avoids binary conflicts.

## 📤 Dumping database (To save changes to Git)
Before staging your changes to commit, export your local SQLite database changes:
```bash
cd backend
npm run db:dump
```
This updates the `backend/prisma/seed.sql` file. Be sure to add and commit it:
```bash
git add backend/prisma/seed.sql
git commit -m "Update database seed dump"
```

---

## 📥 Restoring database (For your colleague / when pulling changes)
When you pull new changes from Git that include an updated `seed.sql`, you can load the updated database:

### Prerequisite: SQLite CLI
Ensure you have the `sqlite3` CLI client installed on your system:
- **macOS**: Installed by default.
- **Linux (Ubuntu/Debian)**: `sudo apt-get install sqlite3`
- **Windows**: Download SQLite tools from [sqlite.org](https://www.sqlite.org/download.html) and add to PATH, or use Git Bash.

### Steps:
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Run the restore script (this will replace your local `dev.db` with the seed):
   ```bash
   npm run db:restore
   ```
3. Update the Prisma Client schema mapping:
   ```bash
   npx prisma generate
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

---

## 📥 Pulling live production database (For testing with real data)
If you want to pull the latest SQLite database file directly from the live production server to test with real production data locally:

1. Ensure you have SSH access to the production server (`64.227.158.41`).
2. Run the pull script:
   ```bash
   cd backend
   npm run db:pull
   ```
   *Note: This automatically downloads `/var/www/umrasystem/shared/dev.db` via `scp` and places it into `backend/prisma/dev.db`, overwriting your local data, and automatically runs `npx prisma generate` to sync backend mappings.*
