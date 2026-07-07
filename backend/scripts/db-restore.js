const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const seedPath = path.join(__dirname, '..', 'prisma', 'seed.sql');

console.log('🔄 Starting Database Restore Process...');

if (!fs.existsSync(seedPath)) {
  console.error('❌ Error: seed.sql not found at ' + seedPath);
  process.exit(1);
}

// 1. Delete existing database file if it exists
if (fs.existsSync(dbPath)) {
  console.log('🗑️  Removing existing dev.db...');
  try {
    fs.unlinkSync(dbPath);
  } catch (err) {
    console.error('❌ Error deleting dev.db. Please ensure the server is stopped and try again.', err.message);
    process.exit(1);
  }
}

// 2. Restore database using sqlite3 command-line
console.log('📥 Importing seed.sql into dev.db...');
try {
  // Use sqlite3 CLI to restore
  execSync(`sqlite3 "${dbPath}" < "${seedPath}"`, { stdio: 'inherit' });
  console.log('✅ Database restored successfully!');
} catch (err) {
  console.error('❌ Error restoring database via sqlite3 CLI:', err.message);
  console.log('\n💡 Alternative: If sqlite3 command is not installed, you can manually copy or install sqlite3.');
  process.exit(1);
}
