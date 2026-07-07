# NuSync - Complete Setup Guide

This guide will help you set up the NuSync system from scratch.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js v18+ installed (`node --version`)
- [ ] SQLite3 CLI installed (`sqlite3 --version`)
- [ ] npm or yarn package manager
- [ ] A code editor (VS Code recommended)
- [ ] Git (optional, for version control)

## Step-by-Step Setup

### 1. Database Setup

NuSync uses **SQLite** for development and production data storage. There is no need to run or configure a standalone database server.

To initialize your local database:
1. Ensure the SQLite CLI tool is installed.
2. Navigate to the `backend` folder and run the restore script:
   ```bash
   cd backend
   npm run db:restore
   ```
   This will clean-import the database seed from `backend/prisma/seed.sql` into `backend/prisma/dev.db`.

### 2. Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   This will install:
   - Express.js and middleware
   - PostgreSQL driver
   - JWT libraries
   - bcrypt for password hashing
   - Nodemailer for emails
   - And more...

3. **Configure environment variables**
   ```bash
   # Copy example file
   cp .env.example .env
   
   # Edit .env with your preferred editor
   # Windows: notepad .env
   # Mac/Linux: nano .env
   ```

4. **Update `.env` file with your settings:**
   ```env
   PORT=5000
   NODE_ENV=development
      # Database Configuration (Prisma SQLite)
    DATABASE_URL="file:./dev.db"
   
   # JWT Secrets (generate random strings)
   JWT_SECRET=generate_a_long_random_string_here_min_32_chars
   JWT_REFRESH_SECRET=another_long_random_string_here_min_32_chars
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Email Configuration (Gmail example)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=your_gmail_app_password
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

5. **Generate strong JWT secrets**
   ```bash
   # On Mac/Linux
   openssl rand -base64 32
   
   # On Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   
   # Or use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

6. **Set up Gmail App Password (for email notifications)**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Go to App Passwords
   - Create new app password for "Mail"
   - Copy the 16-character password
   - Use it in `SMTP_PASSWORD`

7. **Generate Prisma Client**
   ```bash
   # Generate Prisma client library
   npx prisma generate
   
   # Optional: Open Prisma Studio to view database
   npx prisma studio
   ```
   
   *Note: Since you already restored the database using `npm run db:restore` in Step 1, the database schema and data are already fully configured.*

8. **Create initial admin user**
   ```bash
   # Run the admin creation script
   npm run create-admin
   ```
   
   You should see:
   ```
   ✅ Admin user created successfully!
   Email: admin@moulavi.com
   Password: Admin@123
   ```

9. **Start the backend server**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   🚀 Server is running on port 5000
   📝 Environment: development
   🌐 Frontend URL: http://localhost:3000
   ```

10. **Test the backend**
   - Open a new terminal
   - Test health endpoint:
     ```bash
     curl http://localhost:5000/health
     ```
   - You should see: `{"status":"OK","timestamp":"..."}`

### 3. Frontend Setup

1. **Open a new terminal window**

2. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
   
   This will install:
   - Next.js and React
   - shadcn/ui components
   - Tailwind CSS
   - Form libraries
   - And more...

4. **Configure environment variables**
   ```bash
   # Create .env.local file
   echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
   
   # Or manually create .env.local with:
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

5. **Start the frontend server**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   ready - started server on 0.0.0.0:3000, url: http://localhost:3000
   ```

6. **Open your browser**
   - Navigate to: http://localhost:3000
   - You should see the NuSync home page

### 4. First Login & Testing

1. **Login as Admin**
   - Click "Admin Login" on the home page
   - Email: `admin@moulavi.com`
   - Password: `Admin@123`
   - You should be redirected to the dashboard

2. **Create a Party**
   - Click "Add Party" button
   - Fill in the form:
     - Party Name: `Test Client`
     - Email: `test@example.com`
     - Customer Type: `Direct`
     - Currency: `INR`
     - Check "Create login account for party"
   - Click "Create Party"
   - Check the email inbox for credentials

3. **Login as Party**
   - Logout from admin account
   - Go to "Party Login"
   - Use the credentials sent via email
   - You should see the party dashboard

4. **Submit Umrah Visa Request**
   - Click "Apply Now" on Umrah Visa card
   - Fill in all required information
   - Upload documents (optional)
   - Click "Submit Application"
   - You should see success message

5. **View Request as Admin**
   - Logout and login as admin
   - You should see the new service request in the dashboard

## Troubleshooting

### Backend Issues

**"Cannot connect to database / dev.db not found"**
- Ensure `DATABASE_URL` is set to `"file:./dev.db"` in `backend/.env`
- Ensure you have run `npm run db:restore` inside the `backend` folder to generate the SQLite database file
- Check filesystem permissions on the `backend/prisma/` directory

**"Prisma generation / client errors"**
- Run `npx prisma generate` in the `backend` folder to rebuild client mappings

**"Port 5000 already in use"**
- Change `PORT` in `.env` to another port (e.g., 5001)
- Update frontend `.env.local` accordingly

**"JWT secret error"**
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set in `.env`
- They should be long random strings (32+ characters)

### Frontend Issues

**"API connection failed"**
- Ensure backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is configured correctly in backend

**"Module not found"**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

### Email Issues

**"Email not sent"**
- For Gmail, ensure you're using App Password, not regular password
- Check SMTP settings in `.env`
- Verify email address is correct

## Production Deployment

### Backend Production Checklist

- [ ] Change admin password
- [ ] Use strong JWT secrets
- [ ] Set `NODE_ENV=production`
- [ ] Use SQLite database (dev.db) on persistent volume
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up SSL for database connection
- [ ] Use environment-specific SMTP credentials
- [ ] Set up monitoring and logging
- [ ] Configure backups

### Frontend Production Checklist

- [ ] Build the application: `npm run build`
- [ ] Update `NEXT_PUBLIC_API_URL` to production API
- [ ] Deploy to Vercel/Netlify
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Set up error tracking (Sentry)

## Next Steps

After successful setup:

1. **Customize the system**
   - Update branding and colors
   - Modify email templates
   - Add more service types

2. **Security hardening**
   - Implement password complexity requirements
   - Add 2FA for admin accounts
   - Set up audit logging

3. **Feature expansion**
   - Add more service types
   - Implement payment processing
   - Create reports and analytics

## Support

For issues or questions:
- Check the main README.md
- Review the code documentation
- Contact the development team

---

**Congratulations! Your NuSync system is now running! 🎉**

