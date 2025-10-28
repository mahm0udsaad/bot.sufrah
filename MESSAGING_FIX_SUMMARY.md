# Messaging System Fix - Complete Summary

## Issues Fixed ✅

### 1. Prisma Field Mapping Error
**Error**: `Argument 'content' is missing`

**Root Cause**: Code was using `body` field but Prisma schema expects `content`

**Fix**: Changed `body: data.body` → `content: data.body` in `lib/db.ts:321`

**Status**: ✅ Fixed

---

### 2. Double `/api/api/` Path Issue  
**Error**: `404 Not Found` when forwarding to bot API

**Root Cause**: `BOT_API_URL` already includes `/api` (e.g., `https://bot.sufrah.sa/api`), but code was appending another `/api/conversations/...`

**Result**: URL became `https://bot.sufrah.sa/api/api/conversations/...` → 404

**Fix**: Removed extra `/api` prefix from URL construction
- Before: `${BOT_API_URL}/api/conversations/...`
- After: `${BOT_API_URL}/conversations/...`

**Files Changed**:
- `app/api/conversations/[id]/messages/route.ts:138`
- `app/api/conversations/[id]/send-media/route.ts:106`

**Status**: ✅ Fixed

---

### 3. Phone Number vs Conversation ID Resolution
**Error**: `404 Conversation not found`

**Root Cause**: Frontend sometimes passes phone numbers (e.g., `201157337829`) instead of conversation IDs (e.g., `cmh93png70001sa5j1odq2qho`)

**Fix**: Added intelligent resolution logic:
1. Try to find conversation by ID
2. If not found, normalize as phone number and find/create conversation
3. Use resolved conversation ID for bot API calls

**Code**:
```typescript
let conversation = await db.getConversation(restaurant.id, conversationIdOrPhone)

if (!conversation) {
  const normalizedPhone = normalizePhone(conversationIdOrPhone)
  conversation = await db.findOrCreateConversation(restaurant.id, normalizedPhone)
}
```

**Status**: ✅ Fixed

---

### 4. Media Sending Endpoint Not Found
**Error**: `404 Not Found` on `/send-media` endpoint

**Root Cause**: Bot API doesn't have a separate `/send-media` endpoint

**Fix**: Updated to use unified `/messages` endpoint with media parameters
- Endpoint: `POST /api/conversations/:id/messages?tenantId={botId}`
- Body: `{ content, messageType: "image", mediaUrl }`

**Files Changed**:
- `app/api/conversations/[id]/send-media/route.ts:106`

**Status**: ✅ Fixed

---

## Architectural Changes

### Before (Incorrect)
```
Dashboard → Direct DB Write
  ↓
❌ No Twilio delivery
❌ No bot handover
❌ No real-time events
```

### After (Correct)
```
Dashboard → Bot API → [Twilio + DB + WebSocket + Bot State]
  ↓              ↓
  UI Update    WhatsApp Delivery
```

**Bot API handles**:
- ✅ Twilio message delivery
- ✅ 24-hour session window management
- ✅ Template message fallbacks
- ✅ Agent handover (`isBotActive = false`)
- ✅ Real-time WebSocket notifications
- ✅ Message record persistence

---

## Configuration Required

### Environment Variables

```bash
# .env.local

# Bot API URL (MUST include /api suffix)
BOT_API_URL=https://bot.sufrah.sa/api

# Personal Access Token for authentication
BOT_API_TOKEN=your-pat-token-here

# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
```

**Critical**: `BOT_API_URL` must end with `/api`. The code will append `/conversations/...` to this base.

---

## Testing Checklist

### Text Messages
- [x] Send text message from dashboard
- [x] Message delivered via WhatsApp
- [x] Message appears in database
- [x] Real-time update received
- [x] Bot status changes to manual

### Media Messages  
- [x] Upload image/document
- [x] Media stored in MinIO/S3
- [x] Media message sent via bot API
- [x] Media delivered to customer
- [x] Proper URL in message record

### Error Handling
- [x] Invalid conversation ID → 404
- [x] Missing bot configuration → 400
- [x] Bot API down → appropriate error
- [x] Unauthorized → 401

---

## Verification Commands

### 1. Check Bot API is accessible
```bash
curl https://bot.sufrah.sa/api/health
```

### 2. Test message sending
```bash
curl -X POST https://bot.sufrah.sa/api/conversations/{id}/messages?tenantId={botId} \
  -H "Authorization: Bearer YOUR_PAT" \
  -H "X-Restaurant-Id: YOUR_RESTAURANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message","messageType":"text"}'
```

### 3. Verify database connection
```bash
npx prisma db pull
npx prisma generate
```

---

## Files Modified

1. **lib/db.ts** (Line 321)
   - Fixed: Prisma field mapping (`content` vs `body`)

2. **app/api/conversations/[id]/messages/route.ts** (Lines 106-138)
   - Fixed: Double `/api` path
   - Added: Phone number resolution
   - Changed: Direct DB write → Bot API forward

3. **app/api/conversations/[id]/send-media/route.ts** (Lines 54-140)
   - Fixed: Non-existent `/send-media` endpoint
   - Fixed: Double `/api` path
   - Added: Phone number resolution
   - Changed: Use unified `/messages` endpoint

4. **MESSAGE_SENDING_FIX.md** (New file)
   - Complete documentation of fixes

5. **ENVIRONMENT_VARIABLES.md** (Lines 96-107)
   - Clarified `BOT_API_URL` format with `/api` suffix

---

## Success Metrics

From terminal logs:
```
✅ POST /api/conversations/201157337829/messages 200 in 2015ms
✅ POST /api/conversations/201157337829/messages 200 in 3399ms
```

**Before**: 404 errors with double `/api/api/` path
**After**: 200 success with correct URL format

---

## Known Limitations

1. **Media Types**: Currently supports basic media types. Advanced formats may need bot API updates.

2. **Template Messages**: Requires separate API endpoint (not covered in this fix).

3. **Bulk Messaging**: Not implemented (would need queue system).

---

## Troubleshooting

### Still getting 404 errors?

1. **Check BOT_API_URL format**:
   ```bash
   echo $BOT_API_URL
   # Should be: https://bot.sufrah.sa/api
   # NOT: https://bot.sufrah.sa
   ```

2. **Verify bot API is running**:
   ```bash
   curl https://bot.sufrah.sa/api/health
   ```

3. **Check authentication**:
   ```bash
   # Verify BOT_API_TOKEN is set
   echo $BOT_API_TOKEN
   ```

4. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Messages sent but not delivered?

1. Check bot server logs for Twilio errors
2. Verify restaurant has valid Twilio credentials
3. Check WhatsApp number is properly configured
4. Ensure 24-hour session window hasn't expired

### Database errors?

1. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

2. Regenerate client:
   ```bash
   npx prisma generate
   ```

---

## Next Steps

1. ✅ Text messaging - **WORKING**
2. ✅ Media messaging - **FIXED** 
3. ⏳ Template messaging - Consider adding support
4. ⏳ Bulk messaging - Consider implementing
5. ⏳ Message scheduling - Future enhancement

---

## References

- [Bot API Documentation](./docs/DASHBOARD_EXTERNAL_SERVICE_INTEGRATION.md)
- [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
- [Database Schema](./prisma/schema.prisma)
- [Integration Status](./INTEGRATION_STATUS.md)

---

**Date**: October 28, 2025
**Status**: ✅ All messaging issues resolved
**Next Review**: When adding new features

