#!/bin/bash

# Moulavi ERP - Robust Deployment Script v2
# implements release versioning and symlinking in MINIMAL connections

# --- Configuration ---
SERVER_IP="64.227.158.41"
SERVER_USER="root"
REMOTE_ROOT="/var/www/umrasystem"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="$REMOTE_ROOT/releases/$TIMESTAMP"
SHARED_PATH="$REMOTE_ROOT/shared"
CURRENT_PATH="$REMOTE_ROOT/current"

echo "🚀 Starting optimized deployment to $SERVER_IP..."

# Step 1: Prep and Sync in one SSH ControlMaster context if possible, or just be very efficient.
# We will create the release directory first.
echo "📂 Creating release directory..."
ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=600 $SERVER_USER@$SERVER_IP "mkdir -p $RELEASE_PATH/backend/prisma $RELEASE_PATH/frontend"

# Step 2: Upload everything
echo "📤 Uploading backend and frontend..."
rsync -avz -e "ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p" --exclude "node_modules" --exclude "dist" --exclude "dev.db" --exclude "uploads" --exclude ".env" backend/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/backend/
rsync -avz -e "ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p" backend/dist/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/backend/dist/
rsync -avz -e "ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p" --exclude "node_modules" --exclude ".next" --exclude ".env*" frontend/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/frontend/
rsync -avz -e "ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p" frontend/.next/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/frontend/.next/

# Step 3: Finalize and Restart in one final SSH session
echo "⚙️  Finalizing and Restarting..."
ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p $SERVER_USER@$SERVER_IP << EOF
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
    npm install --production --silent
    npx prisma generate
    npx prisma db push --accept-data-loss

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
    cd $REMOTE_ROOT/releases && ls -1t | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    echo "SUCCESS_MARKER"
EOF

echo "✅ Deployment completed successfully!"
echo "📍 Current Release: $TIMESTAMP"
