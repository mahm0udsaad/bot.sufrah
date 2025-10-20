# Quick Start Guide - Media Uploads

This guide will help you get media uploads working in 5 minutes.

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Node.js and pnpm installed
- Dashboard already set up and running

## Step 1: Start MinIO

MinIO is required for file uploads. We've made it easy:

```bash
# Make the script executable (first time only)
chmod +x scripts/start-minio.sh

# Start MinIO
./scripts/start-minio.sh
```

Or manually with Docker Compose:

```bash
docker compose -f docker-compose.minio.yml up -d
```

**Verify it's running:**
```bash
curl http://localhost:9000/minio/health/live
# Should return: OK
```

## Step 2: Configure Environment

Create or update your `.env.local` file:

```bash
# MinIO Configuration (for local development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET=uploads
MINIO_ENABLED=true

# Bot API Configuration (required)
BOT_API_URL=https://bot.sufrah.sa/api
BOT_API_TOKEN=your-bot-api-token
DASHBOARD_PAT=your-personal-access-token
```

## Step 3: Restart Dashboard

```bash
# Stop the dev server (Ctrl+C)
# Then start it again
pnpm dev
```

## Step 4: Test It!

1. Open the dashboard: http://localhost:3000
2. Go to **Chats** page
3. Select a conversation
4. Click the 📎 attachment icon
5. Select an image or document
6. Add optional caption
7. Click send!

**Expected behavior:**
- ✅ File uploads to MinIO
- ✅ MinIO returns a URL
- ✅ URL is sent to customer via WhatsApp
- ✅ Message appears in chat thread

## Troubleshooting

### Error: "خدمة التخزين غير متوفرة"

**MinIO is not running.**

```bash
# Check if MinIO is running
docker ps | grep minio

# If not, start it
docker compose -f docker-compose.minio.yml up -d

# Check logs
docker compose -f docker-compose.minio.yml logs -f
```

### Error: "خدمة رفع الملفات غير مفعلة"

**MinIO is disabled in environment.**

```bash
# Add to .env.local
MINIO_ENABLED=true

# Restart the dev server
```

### Files upload but can't be accessed

**Bucket needs public read policy.**

Visit MinIO Console: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

Then:
1. Go to **Buckets** → **uploads**
2. Click **Access** tab
3. Set policy to **public** or **download**

Or use command line:
```bash
# Install MinIO Client
brew install minio/stable/mc

# Configure
mc alias set local http://localhost:9000 minioadmin minioadmin123

# Set public access
mc anonymous set download local/uploads
```

### Want to check uploaded files?

Visit MinIO Console: http://localhost:9001

Or use AWS CLI:
```bash
# Install AWS CLI
brew install awscli

# List files
aws s3 --endpoint-url http://localhost:9000 ls s3://uploads/
```

## What's Next?

### For Development
You're all set! The current setup works great for development.

### For Production

You'll need a production-grade storage service. See [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) for:

- **AWS S3** setup
- **DigitalOcean Spaces** setup
- **Wasabi** setup
- CDN configuration
- Security best practices
- Monitoring and backups

### API Integration

If you're building a custom integration, see:
- [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) - Complete API documentation
- Your provided guide - Bot API integration details

## Architecture Overview

```
User uploads file in MessageThread.tsx
        ↓
File sent to /api/upload
        ↓
Uploaded to MinIO storage
        ↓
MinIO returns public URL
        ↓
URL sent to /api/conversations/{id}/send-media
        ↓
Dashboard forwards to Bot API
        ↓
Bot API sends media to WhatsApp
        ↓
Customer receives media
```

## File Size Limits

| Media Type | Max Size |
|------------|----------|
| Images | 5 MB |
| Documents, Audio, Video | 16 MB |

These are WhatsApp's limits. The dashboard enforces them client-side.

## Supported File Types

- **Images:** JPEG, PNG, GIF, WebP
- **Documents:** PDF, DOC, DOCX, TXT
- **Audio:** MP3, OGG, M4A
- **Video:** MP4, MOV

## Need Help?

1. Check [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) for detailed docs
2. Check server logs: `pnpm dev` output
3. Check MinIO logs: `docker compose -f docker-compose.minio.yml logs -f`
4. Check browser console for client-side errors

## Useful Commands

```bash
# Start MinIO
docker compose -f docker-compose.minio.yml up -d

# Stop MinIO
docker compose -f docker-compose.minio.yml down

# View MinIO logs
docker compose -f docker-compose.minio.yml logs -f

# Restart MinIO
docker compose -f docker-compose.minio.yml restart

# Remove MinIO (keeps data)
docker compose -f docker-compose.minio.yml down

# Remove MinIO and data
docker compose -f docker-compose.minio.yml down -v
```

---

**That's it!** You should now have working media uploads. 🎉

