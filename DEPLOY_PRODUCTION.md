# Moulavi ERP Production Deployment Script (New Domain)
# URL: https://umra.moulavi.in
# Server: 64.227.158.41

## 1. Sync Frontend Build
# Run this from your local project root:
# rsync -avz --exclude "node_modules" frontend/.next root@64.227.158.41:/var/www/umrasystem/frontend/
# rsync -avz frontend/public root@64.227.158.41:/var/www/umrasystem/frontend/
# rsync -avz backend root@64.227.158.41:/var/www/umrasystem/

## 2. Server Side Configuration (Run as root on server)

# A. Apache Configuration
cat <<EOF > /etc/apache2/sites-available/umra.moulavi.in.conf
<VirtualHost *:80>
    ServerName umra.moulavi.in
    ServerAlias www.umra.moulavi.in
    Redirect permanent / https://umra.moulavi.in/
</VirtualHost>
EOF

a2ensite umra.moulavi.in.conf
systemctl reload apache2

# B. SSL Configuration (Certbot)
# certbot --apache -d umra.moulavi.in -d www.umra.moulavi.in

# C. Nginx Configuration
cat <<EOF > /etc/nginx/sites-available/umra.moulavi.in
server {
    listen 81;
    server_name umra.moulavi.in;
    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:5001/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

ln -s /etc/nginx/sites-available/umra.moulavi.in /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

## 3. Application Restart
# pm2 restart umrasystem-frontend
# pm2 restart umrasystem-backend
