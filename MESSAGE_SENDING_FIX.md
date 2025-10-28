# Message Sending Fix Summary

## Problem
When attempting to send messages from the dashboard, the system was:
1. Directly writing to the database instead of using the bot API
2. Using incorrect field names (`body` instead of `content` in Prisma)

This caused two issues:
- Prisma validation errors: "Argument `content` is missing"
- Messages were not being delivered via Twilio
- Bot handover logic was not being triggered

## Solution Implemented

### 1. Fixed Prisma Field Mapping (lib/db.ts)
**Changed**: Line 321 in `createMessage` function
- **Before**: `body: data.body,`
- **After**: `content: data.body,`

**Why**: The Prisma schema defines the field as `content` which maps to the database column `body`:
```prisma
model Message {
  content  String  @map("body")
}
```

### 2. Updated Message Sending API (app/api/conversations/[id]/messages/route.ts)
**Changed**: Complete rewrite of POST handler

**Before**: Directly created messages in the database using `db.createMessage()`

**After**: Forwards to the bot API following the correct architecture:

```typescript
POST /api/conversations/:conversationId/messages?tenantId={botId}
Body: { "content": "message text", "messageType": "text" }
```

**Key Fixes**:
- ✅ Removed double `/api/api/` path issue (BOT_API_URL already includes `/api`)
- ✅ Added phone number to conversation ID resolution
- ✅ Uses proper `tenantId` parameter with bot ID

**Benefits of Bot API Approach**:
- ✅ Bot server handles Twilio delivery
- ✅ Manages 24-hour session windows and template fallbacks
- ✅ Automatically switches `isBotActive` to `false` for agent handover
- ✅ Publishes real-time events via WebSocket
- ✅ Stores outbound message records with Twilio SIDs

### 3. Fixed Media Sending API (app/api/conversations/[id]/send-media/route.ts)
**Changed**: Updated to use the same `/messages` endpoint as text messages

**Before**: 
- Used non-existent `/send-media` endpoint (404 errors)
- Used phone number instead of conversation ID

**After**: 
- Uses unified `/messages` endpoint with media parameters
- Resolves phone numbers to conversation IDs
- Sends with proper format:
```typescript
POST /api/conversations/:conversationId/messages?tenantId={botId}
Body: {
  "content": "caption text",
  "messageType": "image",
  "mediaUrl": "https://storage.sufrah.sa/uploads/file.png"
}
```

## Architecture Overview

### Reading Messages (Unchanged - Already Correct)
```
Dashboard Frontend
    ↓
Dashboard API: GET /api/conversations/[id]/messages/db
    ↓
Database (Prisma) ← Direct Read
```

### Sending Messages (Fixed)
```
Dashboard Frontend
    ↓
Dashboard API: POST /api/conversations/[id]/messages
    ↓
Bot Server API: POST /api/conversations/:conversationId/messages?tenantId={botId}
    ↓
├─→ Twilio API (delivers via WhatsApp)
├─→ Database (stores outbound record)
├─→ WebSocket (real-time notification)
└─→ Updates conversation.isBotActive = false
```

## Query Functions Available (lib/db.ts)

All query functions from the documentation are implemented:

1. **`listMessagesByConversationId`** (Line 236)
   - Gets messages by conversation ID
   - Supports pagination with `before` cursor

2. **`listMessagesByRestaurantAndPhone`** (Line 260)
   - Resolves conversation by restaurant + phone
   - Then fetches messages

3. **`listMessagesPage`** (Line 282)
   - Pagination-friendly (load older messages)
   - Returns in ascending order

4. **`getRecentMessages`** (Line 300)
   - Recent messages for restaurant feed
   - Descending order (newest first)

## Environment Variables Required

Ensure these are set in your `.env.local`:

```bash
# Bot Server API (IMPORTANT: Include /api in the URL)
BOT_API_URL=https://bot.sufrah.sa/api
BOT_API_TOKEN=your-personal-access-token

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public

# Optional: Public API URL for client-side
NEXT_PUBLIC_API_URL=https://bot.sufrah.sa
```

**Important Note**: `BOT_API_URL` should include `/api` at the end (e.g., `https://bot.sufrah.sa/api`). The dashboard will append paths like `/conversations/:id/messages` to this base URL.

## Testing

### 1. Verify Database Connection
```bash
npx prisma db pull
npx prisma generate
```

### 2. Test Message Sending
1. Log into dashboard
2. Open a conversation
3. Send a message
4. Check:
   - ✅ Message appears in UI
   - ✅ Message delivered via WhatsApp
   - ✅ Bot status changes to "Manual" (isBotActive = false)
   - ✅ Real-time WebSocket notification received

### 3. Check Logs
Look for:
```
[dashboard] Forwarding message to bot API: https://bot.sufrah.sa/api/conversations/.../messages?tenantId=...
```

## Common Issues & Solutions

### Issue: "Bot not configured for this restaurant"
**Solution**: Ensure the restaurant has a bot configured in the `RestaurantBot` table

### Issue: "Bot API not configured"
**Solution**: Set `BOT_API_URL` in environment variables

### Issue: Still getting Prisma validation errors
**Solution**: 
1. Restart the dev server
2. Run `npx prisma generate`
3. Clear Next.js cache: `rm -rf .next`

### Issue: Message sent but not delivered
**Solution**: Check bot server logs for Twilio errors

## Multi-Tenancy & Security

All queries are properly scoped:
- ✅ Conversation ownership verified by `restaurantId`
- ✅ Messages filtered by tenant
- ✅ Authorization headers forwarded to bot API
- ✅ No Prisma exposed to client-side

## What's Different From Before

| Aspect | Before (Incorrect) | After (Correct) |
|--------|-------------------|----------------|
| **Writing Messages** | Direct to database | Via bot API |
| **Twilio Delivery** | Manual/missing | Handled by bot server |
| **Bot Handover** | Not triggered | Automatic (`isBotActive = false`) |
| **Real-time Events** | Not published | Published via WebSocket |
| **24h Window** | Not handled | Handled with template fallbacks |
| **Field Name** | `body` (wrong) | `content` (correct) |

## Next Steps

1. **Test thoroughly** in development
2. **Monitor bot server logs** for any API errors
3. **Verify Twilio delivery** with test messages
4. **Check real-time updates** work in multiple tabs
5. **Test agent handover** flow (bot → manual → bot)

## References

- Bot API Documentation: See `DASHBOARD_AGENT_DB_PRISMA_PROMPT.md`
- Environment Variables: See `ENVIRONMENT_VARIABLES.md`
- Database Schema: See `prisma/schema.prisma`

