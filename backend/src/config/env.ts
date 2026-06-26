import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables based on environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(__dirname, '..', '..', envFile);
const defaultEnvPath = path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[SERVER] Pre-loading environment from ${envFile}`);
} else {
  dotenv.config({ path: defaultEnvPath });
  console.log(`[SERVER] Pre-loading environment from .env (fallback)`);
}
