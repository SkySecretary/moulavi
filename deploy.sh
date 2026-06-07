#!/bin/bash
npm run build:backend
npm run build:frontend
rsync -avz --exclude "node_modules" --exclude "*.db*" --exclude "uploads" backend root@64.227.158.41:/var/www/umrasystem/
rsync -avz --exclude "node_modules" frontend root@64.227.158.41:/var/www/umrasystem/
ssh root@64.227.158.41 "pm2 restart umrasystem-backend umrasystem-frontend"
