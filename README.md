# Sufrah Dashboard

A comprehensive dashboard for managing WhatsApp bot conversations, orders, ratings, and media for restaurants using the Sufrah platform.

## Quick Links

- **[Quick Start Guide](./QUICK_START.md)** - Get media uploads working in 5 minutes
- **[Media Upload Setup](./MEDIA_UPLOAD_SETUP.md)** - Complete media upload documentation
- **[Media Upload Fix Summary](./MEDIA_UPLOAD_FIX_SUMMARY.md)** - Recent fixes and improvements
- **[Admin Setup](./ADMIN_SETUP.md)** - Admin user setup
- **[Database Queries](./DATABASE_QUERIES.md)** - Database query examples
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Project implementation details

## Features

- 💬 **Real-time Chat Interface** - Manage customer conversations with WebSocket support
- 🤖 **Bot Management** - Enable/disable bot responses per conversation
- 📦 **Order Tracking** - View and manage customer orders
- ⭐ **Ratings Dashboard** - Monitor customer satisfaction
- 📤 **Media Uploads** - Send images, documents, audio, and video via WhatsApp
- 📊 **Analytics** - Usage statistics and insights
- 📋 **Templates** - Manage WhatsApp message templates
- 🌐 **Internationalization** - Arabic and English support

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Docker (for MinIO/file uploads)
- PostgreSQL or SQLite (for database)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd sufrah-dashboard

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up database
pnpm prisma generate
pnpm prisma migrate dev

# Start MinIO (for file uploads)
./scripts/start-minio.sh
# Or manually:
docker compose -f docker-compose.minio.yml up -d

# Start development server
pnpm dev
```

Visit http://localhost:3000

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication
JWT_SECRET="your-secret-key-change-in-production"

# Bot API
BOT_API_URL="https://bot.sufrah.sa/api"
BOT_API_TOKEN="your-bot-api-token"
DASHBOARD_PAT="your-personal-access-token"

# MinIO / S3 Storage (for media uploads)
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin123"
MINIO_BUCKET="uploads"
MINIO_ENABLED="true"

# Twilio (for WhatsApp)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
```

## Media Uploads Setup

Media uploads require MinIO or S3-compatible storage. For quick setup:

```bash
# Start MinIO locally
./scripts/start-minio.sh
```

**Need help?** See the [Quick Start Guide](./QUICK_START.md)

**Production deployment?** See [Media Upload Setup](./MEDIA_UPLOAD_SETUP.md)

## Project Structure

```
sufrah-dashboard/
├── app/                    # Next.js app router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── conversations/ # Chat and messaging APIs
│   │   ├── upload/        # File upload API
│   │   ├── dashboard/     # Dashboard data APIs
│   │   └── ...
│   ├── chats/             # Chat interface page
│   ├── orders/            # Orders management page
│   ├── ratings/           # Ratings dashboard page
│   └── templates/         # Template management page
├── components/            # React components
│   ├── chat/             # Chat interface components
│   ├── ui/               # UI components (shadcn/ui)
│   └── ...
├── contexts/             # React contexts
│   ├── bot-websocket-context.tsx  # WebSocket connection
│   ├── chat-context.tsx           # Chat state
│   └── i18n-context.tsx           # Internationalization
├── lib/                  # Utilities and helpers
│   ├── minio.ts         # MinIO/S3 client
│   ├── db.ts            # Database operations
│   ├── i18n/            # Internationalization
│   └── ...
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── scripts/             # Utility scripts
└── docs/                # Additional documentation
```

## Key Technologies

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS, shadcn/ui
- **Database:** Prisma ORM with SQLite/PostgreSQL
- **Real-time:** WebSocket connections
- **Storage:** MinIO / S3-compatible object storage
- **Authentication:** JWT-based
- **i18n:** Custom internationalization with Arabic and English

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/send` - Send text message
- `POST /api/conversations/:id/send-media` - Send media message
- `POST /api/conversations/:id/toggle-bot` - Toggle bot for conversation

### Media
- `POST /api/upload` - Upload file to storage

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/usage` - Get usage data
- `GET /api/dashboard/templates` - Get message templates

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details

### Ratings
- `GET /api/ratings` - List ratings
- `GET /api/ratings/stats` - Get rating statistics

For detailed API documentation, see individual endpoint files in `app/api/`.

## Development

```bash
# Start development server
pnpm dev

# Start MinIO (for file uploads)
docker compose -f docker-compose.minio.yml up -d

# Run linting
pnpm lint

# Format code
pnpm format

# Build for production
pnpm build

# Start production server
pnpm start
```

## Database

```bash
# Generate Prisma client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name your-migration-name

# Apply migrations
pnpm prisma migrate deploy

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Reset database (⚠️ deletes all data)
pnpm prisma migrate reset
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Important:** Set up production MinIO/S3 before deploying. See [Media Upload Setup](./MEDIA_UPLOAD_SETUP.md).

### Docker

```bash
# Build image
docker build -t sufrah-dashboard .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e BOT_API_URL="..." \
  -e MINIO_ENDPOINT="..." \
  sufrah-dashboard
```

### Self-Hosted

```bash
# Build
pnpm build

# Start (uses .env.local)
pnpm start

# Or with PM2
pm2 start pnpm --name sufrah-dashboard -- start
```

## Troubleshooting

### Media Uploads Not Working

See the [Quick Start Guide](./QUICK_START.md) for detailed troubleshooting steps.

Quick fix:
```bash
# Start MinIO
docker compose -f docker-compose.minio.yml up -d

# Verify it's running
curl http://localhost:9000/minio/health/live
```

### Database Errors

```bash
# Regenerate Prisma client
pnpm prisma generate

# Check migrations
pnpm prisma migrate status

# Reset and reseed (⚠️ deletes data)
pnpm prisma migrate reset
```

### WebSocket Connection Issues

Check that:
- `BOT_API_URL` is set correctly
- Bot API is running and accessible
- Authentication tokens are valid

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild
pnpm build
```

## Documentation

- **[Quick Start](./QUICK_START.md)** - Get started in 5 minutes
- **[Media Upload Setup](./MEDIA_UPLOAD_SETUP.md)** - Complete media upload guide
- **[Media Upload Fix Summary](./MEDIA_UPLOAD_FIX_SUMMARY.md)** - Recent improvements
- **[Admin Setup](./ADMIN_SETUP.md)** - Set up admin users
- **[Database Queries](./DATABASE_QUERIES.md)** - Common database queries
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[docs/](./docs/)** - Additional documentation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and questions:
- Check the [troubleshooting guides](./QUICK_START.md#troubleshooting)
- Review the [documentation](./docs/)
- Open an issue on GitHub

## License

[Your License Here]

---

**Made with ❤️ for Sufrah**
