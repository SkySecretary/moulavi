# NuSync Backend

RESTful API backend for the NuSync system built with Express.js and TypeScript.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Create database:
   ```bash
   createdb moulavi_erp
   ```

4. Run migrations:
   ```bash
   npm run migrate
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### Auth
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

#### Parties
- `POST /parties` - Create party
- `GET /parties` - List parties
- `GET /parties/:id` - Get party
- `PUT /parties/:id` - Update party
- `DELETE /parties/:id` - Delete party

#### Services
- `POST /services/umrah-visa` - Create Umrah visa request
- `GET /services` - List services
- `GET /services/:id` - Get service
- `PATCH /services/:id/status` - Update status

#### Upload
- `POST /upload/service/:serviceId` - Upload document
- `GET /upload/:documentId` - Download document
- `DELETE /upload/:documentId` - Delete document

## Database Schema

See `src/database/schema.sql` for complete schema definition.

## Environment Variables

See `.env.example` for all required environment variables.

## Default Admin Credentials

- Email: admin@moulavi.com
- Password: Admin@123

⚠️ Change these in production!

