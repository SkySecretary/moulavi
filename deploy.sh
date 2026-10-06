#!/bin/bash

# NuSync - Robust Deployment Script
# implements release versioning and symlinking in MINIMAL connections

# --- Configuration ---
SERVER_IP="64.227.158.41"
SERVER_USER="root"
REMOTE_ROOT="/var/www/umrasystem"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="$REMOTE_ROOT/releases/$TIMESTAMP"
SHARED_PATH="$REMOTE_ROOT/shared"
CURRENT_PATH="$REMOTE_ROOT/current"
SSH_KEY="/Users/awadnejil/.ssh/id_rsa_deploy"
SSH_CMD="ssh -i $SSH_KEY -o ServerAliveInterval=30 -o ServerAliveCountMax=5 -o TCPKeepAlive=yes"

echo "🚀 Starting optimized deployment to $SERVER_IP..."

# Step 0: Local Build to ensure production files are compiled
echo "🔨 Running local builds..."
echo "📦 Building backend..."
(cd backend && npm run build)
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed! Aborting deployment."
    exit 1
fi

echo "📦 Building frontend..."
(cd frontend && npm run build)
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed! Aborting deployment."
    exit 1
fi

echo "📦 Building B2C..."
(cd b2c && npm run build)
if [ $? -ne 0 ]; then
    echo "❌ B2C build failed! Aborting deployment."
    exit 1
fi


# Step 1: Package everything locally
echo "📦 Packaging built release into release.tgz..."
tar -czf release.tgz \
  --exclude="backend/node_modules" \
  --exclude="backend/dev.db*" \
  --exclude="backend/prisma/dev.db*" \
  --exclude="backend/prisma/*.db*" \
  --exclude="backend/backups" \
  --exclude="backend/uploads" \
  --exclude="backend/.env*" \
  --exclude="frontend/node_modules" \
  --exclude="frontend/.env*" \
  --exclude="frontend/.next/cache" \
  --exclude="b2c/node_modules" \
  backend frontend b2c

# Step 2: Create remote release folder and upload release.tgz
echo "📂 Creating remote release directory..."
$SSH_CMD $SERVER_USER@$SERVER_IP "mkdir -p $RELEASE_PATH"

echo "📤 Uploading package..."
rsync -avz -e "$SSH_CMD" release.tgz $SERVER_USER@$SERVER_IP:$RELEASE_PATH/release.tgz

# Clean up local package
rm release.tgz

# Step 3: Finalize and Restart in one final SSH session
echo "⚙️  Finalizing and Restarting..."
$SSH_CMD -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p $SERVER_USER@$SERVER_IP << EOF
    # Safe SQLite WAL flush on active current release before anything else
    if [ -d "$CURRENT_PATH/backend" ]; then
        echo "💾 Flushing active SQLite WAL checkpoint..."
        node -e "
            const { PrismaClient } = require('$CURRENT_PATH/backend/node_modules/@prisma/client');
            const p = new PrismaClient({ datasourceUrl: 'file:$SHARED_PATH/dev.db' });
            p.\\\$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);').then(() => p.\\\$disconnect()).catch(() => {});
        " 2>/dev/null || true
    fi

    # Extract the package on server
    echo "📦 Extracting package on server..."
    cd $RELEASE_PATH
    tar -xzf release.tgz
    rm release.tgz
    rm -f $RELEASE_PATH/backend/prisma/dev.db*

    # Shared Data Initialization
    mkdir -p $SHARED_PATH
    [ ! -f "$SHARED_PATH/dev.db" ] && [ -f "$REMOTE_ROOT/backend/prisma/dev.db" ] && cp "$REMOTE_ROOT/backend/prisma/dev.db" "$SHARED_PATH/dev.db"
    [ -f "$SHARED_PATH/dev.db" ] && cp "$SHARED_PATH/dev.db" "$SHARED_PATH/dev.db.bak_$TIMESTAMP"
    
    if [ ! -d "$SHARED_PATH/uploads" ]; then
        if [ -d "$REMOTE_ROOT/backend/uploads" ]; then
            cp -r "$REMOTE_ROOT/backend/uploads" "$SHARED_PATH/"
        else
            mkdir -p "$SHARED_PATH/uploads"
        fi
    fi

    # Env files
    [ ! -f "$SHARED_PATH/backend.env" ] && [ -f "$REMOTE_ROOT/backend/.env" ] && cp "$REMOTE_ROOT/backend/.env" "$SHARED_PATH/backend.env"
    [ ! -f "$SHARED_PATH/frontend.env" ] && [ -f "$REMOTE_ROOT/frontend/.env" ] && cp "$REMOTE_ROOT/frontend/.env" "$SHARED_PATH/frontend.env"

    # Symlinks
    ln -sf "$SHARED_PATH/dev.db" "$RELEASE_PATH/backend/prisma/dev.db"
    rm -rf "$RELEASE_PATH/backend/uploads"
    ln -sf "$SHARED_PATH/uploads" "$RELEASE_PATH/backend/uploads"
    ln -sf "$SHARED_PATH/backend.env" "$RELEASE_PATH/backend/.env"
    ln -sf "$SHARED_PATH/frontend.env" "$RELEASE_PATH/frontend/.env"

    # Backend Setup
    cd $RELEASE_PATH/backend
    PUPPETEER_SKIP_DOWNLOAD=true npm install --production --silent
    npx puppeteer browsers install chrome || true
    if [ -f "./node_modules/.bin/prisma" ]; then
        ./node_modules/.bin/prisma generate
        ./node_modules/.bin/prisma db push --accept-data-loss
    else
        echo "❌ Local prisma binary not found! Falling back to npx prisma@6..."
        npx prisma@6 generate
        npx prisma@6 db push --accept-data-loss
    fi
    node scripts/seed-indian-airports.js || true

    # Frontend Setup
    cd $RELEASE_PATH/frontend
    npm install --production --silent

    # Atomic switch
    ln -sfn $RELEASE_PATH $CURRENT_PATH

    # Restart PM2
    pm2 delete umrasystem-backend umrasystem-frontend 2>/dev/null || true
    pm2 start $CURRENT_PATH/backend/dist/server.js --name umrasystem-backend --cwd $CURRENT_PATH/backend
    pm2 start npm --name umrasystem-frontend --cwd $CURRENT_PATH/frontend -- start -- -p 3001

    # Cleanup
    cd $REMOTE_ROOT/releases && ls -1t | tail -n +4 | xargs rm -rf 2>/dev/null || true
    
    echo "SUCCESS_MARKER"
EOF

echo "✅ Deployment completed successfully!"
echo "📍 Current Release: $TIMESTAMP"
