# Quick Environment Setup for WhatsApp Verification Codes

## Required Environment Variables

Add these to your `.env.local` file or production environment:

```bash
# WhatsApp Send API Token (Required)
# This must match the token in your bot backend
WHATSAPP_SEND_TOKEN=your_secure_token_here

# Bot Backend API URL
BOT_API_URL=https://bot.sufrah.sa

# Database
DATABASE_URL=file:./prisma/dev.db

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional: Twilio (only for onboarding/bot setup)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SMS_FROM=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

## How to Get the WHATSAPP_SEND_TOKEN

1. **Check your bot backend configuration:**
   ```bash
   # The token should be in your bot backend .env file
   # Look for: WHATSAPP_SEND_TOKEN=xxxxx
   ```

2. **If not set, generate a secure token:**
   ```bash
   # On Linux/Mac
   openssl rand -hex 32
   
   # Or use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Add the SAME token to both:**
   - Dashboard `.env.local` → `WHATSAPP_SEND_TOKEN=xxxxx`
   - Bot backend `.env` → `WHATSAPP_SEND_TOKEN=xxxxx`

## Quick Test

1. **Start the dashboard:**
   ```bash
   npm run dev
   ```

2. **Test sign-in:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"phone": "+966501234567"}'
   ```

3. **Expected response:**
   ```json
   {
     "success": true,
     "message": "Verification code sent successfully",
     "code": "123456"
   }
   ```

4. **Check logs for:**
   ```
   [whatsapp-send-api] Sending verification code | to=+966****67 | code=123456
   [whatsapp-send-api] Success: { status: "queued", ... }
   ```

## Troubleshooting

### Error: `WHATSAPP_SEND_TOKEN` not configured

**Solution:** Add the token to your `.env.local` file and restart the dev server.

### Error: 401 Unauthorized

**Solution:** Ensure the token matches between dashboard and bot backend.

### Error: 503 Service Unavailable

**Solution:** Bot backend needs the token configured. Add it to bot backend `.env` and restart.

## Production Deployment

### Vercel

```bash
# Set environment variables in Vercel dashboard
vercel env add WHATSAPP_SEND_TOKEN production
vercel env add BOT_API_URL production
```

### Docker

```bash
# Add to your docker-compose.yml or .env file
docker run -e WHATSAPP_SEND_TOKEN=xxx -e BOT_API_URL=https://bot.sufrah.sa ...
```

### Other Platforms

Add the environment variables through your platform's dashboard or configuration files.

---

**For detailed documentation, see:** `WHATSAPP_SEND_API_INTEGRATION.md`

