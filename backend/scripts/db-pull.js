const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const sshKey = path.join(os.homedir(), '.ssh', 'id_rsa_deploy');

console.log('📥 Pulling database from live production server...');

// Configuration options with defaults
const keyPath = process.env.SSH_KEY || sshKey;
const serverUser = process.env.SERVER_USER || 'root';
const serverIp = process.env.SERVER_IP || '64.227.158.41';
const remoteDbPath = '/var/www/umrasystem/shared/dev.db';

let command = `scp -o StrictHostKeyChecking=no`;
if (fs.existsSync(keyPath)) {
  console.log(`🔑 Using SSH key at: ${keyPath}`);
  command += ` -i "${keyPath}"`;
} else {
  console.log(`⚠️  SSH key not found at ${keyPath}. Trying default SSH keys...`);
}

command += ` ${serverUser}@${serverIp}:${remoteDbPath} "${dbPath}"`;

try {
  console.log(`🚀 Executing: scp ${serverUser}@${serverIp}:${remoteDbPath} prisma/dev.db`);
  execSync(command, { stdio: 'inherit' });
  console.log('✅ Live database successfully downloaded and applied locally!');
  
  // Re-generate Prisma client to ensure it's in sync
  console.log('🔄 Regenerating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('🎉 Done! You can now start the dev server.');
} catch (err) {
  console.error('❌ Failed to download production database:', err.message);
  process.exit(1);
}
