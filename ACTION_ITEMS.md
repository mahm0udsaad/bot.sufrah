# Action Items - Media Upload Setup

## ✅ What's Been Fixed

1. **Enhanced MinIO Configuration**
   - Better error handling
   - Detailed logging
   - Fallback to local development setup
   - Clear error messages in Arabic

2. **Improved Upload API**
   - User-friendly error messages
   - Better error categorization
   - Development mode debugging info

3. **Updated Send-Media Endpoint**
   - Now properly rejects direct file uploads (per API spec)
   - Only accepts mediaUrl (not raw files)
   - Clear guidance on correct usage

4. **Enhanced WebSocket Context**
   - Better error handling in sendMedia
   - Parse and display server errors
   - Graceful fallback

5. **Created Comprehensive Documentation**
   - QUICK_START.md - 5-minute setup guide
   - MEDIA_UPLOAD_SETUP.md - Complete technical docs
   - MEDIA_UPLOAD_FIX_SUMMARY.md - Detailed changelog
   - Updated README.md with quick links

6. **Added MinIO Docker Setup**
   - docker-compose.minio.yml for easy setup
   - scripts/start-minio.sh helper script
   - Default credentials configured

---

## 🚨 What You Need to Do

### 1. Install Docker (Required for File Uploads)

**On macOS:**
```bash
# Option A: Docker Desktop (recommended)
# Download from: https://www.docker.com/products/docker-desktop/

# Option B: Using Homebrew
brew install --cask docker
```

**After installation:**
1. Open Docker Desktop app
2. Wait for it to start (whale icon in menu bar)
3. Verify: `docker --version`

### 2. Start MinIO

Once Docker is installed:

```bash
# Use the helper script
./scripts/start-minio.sh

# Or manually
docker compose -f docker-compose.minio.yml up -d
```

### 3. Configure Environment

Create or update `.env.local`:

```bash
# MinIO Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET=uploads
MINIO_ENABLED=true

# Bot API (if not already set)
BOT_API_URL=https://bot.sufrah.sa/api
BOT_API_TOKEN=your-bot-api-token
DASHBOARD_PAT=your-personal-access-token
```

### 4. Restart Dashboard

```bash
# Stop the dev server (Ctrl+C)
# Then start again
pnpm dev
```

### 5. Test File Uploads

1. Open http://localhost:3000
2. Go to Chats page
3. Select a conversation
4. Click the 📎 paperclip icon
5. Upload an image or document
6. Add optional caption
7. Send!

**Expected result:** File uploads successfully and appears in the chat

---

## 📋 Verification Checklist

Run these checks to verify everything works:

```bash
# ✅ Check Docker is installed
docker --version
# Should show: Docker version 24.x.x or newer

# ✅ Check MinIO is running
curl http://localhost:9000/minio/health/live
# Should return: OK

# ✅ Check MinIO console is accessible
open http://localhost:9001
# Login: minioadmin / minioadmin123
# Should show MinIO web interface

# ✅ Check environment variables
grep MINIO_ .env.local
# Should show all MINIO_* variables

# ✅ Test upload API (requires active session)
# Open browser, login to dashboard, then try uploading a file in chat
```

---

## 🔧 If You Don't Want to Use Docker

### Option 1: Install MinIO Binary

```bash
# macOS
brew install minio/stable/minio
minio server /tmp/minio-data --console-address ":9001"
```

### Option 2: Use Cloud Storage (Production)

Skip MinIO and use a cloud provider:

**AWS S3:**
```bash
# In .env.local
MINIO_ENDPOINT=https://s3.amazonaws.com
MINIO_REGION=us-east-1
MINIO_ROOT_USER=your-aws-access-key-id
MINIO_ROOT_PASSWORD=your-aws-secret-access-key
MINIO_BUCKET=sufrah-uploads
MINIO_ENABLED=true
```

**DigitalOcean Spaces:**
```bash
# In .env.local
MINIO_ENDPOINT=https://nyc3.digitaloceanspaces.com
MINIO_REGION=us-east-1
MINIO_ROOT_USER=your-spaces-key
MINIO_ROOT_PASSWORD=your-spaces-secret
MINIO_BUCKET=sufrah-uploads
MINIO_ENABLED=true
```

### Option 3: Disable File Uploads Temporarily

```bash
# In .env.local
MINIO_ENABLED=false
```

Users will see: "خدمة رفع الملفات غير مفعلة" when trying to upload

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | Fast setup guide (5 minutes) |
| [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) | Complete technical documentation |
| [MEDIA_UPLOAD_FIX_SUMMARY.md](./MEDIA_UPLOAD_FIX_SUMMARY.md) | What was changed and why |
| [README.md](./README.md) | Project overview and setup |

---

## 🐛 Common Issues & Solutions

### "Docker is not installed"
**Solution:** Install Docker Desktop from https://www.docker.com/products/docker-desktop/

### "Cannot connect to Docker daemon"
**Solution:** Start Docker Desktop app and wait for it to initialize

### "Port 9000 already in use"
**Solution:** Stop other services on port 9000 or change MINIO_ENDPOINT to different port

### "خدمة التخزين غير متوفرة"
**Solution:** 
```bash
# Check if MinIO is running
docker ps | grep minio

# If not, start it
docker compose -f docker-compose.minio.yml up -d

# Check logs
docker compose -f docker-compose.minio.yml logs -f
```

### "Bucket access denied"
**Solution:**
1. Visit http://localhost:9001
2. Login: minioadmin / minioadmin123
3. Go to Buckets → uploads → Access
4. Set policy to "public" or "download"

---

## 🚀 Next Steps After Setup

### For Development
You're ready to develop! File uploads should work seamlessly.

### For Production
Before deploying to production:

1. **Set up production storage**
   - AWS S3, DigitalOcean Spaces, or similar
   - Configure bucket policies
   - Set up CDN (optional but recommended)

2. **Update environment variables**
   - Use production MINIO_ENDPOINT
   - Use production credentials
   - Enable HTTPS

3. **Test from production domain**
   - Verify uploads work
   - Verify WhatsApp can access media URLs
   - Test with real customers

4. **Set up monitoring**
   - Storage usage alerts
   - Error tracking
   - Cost monitoring

See [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) for complete production deployment guide.

---

## 📞 Need Help?

1. **Quick issues?** Check [QUICK_START.md](./QUICK_START.md) troubleshooting section
2. **Technical details?** See [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md)
3. **What changed?** Read [MEDIA_UPLOAD_FIX_SUMMARY.md](./MEDIA_UPLOAD_FIX_SUMMARY.md)
4. **Still stuck?** Check server logs: `pnpm dev` output

---

## ✨ Summary

**What you have now:**
- ✅ Fixed MinIO error handling
- ✅ Better error messages
- ✅ Complete documentation
- ✅ Easy setup scripts
- ✅ Docker configuration

**What you need to do:**
1. Install Docker Desktop
2. Run `./scripts/start-minio.sh`
3. Configure `.env.local`
4. Restart dashboard
5. Test file uploads

**Time required:** ~10 minutes (mostly Docker installation)

---

**Ready?** Start with installing Docker, then follow the steps above! 🎉

