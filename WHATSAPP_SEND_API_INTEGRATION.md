# WhatsApp Send API Integration for Verification Codes

## Overview

The Sufrah Dashboard now uses the WhatsApp Send API from the bot backend to send verification codes during user registration and sign-in. This integration provides:

- ✅ Automatic 24-hour messaging window detection
- ✅ Automatic fallback to templates when outside the 24h window
- ✅ Queue management for reliable delivery
- ✅ Quota enforcement
- ✅ Better deliverability

## Changes Made

### 1. Updated `lib/twilio.ts`

The `sendVerificationWhatsApp` function now uses the WhatsApp Send API instead of calling Twilio directly:

**Before:**
```typescript
// Direct Twilio API call
const message = await client.messages.create({
  body: `Your Sufrah verification code is: ${code}...`,
  from: fromAddress,
  to: toAddress,
})
```

**After:**
```typescript
// Uses WhatsApp Send API
const response = await fetch(`${apiUrl}/api/whatsapp/send`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${whatsappSendToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    phoneNumber,
    text: messageText,
  }),
})
```

### 2. Environment Variables

Added new required environment variable:

```bash
WHATSAPP_SEND_TOKEN=your_secure_token_here
```

This token must match the `WHATSAPP_SEND_TOKEN` configured in your bot backend.

### 3. API Endpoint

The dashboard now calls:
```
POST https://bot.sufrah.sa/api/whatsapp/send
```

With authentication header:
```
Authorization: Bearer YOUR_WHATSAPP_SEND_TOKEN
```

## Configuration

### 1. Set Environment Variables

Add to your `.env.local` or production environment:

```bash
# Required for WhatsApp verification codes
WHATSAPP_SEND_TOKEN=your_secure_token_here
BOT_API_URL=https://bot.sufrah.sa

# Optional: For development
NODE_ENV=development
```

### 2. Verify Bot Backend Configuration

Ensure your bot backend has the matching token:

```bash
# In bot backend .env
WHATSAPP_SEND_TOKEN=your_secure_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+966508034010
TWILIO_MASTER_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_MASTER_AUTH=your_twilio_auth_token
```

## Testing

### 1. Test Sign-In Flow

```bash
# Start the dashboard
npm run dev

# Navigate to sign-in page
open http://localhost:3000/signin

# Enter a phone number and request verification code
# Check console logs for:
# [whatsapp-send-api] Sending verification code | to=+966****67 | code=123456
```

### 2. Test API Directly

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "code": "123456"  // Only in development
}
```

### 3. Check Bot Backend Logs

```bash
# Check if the message was queued/sent
docker logs sufrah-bot -f | grep "whatsapp/send"
```

## Error Handling

### Common Errors and Solutions

#### 1. `401 Unauthorized`

**Error:**
```json
{
  "error": "Unauthorized"
}
```

**Solution:**
- Check that `WHATSAPP_SEND_TOKEN` is set in dashboard environment
- Verify token matches the one in bot backend
- Ensure token format is correct (no extra spaces or quotes)

#### 2. `503 Service Unavailable`

**Error:**
```json
{
  "error": "Messaging endpoint is disabled"
}
```

**Solution:**
- Bot backend doesn't have `WHATSAPP_SEND_TOKEN` configured
- Add the token to bot backend `.env` and restart

#### 3. `500 Twilio Client Error`

**Error:**
```json
{
  "error": "Twilio client not available..."
}
```

**Solution:**
- Bot backend needs `TWILIO_MASTER_SID` and `TWILIO_MASTER_AUTH`
- Or associate the sender number with a restaurant

#### 4. `429 Quota Exceeded`

**Error:**
```json
{
  "error": "Usage quota exceeded",
  "details": { "used": 1050, "limit": 1000 }
}
```

**Solution:**
- Contact admin to increase quota
- Or wait for quota reset (usually monthly)

## How It Works

### Flow Diagram

```
┌─────────────┐
│   User      │
│ Sign In     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ app/api/auth/    │
│ signin/route.ts  │
└──────┬───────────┘
       │
       │ generateVerificationCode()
       │ sendVerificationWhatsApp(phone, code)
       │
       ▼
┌──────────────────────────┐
│ lib/twilio.ts            │
│ sendVerificationWhatsApp │
└──────┬───────────────────┘
       │
       │ POST /api/whatsapp/send
       │ Authorization: Bearer TOKEN
       │
       ▼
┌──────────────────────────┐
│ Bot Backend              │
│ bot.sufrah.sa            │
│ /api/whatsapp/send       │
└──────┬───────────────────┘
       │
       │ • Check 24h window
       │ • Queue message
       │ • Send via Twilio
       │
       ▼
┌──────────────────┐
│ Twilio WhatsApp  │
│ Delivery         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ User's WhatsApp  │
│ Receives Code    │
└──────────────────┘
```

### Message Format

The verification code message sent to users:

```
Your Sufrah verification code is: 123456

This code will expire in 10 minutes.

Do not share this code with anyone.
```

### Automatic Handling

The WhatsApp Send API automatically:

1. **Detects 24h window**: Checks if customer messaged recently
2. **Chooses delivery method**:
   - Within 24h → Sends as freeform message
   - Outside 24h → Uses approved WhatsApp template
3. **Queues message**: Ensures reliable delivery
4. **Tracks quota**: Enforces usage limits
5. **Retries on failure**: Automatic retry with backoff

## Message Tracking

### Response When Queued

```json
{
  "status": "queued",
  "message": "Message queued for delivery",
  "jobId": "12345",
  "queuePosition": "waiting"
}
```

### Response When Sent Directly

```json
{
  "status": "ok",
  "message": "Successfully sent",
  "channel": "freeform",
  "sid": "SM1234567890abcdef1234567890abcdef"
}
```

## Security Best Practices

### 1. Token Security

```bash
# ✅ Good - Environment variable
WHATSAPP_SEND_TOKEN=abc123

# ❌ Bad - Hardcoded
const token = "abc123";  // Never do this!
```

### 2. Rate Limiting

The bot backend enforces:
- 60 messages per minute per restaurant
- 1,000 messages per day per restaurant
- Monthly conversation limits

### 3. Phone Number Validation

All phone numbers are validated:
- Must be E.164 format: `+966501234567`
- Must be valid for Saudi Arabia (or configured country)
- WhatsApp-enabled numbers only

## Monitoring

### Dashboard Logs

```bash
# Check verification sends
grep "whatsapp-send-api" logs/app.log

# Check errors
grep "WhatsApp Send API error" logs/app.log
```

### Bot Backend Logs

```bash
# Check API calls
docker logs sufrah-bot | grep "POST /api/whatsapp/send"

# Check queue
docker logs sufrah-bot | grep "WhatsApp queue"
```

## Migration from Direct Twilio

If you were previously using direct Twilio calls:

### Before (Old Method)
```typescript
// Required credentials in dashboard .env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+966508034010
```

### After (New Method)
```typescript
// Only need this in dashboard .env
WHATSAPP_SEND_TOKEN=your_token
BOT_API_URL=https://bot.sufrah.sa

// Twilio credentials now only in bot backend
```

### Benefits of New Method

✅ **Centralized Management**: All Twilio credentials in one place (bot backend)
✅ **Better Quota Control**: Unified quota across all services
✅ **Template Support**: Automatic fallback to templates
✅ **Queue Management**: Reliable delivery with retries
✅ **24h Window Detection**: Automatic handling
✅ **Simplified Dashboard**: Less configuration needed

## Troubleshooting Checklist

- [ ] `WHATSAPP_SEND_TOKEN` is set in dashboard environment
- [ ] `BOT_API_URL` points to correct backend
- [ ] Token matches between dashboard and bot backend
- [ ] Bot backend is running and accessible
- [ ] Twilio credentials are configured in bot backend
- [ ] Phone number is in E.164 format
- [ ] User hasn't exceeded quota
- [ ] Bot backend has `WHATSAPP_SEND_TOKEN` set

## Support

If you encounter issues:

1. Check dashboard console logs
2. Check bot backend logs
3. Verify all environment variables
4. Test the API endpoint directly with curl
5. Contact support: info@sufrah.sa

## Related Files

- `lib/twilio.ts` - WhatsApp sending implementation
- `app/api/auth/signin/route.ts` - Sign-in endpoint that triggers verification
- `app/api/auth/verify/route.ts` - Verification code validation
- `ENVIRONMENT_VARIABLES.md` - Full environment variables guide
- `API_REQUIREMENTS.md` - WhatsApp Send API documentation

## Next Steps

1. **Set up environment variables** in your production environment
2. **Test the sign-in flow** to ensure codes are delivered
3. **Monitor logs** for the first few days
4. **Set up alerts** for quota warnings (90%+ usage)
5. **Configure backup SMS** fallback if needed (optional)

---

**✅ Integration Complete!**

Your dashboard now uses the WhatsApp Send API for verification codes. Users will receive codes via WhatsApp with automatic 24h window handling and template fallback.

