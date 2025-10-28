# WebSocket Real-time Updates - Implementation Summary

## Overview
The dashboard now connects directly to the bot service's unauthenticated WebSocket at `wss://bot.sufrah.sa/ws` for real-time updates.

## Changes Made

### 1. Updated Realtime Context
**File:** `contexts/realtime-context.tsx`

#### Before
- Connected to dashboard's own WebSocket server at `ws://localhost:4000`
- Required JWT token authentication via query parameter
- Made API call to `/api/realtime/token` to get token
- Complex subscription management with channel names

#### After
- Connects directly to bot service WebSocket at `wss://bot.sufrah.sa/ws`
- **No authentication required** - unauthenticated connection
- No token API call needed
- Simplified connection logic
- Event handling via `type` field: `notification.created`, `message.created`, `order.created`

### 2. Configuration

#### Environment Variable
```bash
BOT_WS_URL=wss://bot.sufrah.sa/ws
```

**Default:** `wss://bot.sufrah.sa/ws`

**Environment-specific:**
- **Production:** `wss://bot.sufrah.sa/ws`
- **Development:** `ws://localhost:4000/ws` (if running bot service locally)
- **Staging:** `wss://staging.bot.sufrah.sa/ws`

### 3. Connection Flow

```typescript
// Simple, unauthenticated connection
const BOT_WS_URL = process.env.BOT_WS_URL || "wss://bot.sufrah.sa/ws"
const ws = new WebSocket(BOT_WS_URL)

ws.onopen = () => {
  console.log("Connected to bot WebSocket:", BOT_WS_URL)
  // No subscription message needed - just listen for events
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle events based on data.type
}
```

### 4. Event Structure

The bot service emits events with this structure:

```typescript
{
  type: "notification.created",  // Event type
  data: {                         // Event payload
    id: "...",
    type: "order_created",
    title: "طلب جديد من محمود سعد",
    body: "تم استلام طلب جديد...",
    status: "unread",
    metadata: { ... }
  }
}
```

### 5. Supported Event Types

The dashboard listens for events starting with:

#### `notification.*`
- `notification.created` - New notification created

#### `message.*`
- `message.created` - New message received
- `message.updated` - Message status updated

#### `order.*`
- `order.created` - New order placed
- `order.updated` - Order status changed

### 6. Auto-reconnection

The realtime context includes automatic reconnection with exponential backoff:

```typescript
// Reconnects with delay: 1s, 2s, 3s... up to 10s
const delay = Math.min(1000 * retryAttempt, 10000)
```

### 7. Safe Hook Usage

For components that can work with or without real-time:

```typescript
import { useSafeRealtime } from "@/contexts/realtime-context"

const realtime = useSafeRealtime()  // Returns null if provider not available

if (realtime?.subscribeToNotifications) {
  const unsubscribe = realtime.subscribeToNotifications((payload) => {
    // Handle notification
  })
}
```

## Integration with Notifications

### NotificationsSheet Component

```typescript
// Subscribe to real-time notifications
useEffect(() => {
  if (!realtime?.subscribeToNotifications) {
    return  // Fallback to polling
  }

  const unsubscribe = realtime.subscribeToNotifications((payload) => {
    if (payload.type === "notification.created" && payload.data) {
      const newNotification = payload.data
      addNotification(newNotification)  // Add to local state
      
      // Show toast
      toast.info(newNotification.title, {
        description: newNotification.body,
        duration: 5000,
      })
    }
  })
  
  return unsubscribe
}, [realtime, addNotification])
```

## Testing

### 1. Check WebSocket Connection

Open browser DevTools → Network → WS tab:
- You should see a connection to `wss://bot.sufrah.sa/ws`
- Status should be "101 Switching Protocols"
- No authentication errors

### 2. Test Real-time Events

Trigger an event on the bot service (e.g., create a new order):
- Dashboard should receive the event instantly
- Toast notification should appear
- Notification badge count should update

### 3. Test Reconnection

1. Stop the bot service WebSocket server
2. Dashboard should show "connecting" → "error"
3. Start the bot service WebSocket server
4. Dashboard should reconnect automatically

### 4. Console Logs

When connection succeeds, you should see:
```
Connected to bot WebSocket: wss://bot.sufrah.sa/ws
```

## Fallback Behavior

If WebSocket is unavailable:
- Notifications still work via **30-second polling**
- No real-time updates, but system remains functional
- No errors shown to user
- Console warning: `Real-time notifications not available`

## Architecture Benefits

✅ **Simpler:** No authentication complexity  
✅ **Direct:** No proxy/relay needed  
✅ **Scalable:** Bot service handles all connections  
✅ **Reliable:** Auto-reconnection with backoff  
✅ **Resilient:** Graceful degradation to polling  
✅ **Secure:** WebSocket over TLS (wss://)  

## Debugging

### Check Connection Status

```typescript
import { useSafeRealtime } from "@/contexts/realtime-context"

function DebugComponent() {
  const realtime = useSafeRealtime()
  
  return (
    <div>
      Status: {realtime?.status || "not available"}
      {realtime?.error && <p>Error: {realtime.error}</p>}
    </div>
  )
}
```

### Enable WebSocket Logs

Open browser DevTools → Console, filter for:
- `Connected to bot WebSocket`
- `Failed to process realtime message`
- `Realtime connection error`

## Environment Setup

Update your `.env.local`:

```bash
# Bot Service API
NEXT_PUBLIC_API_URL=https://bot.sufrah.sa

# Bot Service WebSocket (no authentication)
BOT_WS_URL=wss://bot.sufrah.sa/ws

# Other variables...
NEXT_PUBLIC_DASHBOARD_PAT=your-pat-token
```

## Next Steps

Once the bot service starts emitting events, they will automatically:

1. ✅ Flow through the WebSocket connection
2. ✅ Get dispatched to subscribers (notifications, messages, orders)
3. ✅ Update the UI in real-time
4. ✅ Show toast notifications
5. ✅ Update badge counts

No additional dashboard changes needed! 🎉

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **URL** | `ws://localhost:4000?token=...` | `wss://bot.sufrah.sa/ws` |
| **Authentication** | JWT token in query string | None (unauthenticated) |
| **Token API** | Required `/api/realtime/token` call | Not needed |
| **Configuration** | Hardcoded localhost | Configurable via env var |
| **Event Format** | Complex payload structure | Simple `{ type, data }` |
| **Channel Subscription** | Required subscription message | Listen for all events |

The dashboard is now ready to receive real-time events from the bot service! 🚀

