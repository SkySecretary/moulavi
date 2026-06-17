const fs = require('fs');
const path = require('path');

/**
 * Simple script to backup the SQLite database
 */
function backupDatabase() {
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`[BACKUP] Database file not found at ${dbPath}`);
    return;
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`[BACKUP] Created backup directory at ${backupDir}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `dev-backup-${timestamp}.db`);

  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`[BACKUP] Successfully backed up database to ${backupPath}`);

    // Optional: Keep only last 10 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('dev-backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      files.slice(10).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f.name));
        console.log(`[BACKUP] Removed old backup: ${f.name}`);
      });
    }
  } catch (error) {
    console.error(`[BACKUP] Error during backup: ${error.message}`);
  }
}

// If run directly
if (require.main === module) {
  backupDatabase();
}

module.exports = backupDatabase;
