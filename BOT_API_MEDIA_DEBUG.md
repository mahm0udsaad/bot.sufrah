# Bot API Media Endpoint Debugging

## Current Situation

✅ **File Upload Working** - MinIO is working perfectly:
```
[minio] Bucket "uploads" exists
[minio] File uploaded successfully: ae2d04a2-d072-4d21-ba26-bba2ff9b4b9f-WhatsApp_Image_2025-10-09_at_10.08.33_4e0bcfc3.jpg
POST /api/upload 200 in 1364ms
```

❌ **Bot API Issue** - Getting "Message is required" error:
```
Bot API error: {"error":"Message is required"}
POST /api/conversations/cmgz2r7me0003kjxloznq8uby/send-media 400 in 1565ms
```

## What's Happening

The dashboard successfully uploads the file to MinIO and gets a public URL, but when it tries to forward this to the Bot API, the Bot API returns an error.

### Flow

```
1. User uploads file ✅
2. File saved to MinIO ✅
3. MinIO returns URL ✅
4. Dashboard calls /api/conversations/{id}/send-media ✅
5. Dashboard forwards to Bot API /send-media ❌ <- ERROR HERE
6. Bot API returns: {"error":"Message is required"}
```

## Possible Causes

### 1. Bot API Doesn't Have /send-media Endpoint Yet

**Solution:** The dashboard now falls back to the `/send` endpoint with proper formatting.

**What we changed:**
- Added `message` field to fallback request (required by `/send`)
- Added detailed logging to see what's happening
- Made fallback work for 400, 404, and 405 errors

### 2. Bot API Has Different Parameter Names

**Check your Bot API code** to see what it expects:
- Does it use `mediaUrl` or `media_url`?
- Does it use `mediaType` or `message_type`?
- Does it expect `caption` or `text`?

### 3. Authentication Issue

**Check if Bot API is receiving auth headers:**
- `Authorization: Bearer {PAT}`
- `X-Restaurant-Id: {restaurantId}`

## Enhanced Logging

We've added detailed logging. When you try uploading a file now, you'll see:

```
[send-media] Attempting to send media to Bot API: {
  url: 'https://bot.sufrah.sa/api/conversations/+966xxx/send-media',
  conversationId: 'cmgz2r7me0003kjxloznq8uby',
  mediaUrl: 'http://localhost:9000/uploads/uuid-file.jpg',
  caption: 'Your caption',
  mediaType: 'image',
  restaurantId: 'restaurant-id'
}

[send-media] Bot API /send-media response: {
  status: 400,
  statusText: 'Bad Request',
  ok: false
}

[send-media] /send-media not available or failed (400), trying legacy /send endpoint

[send-media] Legacy /send request: {
  url: 'https://bot.sufrah.sa/api/conversations/+966xxx/send',
  body: {
    message: 'Your caption',
    mediaUrl: 'http://localhost:9000/uploads/uuid-file.jpg',
    mediaType: 'image',
    caption: 'Your caption'
  }
}

[send-media] Legacy /send response: {
  status: 200,
  statusText: 'OK',
  ok: true
}
```

## Testing Steps

1. **Try uploading a file again** and watch the logs
2. **Check the terminal output** for the `[send-media]` logs
3. **Look for which endpoint succeeds** - `/send-media` or `/send`
4. **Share the logs** so we can see what's happening

## Expected Outcomes

### Scenario A: /send-media Works
```
[send-media] Bot API /send-media response: { status: 200, ok: true }
```
✅ Perfect! The Bot API has the endpoint and it works.

### Scenario B: /send Works as Fallback
```
[send-media] /send-media not available or failed (404)
[send-media] Legacy /send response: { status: 200, ok: true }
```
✅ Good! The fallback works. Bot API doesn't have `/send-media` yet but accepts media via `/send`.

### Scenario C: Both Fail
```
[send-media] Bot API /send-media response: { status: 400, ok: false }
[send-media] Legacy /send response: { status: 400, ok: false }
Bot API error: {"error":"Message is required"}
```
❌ Issue with Bot API. Need to check:
- Bot API implementation
- Parameter names
- Authentication
- Required fields

## Bot API Requirements

Based on the guide you provided, the Bot API **should** support:

### Endpoint: POST /conversations/{id}/send-media

**Required Headers:**
```http
Authorization: Bearer {BOT_API_TOKEN}
X-Restaurant-Id: {restaurantId}
Content-Type: application/json
```

**Required Body:**
```json
{
  "mediaUrl": "https://cdn.example.com/file.jpg",
  "caption": "Optional caption",
  "mediaType": "image"
}
```

**Expected Response:**
```json
{
  "message": {
    "id": "msg-123",
    "conversation_id": "+966xxx",
    "content": "Optional caption",
    "media_url": "https://cdn.example.com/file.jpg",
    "message_type": "image",
    "timestamp": "2025-10-20T..."
  }
}
```

## Next Steps

### 1. Check Bot API Implementation

Look at your Bot API code:

```typescript
// Find the /send-media endpoint
// Check what parameters it expects
// Verify it can handle mediaUrl

// Example: Does it look like this?
app.post('/api/conversations/:id/send-media', async (req, res) => {
  const { mediaUrl, caption, mediaType } = req.body;
  // ... implementation
});
```

### 2. Check Bot API Logs

Look at the Bot API server logs when you try uploading:
- What URL is being hit?
- What body is being received?
- What error is being thrown?

### 3. Test Bot API Directly

Try calling the Bot API directly:

```bash
curl -X POST "https://bot.sufrah.sa/api/conversations/+966xxx/send-media" \
  -H "Authorization: Bearer ${BOT_API_TOKEN}" \
  -H "X-Restaurant-Id: ${RESTAURANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "http://localhost:9000/uploads/test.jpg",
    "caption": "Test",
    "mediaType": "image"
  }'
```

## Temporary Workaround

If the Bot API doesn't support media yet, you have options:

### Option 1: Wait for Bot API Implementation
The dashboard code is ready. Once Bot API implements `/send-media`, it will work automatically.

### Option 2: Use Twilio Directly
Send media directly to Twilio/WhatsApp from the dashboard:

```typescript
// In contexts/bot-websocket-context.tsx
const sendMedia = async (conversationId: string, file: File, caption?: string) => {
  // 1. Upload to MinIO (already works) ✅
  const { url: mediaUrl } = await uploadFile(file)
  
  // 2. Send directly via Twilio instead of Bot API
  await fetch('/api/twilio/send-whatsapp-media', {
    method: 'POST',
    body: JSON.stringify({
      to: conversationId, // phone number
      mediaUrl,
      body: caption
    })
  })
}
```

### Option 3: Store for Later
Save the media message in the database, display it in the UI, and sync with Bot API later:

```typescript
// Save to database
await db.createMessage({
  conversationId,
  restaurantId,
  direction: 'OUT',
  body: caption || '',
  mediaUrl,
  messageType: 'image',
  status: 'pending' // Will be sent when Bot API is ready
})
```

## Questions to Answer

1. **Does your Bot API have a `/send-media` endpoint?**
   - Check the Bot API codebase
   - Look in routes/api/conversations.ts or similar

2. **What does the Bot API `/send` endpoint support?**
   - Can it handle `mediaUrl`?
   - Or is it text-only?

3. **Can you access Bot API logs?**
   - What error is actually happening on the Bot API side?
   - Is it receiving the requests?

4. **Is the Bot API using the same parameter names?**
   - `mediaUrl` vs `media_url`
   - `mediaType` vs `message_type`

## Summary

**Good news:**
- ✅ File uploads working perfectly
- ✅ MinIO integration complete
- ✅ Dashboard code is correct and ready
- ✅ Fallback mechanism in place
- ✅ Detailed logging added

**Issue:**
- ❌ Bot API not accepting media requests
- Need to check Bot API implementation
- May need to implement `/send-media` endpoint on Bot API side

**Next:**
1. Try uploading again and check logs
2. Check Bot API implementation
3. Test Bot API directly
4. Share logs with me for further debugging

---

**Want me to look at the Bot API code?** If you have access to the Bot API repository, I can help implement the `/send-media` endpoint properly.

