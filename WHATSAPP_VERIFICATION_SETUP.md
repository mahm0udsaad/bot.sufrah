# WhatsApp Verification Code Setup - Complete Guide

## 🎯 Quick Start

Your dashboard now sends registration verification codes through the WhatsApp Send API!

### 1️⃣ Add Environment Variable

Create or update `.env.local`:

```bash
# Required for WhatsApp verification codes
WHATSAPP_SEND_TOKEN=your_secure_token_here
BOT_API_URL=https://bot.sufrah.sa

# Database
DATABASE_URL=file:./prisma/dev.db

# JWT
JWT_SECRET=your-jwt-secret
```

### 2️⃣ Start Development Server

```bash
npm run dev
```

### 3️⃣ Test It

Open http://localhost:3000/signin and enter a phone number!

---

## 📱 User Flow

```
┌─────────────────────────────────────────┐
│  1. User enters phone number            │
│     +966501234567                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Dashboard generates 6-digit code    │
│     Code: 123456                        │
│     Expires: 10 minutes                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Call WhatsApp Send API              │
│     POST bot.sufrah.sa/api/whatsapp/send│
│     Authorization: Bearer TOKEN         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Bot backend processes request       │
│     • Checks 24h messaging window       │
│     • Queues message                    │
│     • Sends via Twilio                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. User receives WhatsApp message      │
│                                         │
│     Your Sufrah verification code is:   │
│     123456                              │
│                                         │
│     This code will expire in 10         │
│     minutes.                            │
│                                         │
│     Do not share this code with anyone. │
└─────────────────────────────────────────┘
```

---

## 🔐 Security Token Setup

### Generate a Secure Token

```bash
# Method 1: OpenSSL
openssl rand -hex 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# 7f8a9b2c4d5e6f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a
```

### Add to Dashboard (.env.local)

```bash
WHATSAPP_SEND_TOKEN=7f8a9b2c4d5e6f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a
```

### Add to Bot Backend (.env)

```bash
WHATSAPP_SEND_TOKEN=7f8a9b2c4d5e6f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a
```

⚠️ **Important:** Use the EXACT SAME token in both places!

---

## 🧪 Testing

### Test 1: API Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "code": "123456"
}
```

### Test 2: Check Console Logs

You should see:
```
[whatsapp-send-api] Sending verification code | to=+966****67 | code=123456
[whatsapp-send-api] Success: {
  status: "queued",
  message: "Message queued for delivery",
  jobId: "12345"
}
```

### Test 3: Check Phone

Open WhatsApp on the phone number you tested. You should receive the verification code!

---

## ✅ Verification Checklist

- [ ] `WHATSAPP_SEND_TOKEN` added to dashboard `.env.local`
- [ ] Same token configured in bot backend `.env`
- [ ] `BOT_API_URL` points to `https://bot.sufrah.sa`
- [ ] Bot backend is running and accessible
- [ ] Development server started (`npm run dev`)
- [ ] Tested sign-in with real phone number
- [ ] Received verification code on WhatsApp
- [ ] Code verification works

---

## 🐛 Troubleshooting

### Problem: "WHATSAPP_SEND_TOKEN not configured"

```bash
# Solution: Add to .env.local
echo 'WHATSAPP_SEND_TOKEN=your_token_here' >> .env.local

# Restart server
npm run dev
```

### Problem: "401 Unauthorized"

**Cause:** Token mismatch between dashboard and bot backend

**Solution:**
1. Check dashboard `.env.local` → `WHATSAPP_SEND_TOKEN=xxx`
2. Check bot backend `.env` → `WHATSAPP_SEND_TOKEN=xxx`
3. Ensure they match EXACTLY
4. Restart both services

### Problem: "503 Service Unavailable"

**Cause:** Bot backend doesn't have the token

**Solution:**
```bash
# Add to bot backend .env
echo 'WHATSAPP_SEND_TOKEN=your_token_here' >> .env

# Restart bot backend
docker restart sufrah-bot
# or
pm2 restart bot
```

### Problem: No message received

**Checklist:**
- [ ] Phone number in E.164 format (+966501234567)
- [ ] Phone number has WhatsApp installed
- [ ] Bot backend Twilio credentials are correct
- [ ] Check bot backend logs for delivery status

---

## 📊 API Request/Response Examples

### Request to Dashboard

```http
POST /api/auth/signin HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "phone": "+966501234567"
}
```

### Dashboard to Bot Backend

```http
POST /api/whatsapp/send HTTP/1.1
Host: bot.sufrah.sa
Authorization: Bearer 7f8a9b2c4d5e6f1a2b3c4d5e6f7a8b9c...
Content-Type: application/json

{
  "phoneNumber": "+966501234567",
  "text": "Your Sufrah verification code is: 123456\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone."
}
```

### Bot Backend Response (Queued)

```json
{
  "status": "queued",
  "message": "Message queued for delivery",
  "jobId": "msg_abc123xyz",
  "queuePosition": "waiting"
}
```

### Bot Backend Response (Sent)

```json
{
  "status": "ok",
  "message": "Successfully sent",
  "channel": "freeform",
  "sid": "SM1234567890abcdef1234567890abcdef"
}
```

---

## 🚀 Production Deployment

### Vercel

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   ```
   Name: WHATSAPP_SEND_TOKEN
   Value: your_token_here
   Environment: Production
   ```
4. Redeploy

### Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  dashboard:
    image: sufrah-dashboard
    environment:
      - WHATSAPP_SEND_TOKEN=your_token_here
      - BOT_API_URL=https://bot.sufrah.sa
      - DATABASE_URL=file:./prisma/dev.db
      - JWT_SECRET=your_jwt_secret
    ports:
      - "3000:3000"
```

### Environment Variables Platform

Most platforms support environment variables:

```bash
# Heroku
heroku config:set WHATSAPP_SEND_TOKEN=your_token

# Railway
railway variables set WHATSAPP_SEND_TOKEN=your_token

# Render
# Add via dashboard: Settings → Environment
```

---

## 📈 Monitoring

### Console Logs

```bash
# Development
npm run dev

# Look for these logs:
[whatsapp-send-api] Sending verification code | to=+966****67 | code=123456
[whatsapp-send-api] Success: { status: "queued", ... }
```

### Production Logs

```bash
# Check application logs
pm2 logs dashboard

# or Docker logs
docker logs sufrah-dashboard -f

# Filter for WhatsApp API calls
docker logs sufrah-dashboard 2>&1 | grep whatsapp-send-api
```

### Bot Backend Logs

```bash
# Check bot backend for delivery status
docker logs sufrah-bot | grep "whatsapp/send"
docker logs sufrah-bot | grep "Message sent to"
```

---

## 🎓 How It Works

### Code Flow

```typescript
// 1. User requests verification code
POST /api/auth/signin { phone: "+966501234567" }

// 2. Generate code and save to database
const code = "123456"
await db.updateUser(userId, { 
  verification_code: code,
  verification_expires_at: new Date(Date.now() + 10 * 60 * 1000)
})

// 3. Send via WhatsApp Send API
const result = await sendVerificationWhatsApp(phone, code)

// 4. Return success/error
return { success: true, message: "Code sent" }
```

### Message Template

```
Your Sufrah verification code is: [CODE]

This code will expire in 10 minutes.

Do not share this code with anyone.
```

### Automatic Features

✅ **24h Window Detection:** Bot backend checks if user messaged recently
✅ **Template Fallback:** Uses approved template if outside 24h window
✅ **Queue Management:** Messages are queued for reliable delivery
✅ **Retry Logic:** Failed messages are automatically retried
✅ **Quota Tracking:** Usage is tracked and limited per restaurant

---

## 📚 Additional Resources

- **SETUP_SUMMARY.md** - Quick integration summary
- **WHATSAPP_SEND_API_INTEGRATION.md** - Detailed integration guide
- **ENV_SETUP_INSTRUCTIONS.md** - Environment setup instructions
- **ENVIRONMENT_VARIABLES.md** - Complete environment variables reference
- **API_REQUIREMENTS.md** - WhatsApp Send API documentation

---

## ✨ Success!

Once you've added the `WHATSAPP_SEND_TOKEN` environment variable and restarted your server, verification codes will be sent automatically via WhatsApp!

### Quick Checklist

✅ Environment variable set
✅ Server restarted
✅ Sign-in tested
✅ Message received
✅ Code verified

**You're all set! 🎉**

---

Need help? Contact: info@sufrah.sa

