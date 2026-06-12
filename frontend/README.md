# NuSync Frontend

Modern, responsive frontend for the NuSync system built with Next.js 14 and shadcn/ui.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with API URL
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open browser:
   ```
   http://localhost:3000
   ```

## Features

- **Modern UI**: Built with shadcn/ui and Tailwind CSS
- **Type-Safe**: Full TypeScript support
- **Form Validation**: react-hook-form + zod
- **Real-time Notifications**: Sonner toast notifications
- **Responsive Design**: Mobile-first approach
- **Role-Based UI**: Different dashboards for admin, staff, and party

## Routes

### Public
- `/` - Unified login page (redirects based on role)

### Protected (Admin/Staff)
- `/dashboard` - Main dashboard
- `/dashboard/masters/*` - Master data management pages
- `/dashboard/services/*` - Service management pages

### Protected (Party)
- `/party/dashboard` - Party dashboard
- `/party/umrah-visa` - Umrah visa form

## Components

### UI Components (shadcn/ui)
- Button
- Input
- Label
- Card
- Select
- And more...

### Custom Components
- `Navbar` - Navigation bar with user info
- `CreatePartyDialog` - Party creation modal
- `PartyList` - Party listing with search and pagination

## API Integration

API client is configured in `lib/api.ts` with:
- Automatic token refresh
- Error handling
- Request/response interceptors

## Styling

Using Tailwind CSS with custom theme configuration in `tailwind.config.ts`.

## Building for Production

```bash
npm run build
npm start
```

## Deployment

Can be deployed to:
- Vercel (recommended)
- Netlify
- Any Node.js hosting

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable to your production API URL.

