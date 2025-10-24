# WhatsApp Send API Integration - Setup Summary

## ✅ What Was Done

The Sufrah Dashboard now uses the WhatsApp Send API from the bot backend to send registration verification codes via WhatsApp.

### Changes Made

1. **Updated `lib/twilio.ts`**
   - Modified `sendVerificationWhatsApp()` function
   - Now calls `POST https://bot.sufrah.sa/api/whatsapp/send`
   - Uses Bearer token authentication
   - Removed direct Twilio SDK calls for verification

2. **Updated `ENVIRONMENT_VARIABLES.md`**
   - Added documentation for `WHATSAPP_SEND_TOKEN`
   - Added documentation for WhatsApp Send API configuration

3. **Created Documentation**
   - `WHATSAPP_SEND_API_INTEGRATION.md` - Comprehensive integration guide
   - `ENV_SETUP_INSTRUCTIONS.md` - Quick setup instructions

## 🔧 Configuration Needed

### 1. Dashboard Environment Variables

Add to `.env.local` (development) or production environment:

```bash
WHATSAPP_SEND_TOKEN=your_secure_token_here
BOT_API_URL=https://bot.sufrah.sa
```

### 2. Bot Backend Environment Variables

Ensure bot backend has:

```bash
WHATSAPP_SEND_TOKEN=your_secure_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+966508034010
TWILIO_MASTER_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_MASTER_AUTH=your_twilio_auth_token
```

**Important:** The `WHATSAPP_SEND_TOKEN` must be the SAME in both dashboard and bot backend!

## 🔄 How It Works Now

### Before (Old Flow)
```
User Sign In → Dashboard → Direct Twilio API → WhatsApp
```

### After (New Flow)
```
User Sign In → Dashboard → Bot Backend WhatsApp Send API → Twilio → WhatsApp
```

### Benefits
✅ Centralized Twilio credentials (only in bot backend)
✅ Automatic 24-hour window detection
✅ Template fallback for messages outside 24h window
✅ Queue management with retries
✅ Quota enforcement
✅ Better message tracking

## 📝 API Details

### Endpoint
```
POST https://bot.sufrah.sa/api/whatsapp/send
```

### Authentication
```
Authorization: Bearer YOUR_WHATSAPP_SEND_TOKEN
```

### Request Body
```json
{
  "phoneNumber": "+966501234567",
  "text": "Your Sufrah verification code is: 123456\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone."
}
```

### Response (Queued)
```json
{
  "status": "queued",
  "message": "Message queued for delivery",
  "jobId": "12345",
  "queuePosition": "waiting"
}
```

### Response (Direct Send)
```json
{
  "status": "ok",
  "message": "Successfully sent",
  "channel": "freeform",
  "sid": "SM1234567890abcdef1234567890abcdef"
}
```

## 🧪 Testing

### Test Sign-In Flow

```bash
# Start dashboard
npm run dev

# Send verification code
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567"}'
```

### Expected Console Output

```
[whatsapp-send-api] Sending verification code | to=+966****67 | code=123456
[whatsapp-send-api] Success: { status: "queued", message: "Message queued for delivery", jobId: "12345" }
```

### Verify Message Sent

Check WhatsApp on the phone number you used. You should receive:

```
Your Sufrah verification code is: 123456

This code will expire in 10 minutes.

Do not share this code with anyone.
```

## ⚠️ Common Errors and Solutions

### 1. Error: `WHATSAPP_SEND_TOKEN not configured`

**Console:**
```
WhatsApp Send API not configured - missing WHATSAPP_SEND_TOKEN
```

**Solution:**
```bash
# Add to .env.local
WHATSAPP_SEND_TOKEN=your_token_here

# Restart dev server
npm run dev
```

### 2. Error: `401 Unauthorized`

**Response:**
```json
{ "error": "Unauthorized" }
```

**Solution:**
- Verify token is correct
- Ensure token matches between dashboard and bot backend
- Check for extra spaces or quotes in token

### 3. Error: `503 Service Unavailable`

**Response:**
```json
{ "error": "Messaging endpoint is disabled" }
```

**Solution:**
- Bot backend doesn't have `WHATSAPP_SEND_TOKEN` set
- Add token to bot backend `.env`
- Restart bot backend

### 4. Error: `500 Twilio client not available`

**Response:**
```json
{ "error": "Twilio client not available..." }
```

**Solution:**
- Check bot backend Twilio credentials
- Verify `TWILIO_MASTER_SID` and `TWILIO_MASTER_AUTH` are set

## 📋 Deployment Checklist

- [ ] `WHATSAPP_SEND_TOKEN` added to dashboard environment
- [ ] `BOT_API_URL` points to production backend
- [ ] Token matches between dashboard and bot backend
- [ ] Bot backend is running and accessible
- [ ] Tested sign-in flow in staging
- [ ] Verified message delivery
- [ ] Checked logs for errors
- [ ] Set up monitoring/alerts

## 📚 Documentation Files

- **WHATSAPP_SEND_API_INTEGRATION.md** - Complete integration guide with flow diagrams
- **ENV_SETUP_INSTRUCTIONS.md** - Quick environment setup
- **ENVIRONMENT_VARIABLES.md** - All environment variables reference
- **API_REQUIREMENTS.md** - WhatsApp Send API documentation from bot backend

## 🔍 Files Modified

1. `lib/twilio.ts` - Updated `sendVerificationWhatsApp()` function
2. `ENVIRONMENT_VARIABLES.md` - Added WhatsApp Send API configuration

## 📞 Support

If you encounter issues:

1. Check console logs for `[whatsapp-send-api]` messages
2. Verify all environment variables are set
3. Test the bot backend API directly:
   ```bash
   curl -X POST https://bot.sufrah.sa/api/whatsapp/send \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+966501234567", "text": "Test"}'
   ```
4. Contact support: info@sufrah.sa

---

## ✨ Next Steps

1. **Development:**
   - Add `WHATSAPP_SEND_TOKEN` to `.env.local`
   - Test the sign-in flow
   - Verify messages are delivered

2. **Staging:**
   - Configure environment variables
   - Test with real phone numbers
   - Monitor logs for issues

3. **Production:**
   - Configure environment variables securely
   - Set up monitoring and alerts
   - Monitor quota usage (warn at 90%)

---

**Integration Status:** ✅ Complete and ready for testing!

The dashboard is now configured to send verification codes through the WhatsApp Send API. Once you add the `WHATSAPP_SEND_TOKEN` environment variable, the system will start sending verification codes via WhatsApp automatically.

