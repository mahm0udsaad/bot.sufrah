# Media Upload Setup Guide

This document explains how media uploads work in the Sufrah Dashboard and how to set up the required infrastructure.

## Architecture Overview

The media upload flow consists of three steps:

```
┌──────────────┐     1. Upload File      ┌──────────────┐
│   Dashboard  │ ──────────────────────> │  MinIO/S3    │
│   (Browser)  │                         │   Storage    │
└──────────────┘                         └──────────────┘
       │                                        │
       │ 2. Send Media URL                     │ Returns URL
       │                                        │
       ▼                                        ▼
┌──────────────┐     3. Send WhatsApp    ┌──────────────┐
│   Bot API    │ ──────────────────────> │   Customer   │
│   Service    │                         │  (WhatsApp)  │
└──────────────┘                         └──────────────┘
```

### Step-by-Step Flow

1. **User selects file** in MessageThread component
2. **File is uploaded** to MinIO storage via `/api/upload`
3. **MinIO returns a public URL** (e.g., `http://localhost:9000/uploads/uuid-file.jpg`)
4. **Dashboard sends URL** to `/api/conversations/{id}/send-media`
5. **Bot API receives URL** and sends it to customer via WhatsApp

## MinIO Setup (Required)

MinIO is an S3-compatible object storage service. You need it running locally for file uploads to work.

### Option 1: Docker Compose (Recommended)

We've created a docker-compose file for easy setup:

```bash
# Start MinIO
docker compose -f docker-compose.minio.yml up -d

# Check if it's running
docker ps | grep sufrah-minio

# View logs
docker compose -f docker-compose.minio.yml logs -f
```

MinIO will be available at:
- **API**: http://localhost:9000
- **Console**: http://localhost:9001
- **Username**: minioadmin
- **Password**: minioadmin123

### Option 2: Download Binary

```bash
# macOS
brew install minio/stable/minio
minio server /tmp/minio-data --console-address ":9001"

# Linux
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server /tmp/minio-data --console-address ":9001"
```

### Option 3: Production Setup

For production, use a proper S3-compatible service:

**AWS S3:**
```bash
MINIO_ENDPOINT=https://s3.amazonaws.com
MINIO_REGION=us-east-1
MINIO_ROOT_USER=your-aws-access-key
MINIO_ROOT_PASSWORD=your-aws-secret-key
MINIO_BUCKET=sufrah-uploads
```

**DigitalOcean Spaces:**
```bash
MINIO_ENDPOINT=https://nyc3.digitaloceanspaces.com
MINIO_REGION=us-east-1
MINIO_ROOT_USER=your-spaces-key
MINIO_ROOT_PASSWORD=your-spaces-secret
MINIO_BUCKET=sufrah-uploads
```

**Wasabi:**
```bash
MINIO_ENDPOINT=https://s3.wasabisys.com
MINIO_REGION=us-east-1
MINIO_ROOT_USER=your-wasabi-key
MINIO_ROOT_PASSWORD=your-wasabi-secret
MINIO_BUCKET=sufrah-uploads
```

## Environment Configuration

Add these to your `.env.local`:

```bash
# MinIO Configuration (Development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET=uploads
MINIO_ENABLED=true

# Bot API Configuration (Required for sending media)
BOT_API_URL=https://bot.sufrah.sa/api
BOT_API_TOKEN=your-bot-api-token
DASHBOARD_PAT=your-personal-access-token
```

## API Endpoints

### 1. Upload File to Storage

**Endpoint:** `POST /api/upload`

**Authentication:** Cookie-based session or JWT

**Request (multipart/form-data):**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: user-phone=+966501234567" \
  -F "file=@/path/to/image.jpg" \
  -F "fileName=image.jpg"
```

**Response (200):**
```json
{
  "success": true,
  "url": "http://localhost:9000/uploads/uuid-image.jpg"
}
```

**Error Responses:**
- `401`: Unauthorized (no valid session)
- `400`: File is required
- `500`: MinIO not running or misconfigured

### 2. Send Media to Customer

**Endpoint:** `POST /api/conversations/{conversationId}/send-media`

**Authentication:** Bearer token + X-Restaurant-Id header

**Request (JSON):**
```bash
curl -X POST http://localhost:3000/api/conversations/+966501234567/send-media \
  -H "Authorization: Bearer ${DASHBOARD_PAT}" \
  -H "X-Restaurant-Id: ${RESTAURANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "http://localhost:9000/uploads/uuid-image.jpg",
    "caption": "Check out our special!",
    "mediaType": "image"
  }'
```

**Response (200):**
```json
{
  "message": {
    "id": "msg-123",
    "conversation_id": "+966501234567",
    "content": "Check out our special!",
    "media_url": "http://localhost:9000/uploads/uuid-image.jpg",
    "message_type": "image",
    "timestamp": "2025-10-20T10:30:00Z"
  }
}
```

## File Type Support

### Supported Types

| Type | MIME Types | Max Size | Extensions |
|------|-----------|----------|------------|
| **Images** | image/jpeg, image/png, image/gif, image/webp | 5 MB | .jpg, .png, .gif, .webp |
| **Documents** | application/pdf, application/msword, .docx | 16 MB | .pdf, .doc, .docx |
| **Text** | text/plain | 16 MB | .txt |
| **Audio** | audio/*, audio/mpeg, audio/ogg | 16 MB | .mp3, .ogg, .m4a |
| **Video** | video/*, video/mp4 | 16 MB | .mp4, .mov |

### Validation

Validation happens in two places:

1. **Client-side** (`MessageThread.tsx`):
   ```typescript
   const allowedTypes = [
     "image/jpeg", "image/png", "image/gif", "image/webp",
     "application/pdf", "application/msword",
     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
     "text/plain"
   ]
   if (file.size > 16 * 1024 * 1024) {
     toast.error("حجم الملف كبير جداً. الحد الأقصى 16 ميجابايت")
   }
   ```

2. **Server-side** (`/api/upload`): Additional validation can be added as needed

## Troubleshooting

### Error: "MinIO bucket check failed"

**Symptoms:**
```
Upload API error: Error: Expected closing tag 'hr'
MinIO bucket check failed: Check if MinIO is running at http://localhost:9000
```

**Solutions:**
1. Start MinIO:
   ```bash
   docker compose -f docker-compose.minio.yml up -d
   ```

2. Verify MinIO is running:
   ```bash
   curl http://localhost:9000/minio/health/live
   # Should return: OK
   ```

3. Check environment variables:
   ```bash
   echo $MINIO_ENDPOINT
   echo $MINIO_ENABLED
   ```

### Error: "خدمة رفع الملفات غير مفعلة"

**Cause:** `MINIO_ENABLED` is set to `false`

**Solution:**
```bash
# In .env.local
MINIO_ENABLED=true
```

### Error: "فشل رفع الملف"

**Possible causes:**
1. Wrong credentials
2. Bucket doesn't exist and can't be created
3. Network issue

**Debug steps:**
```bash
# Check MinIO logs
docker compose -f docker-compose.minio.yml logs -f

# Test connection
aws s3 --endpoint-url http://localhost:9000 ls
# (Install AWS CLI: brew install awscli)

# Create bucket manually
aws s3 --endpoint-url http://localhost:9000 mb s3://uploads
```

### Files upload but URLs are not accessible

**Cause:** Bucket policy doesn't allow public access

**Solution:** Set bucket policy in MinIO Console (http://localhost:9001):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::uploads/*"]
    }
  ]
}
```

Or use the MinIO client:
```bash
mc alias set local http://localhost:9000 minioadmin minioadmin123
mc anonymous set download local/uploads
```

## Component Integration

### MessageThread Component

The `MessageThread` component handles the UI for file uploads:

```typescript
const handleSendMedia = async (file: File, caption?: string) => {
  try {
    setUploading(true)
    
    // 1. Upload to MinIO
    await onSendMedia(selectedFile, messageText || undefined)
    
    // 2. Clear state
    setSelectedFile(null)
    setMessageText("")
    
    toast.success("تم إرسال الملف بنجاح")
  } catch (error) {
    console.error("Failed to send media:", error)
    toast.error("فشل إرسال الملف")
  } finally {
    setUploading(false)
  }
}
```

### BotWebSocket Context

The context handles the API calls:

```typescript
const sendMedia = async (conversationId: string, file: File, caption?: string) => {
  // 1. Upload file to storage
  const uploadForm = new FormData()
  uploadForm.append("file", file)
  uploadForm.append("fileName", file.name)
  
  const uploadRes = await fetch(`/api/upload`, { 
    method: "POST", 
    body: uploadForm 
  })
  
  if (!uploadRes.ok) {
    const error = await uploadRes.json()
    throw new Error(error.message || "فشل رفع الملف")
  }
  
  const { url: mediaUrl } = await uploadRes.json()
  
  // 2. Send media URL to conversation
  const res = await fetch(
    `/api/conversations/${conversationId}/send-media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaUrl, caption })
    }
  )
  
  if (!res.ok) {
    throw new Error("فشل إرسال الملف")
  }
}
```

## Production Checklist

Before deploying to production:

- [ ] Set up production S3/MinIO endpoint
- [ ] Configure proper access credentials
- [ ] Set up CORS policy if needed
- [ ] Configure CDN (CloudFront, CloudFlare) for media URLs
- [ ] Set up bucket lifecycle policies for old files
- [ ] Enable encryption at rest
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Test file uploads from production domain
- [ ] Verify WhatsApp can access media URLs
- [ ] Set appropriate `MINIO_ENDPOINT` (public HTTPS URL)

## References

- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [WhatsApp Media Requirements](https://developers.facebook.com/docs/whatsapp/api/media/)

