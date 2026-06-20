const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

// Load environment variables if run directly or not yet loaded
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);
};

const getEndpoint = () => {
  if (process.env.S3_ENDPOINT) {
    let endpoint = process.env.S3_ENDPOINT;
    if (endpoint.includes('.digitaloceanspaces.com')) {
      const match = endpoint.match(/https:\/\/([^.]+\.)?([^.]+)\.digitaloceanspaces\.com/);
      if (match && match[2]) {
        endpoint = `https://${match[2]}.digitaloceanspaces.com`;
      }
    }
    return endpoint;
  }
  const region = process.env.AWS_REGION;
  const doRegions = ['nyc3', 'sgp1', 'ams3', 'sfo3', 'fra1', 'blr1', 'syd1'];
  if (region && doRegions.includes(region.toLowerCase())) {
    return `https://${region}.digitaloceanspaces.com`;
  }
  return undefined;
};

const isUsingDigitalOceanSpaces = () => {
  const endpoint = getEndpoint();
  const region = process.env.AWS_REGION;
  return !!endpoint || !!(region && ['nyc3', 'sgp1', 'ams3', 'sfo3', 'fra1', 'blr1', 'syd1'].includes(region.toLowerCase()));
};

const getS3Client = () => {
  if (!isS3Configured()) return null;
  return new S3Client({
    region: isUsingDigitalOceanSpaces() ? 'us-east-1' : (process.env.AWS_REGION || 'us-east-1'),
    endpoint: getEndpoint(),
    forcePathStyle: false,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

/**
 * Script to backup the SQLite database locally and to S3/DO Spaces if configured
 */
async function backupDatabase() {
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
  const backupFileName = `dev-backup-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFileName);

  try {
    // 1. Copy locally
    fs.copyFileSync(dbPath, backupPath);
    console.log(`[BACKUP] Successfully backed up database locally to ${backupPath}`);

    // 2. Keep only last 10 backups locally
    const localFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('dev-backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (localFiles.length > 10) {
      localFiles.slice(10).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f.name));
        console.log(`[BACKUP] Removed old local backup: ${f.name}`);
      });
    }

    // 3. Upload to S3 if configured
    if (isS3Configured()) {
      console.log(`[BACKUP] S3 is configured. Uploading backup to S3...`);
      const s3 = getS3Client();
      if (s3) {
        const fileContent = fs.readFileSync(backupPath);
        const s3Key = `backups/${backupFileName}`;
        
        await s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileContent,
          ContentType: 'application/x-sqlite3',
        }));
        console.log(`[BACKUP] Successfully uploaded database backup to S3: ${s3Key}`);

        // 4. Keep only last 10 backups in S3
        try {
          console.log(`[BACKUP] Cleaning up old backups in S3...`);
          const listResponse = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME,
            Prefix: 'backups/dev-backup-',
          }));

          if (listResponse.Contents && listResponse.Contents.length > 0) {
            // Sort by LastModified (newest first)
            const s3Backups = listResponse.Contents
              .filter(item => item.Key && item.Key.endsWith('.db'))
              .sort((a, b) => {
                const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
                const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
                return dateB - dateA;
              });

            if (s3Backups.length > 10) {
              const objectsToDelete = s3Backups.slice(10).map(item => ({ Key: item.Key }));
              
              await s3.send(new DeleteObjectsCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Delete: {
                  Objects: objectsToDelete,
                  Quiet: true,
                },
              }));
              
              objectsToDelete.forEach(obj => {
                console.log(`[BACKUP] Removed old S3 backup: ${obj.Key}`);
              });
            }
          }
        } catch (s3CleanError) {
          console.error(`[BACKUP] Error during S3 backup cleanup: ${s3CleanError.message}`);
        }
      }
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
