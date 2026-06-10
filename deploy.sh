#!/bin/bash

# Moulavi ERP - Robust Deployment Script
# implements release versioning and symlinking

# --- Configuration ---
SERVER_IP="64.227.158.41"
SERVER_USER="root"
REMOTE_ROOT="/var/www/umrasystem"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="$REMOTE_ROOT/releases/$TIMESTAMP"
SHARED_PATH="$REMOTE_ROOT/shared"
CURRENT_PATH="$REMOTE_ROOT/current"

echo "🚀 Starting deployment to $SERVER_IP..."

# --- 1. Server Preparation ---
echo "📂 Preparing server directories..."
ssh $SERVER_USER@$SERVER_IP << EOF
    mkdir -p $REMOTE_ROOT/releases $SHARED_PATH
    
    # Initialize shared database if not exists
    if [ ! -f "$SHARED_PATH/dev.db" ]; then
        if [ -f "$REMOTE_ROOT/backend/prisma/dev.db" ]; then
            echo "📦 Migrating existing database to shared storage..."
            cp "$REMOTE_ROOT/backend/prisma/dev.db" "$SHARED_PATH/dev.db"
        fi
    fi

    # 💾 Take a backup of the shared DB before every deployment
    if [ -f "$SHARED_PATH/dev.db" ]; then
        echo "💾 Backing up shared database..."
        cp "$SHARED_PATH/dev.db" "$SHARED_PATH/dev.db.bak_$TIMESTAMP"
    fi

    # Initialize shared uploads if not exists
    if [ ! -d "$SHARED_PATH/uploads" ]; then
        if [ -d "$REMOTE_ROOT/backend/uploads" ]; then
            echo "📂 Migrating existing uploads to shared storage..."
            cp -r "$REMOTE_ROOT/backend/uploads" "$SHARED_PATH/"
        else
            mkdir -p "$SHARED_PATH/uploads"
        fi
    fi

    # Initialize shared .env files if not exists
    if [ ! -f "$SHARED_PATH/backend.env" ] && [ -f "$REMOTE_ROOT/backend/.env" ]; then
        cp "$REMOTE_ROOT/backend/.env" "$SHARED_PATH/backend.env"
    fi
    if [ ! -f "$SHARED_PATH/frontend.env" ] && [ -f "$REMOTE_ROOT/frontend/.env" ]; then
        cp "$REMOTE_ROOT/frontend/.env" "$SHARED_PATH/frontend.env"
    fi

    mkdir -p $RELEASE_PATH/backend/prisma $RELEASE_PATH/frontend
EOF

# --- 2. Upload Code ---
echo "📤 Uploading backend..."
rsync -avz --exclude "node_modules" --exclude "dist" --exclude "dev.db" --exclude "uploads" --exclude ".env" \
    backend/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/backend/

# Upload compiled backend (dist)
rsync -avz backend/dist/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/backend/dist/

echo "📤 Uploading frontend..."
rsync -avz --exclude "node_modules" --exclude ".next" --exclude ".env*" \
    frontend/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/frontend/

# Upload compiled frontend (.next)
rsync -avz frontend/.next/ $SERVER_USER@$SERVER_IP:$RELEASE_PATH/frontend/.next/

# --- 3. Finalize Release & Atomic Switch ---
echo "⚙️ Finalizing release on server..."
ssh $SERVER_USER@$SERVER_IP << EOF
    # Symlink shared data
    ln -sf "$SHARED_PATH/dev.db" "$RELEASE_PATH/backend/prisma/dev.db"
    rm -rf "$RELEASE_PATH/backend/uploads"
    ln -sf "$SHARED_PATH/uploads" "$RELEASE_PATH/backend/uploads"
    
    # Symlink shared env
    ln -sf "$SHARED_PATH/backend.env" "$RELEASE_PATH/backend/.env"
    ln -sf "$SHARED_PATH/frontend.env" "$RELEASE_PATH/frontend/.env"

    # Install dependencies and update schema
    echo "📦 Installing backend dependencies..."
    cd $RELEASE_PATH/backend
    npm install --production --silent
    npx prisma generate
    
    echo "🗄️  Updating database schema (adding new fields)..."
    npx prisma db push --accept-data-loss

    echo "📦 Installing frontend dependencies..."
    cd $RELEASE_PATH/frontend
    npm install --production --silent

    # Atomic switch
    echo "🔄 Switching to new release..."
    ln -sfn $RELEASE_PATH $CURRENT_PATH

    # Restart Services
    echo "🔄 Restarting PM2 services..."
    pm2 delete umrasystem-backend umrasystem-frontend 2>/dev/null || true
    
    pm2 start $CURRENT_PATH/backend/dist/server.js --name umrasystem-backend --cwd $CURRENT_PATH/backend
    pm2 start npm --name umrasystem-frontend --cwd $CURRENT_PATH/frontend -- start -- -p 3001

    echo "🧹 Cleaning up old releases (keeping last 5)..."
    cd $REMOTE_ROOT/releases && ls -1t | tail -n +6 | xargs rm -rf 2>/dev/null || true
EOF

echo "✅ Deployment completed successfully!"
echo "📍 Current Release: $TIMESTAMP"
echo "🔗 URL: https://umra.moulavi.in"
