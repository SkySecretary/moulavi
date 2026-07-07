const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const seedPath = path.join(__dirname, '..', 'prisma', 'seed.sql');

console.log('📤 Starting Database Dump Process...');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Error: dev.db not found at ' + dbPath);
  process.exit(1);
}

try {
  console.log('💾 Dumping dev.db to seed.sql...');
  execSync(`sqlite3 "${dbPath}" .dump > "${seedPath}"`, { stdio: 'inherit' });
  console.log('✅ Database dumped successfully to backend/prisma/seed.sql!');
} catch (err) {
  console.error('❌ Error dumping database via sqlite3 CLI:', err.message);
  process.exit(1);
}
