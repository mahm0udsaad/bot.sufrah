# Notifications System Implementation

## Overview
Complete implementation of the notification system with support for fetching, marking as read, real-time updates via WebSocket, and welcome broadcast functionality.

## Changes Made

### 1. Updated Notification Types & Interfaces
**File:** `lib/dashboard-api.ts`

- Updated `NotificationType` to include:
  - `order_created` - New order notifications
  - `conversation_started` - New conversation notifications  
  - `welcome_broadcast` - Welcome broadcast summary notifications
- Added `NotificationStatus` type: `'read' | 'unread'`
- Added `NotificationMetadata` interface with support for:
  - Order details (orderId, orderReference, totalCents, currency)
  - Conversation details (conversationId, customerName, customerPhone)
  - Broadcast stats (delivered, skipped, failed)
- Updated `Notification` interface with new fields:
  - `body` - Notification body text
  - `status` - Read/unread status
  - `metadata` - Rich metadata for deep-linking
- Updated `NotificationsList` to support cursor-based pagination:
  - `nextCursor` - Pagination cursor
  - `unreadCount` - Count of unread notifications

### 2. Updated Dashboard Actions
**File:** `lib/dashboard-actions.ts`

#### `getNotifications()`
- Updated to use cursor-based pagination
- Parameters: `restaurantId`, `limit`, `cursor`, `locale`
- Returns notifications with next cursor and unread count

#### `markNotificationsRead()`
- New function for bulk marking notifications as read
- Parameters: `notificationIds[]`, `restaurantId`
- Returns updated count

#### `markNotificationRead()`
- Kept for backwards compatibility
- Now calls `markNotificationsRead()` internally

#### `triggerWelcomeBroadcast()`
- New function to trigger welcome broadcast
- Parameters: `restaurantId`, `force`
- Returns delivery statistics

### 3. Updated Hooks
**File:** `hooks/use-dashboard-api.ts`

#### `useNotifications()`
Updated signature: `useNotifications(limit, pollInterval, locale)`

New features:
- Cursor-based pagination with `loadMore()`
- Bulk mark as read with `markMultipleAsRead()`
- Real-time notification support with `addNotification()`
- Returns: `{ notifications, unreadCount, nextCursor, loading, error, markAsRead, markMultipleAsRead, loadMore, refetch, addNotification }`

### 4. Real-time WebSocket Support
**File:** `contexts/realtime-context.tsx`

Added notification channel support:
- Subscribes to `ws:restaurant:{restaurantId}:notifications` channel
- Handles `notification.created` events
- New `subscribeToNotifications()` function
- Event payload structure:
  ```typescript
  {
    type: "notification.created",
    data: {
      id: "...",
      type: "conversation_started",
      title: "محادثة جديدة مع أحمد",
      body: "بدأ العميل محادثة جديدة...",
      status: "unread",
      metadata: { ... }
    }
  }
  ```

### 5. Updated NotificationsSheet Component
**File:** `components/notifications-sheet.tsx`

Features:
- Real-time notification updates via WebSocket
- Toast notifications for new notifications
- Deep-linking support:
  - Conversations: `/chats?conversation={conversationId}`
  - Orders: `/orders?order={orderId}`
- Support for new notification types:
  - `order_created` → Order icon
  - `conversation_started` → Message icon
  - `welcome_broadcast` → Broadcast icon
- Bulk mark all as read
- Beautiful UI with icons and colors per notification type

### 6. Updated NotificationsBell Component
**File:** `components/notifications-bell.tsx`

Features:
- Updated to use new notification API
- Support for new notification types and styling
- Bulk mark all as read
- Badge showing unread count (9+ for >9)

### 7. API Endpoints
Created three new API endpoints:

#### `GET /api/notifications`
**File:** `app/api/notifications/route.ts`

Fetches notifications with cursor-based pagination.

**Query Parameters:**
- `tenantId` - Restaurant/bot ID (required)
- `limit` - Number of notifications (default: 20)
- `cursor` - Pagination cursor (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "nextCursor": "cmhalv5ad0001kjzv5e8r4m1p",
    "unreadCount": 3
  }
}
```

#### `POST /api/notifications/read`
**File:** `app/api/notifications/read/route.ts`

Marks multiple notifications as read.

**Query Parameters:**
- `tenantId` - Restaurant/bot ID (required)

**Body:**
```json
{
  "notificationIds": ["id1", "id2", "id3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updatedCount": 3
  }
}
```

#### `POST /api/notifications/welcome-broadcast`
**File:** `app/api/notifications/welcome-broadcast/route.ts`

Triggers a welcome broadcast to customers.

**Request Body:**
- Per-restaurant call: `{ "force": true }`
- Admin call for specific tenant: `{ "restaurantId": "..." }`
- Admin broadcast to all: `{ "scope": "all" }`

**Response:**
```json
{
  "success": true,
  "data": {
    "delivered": 145,
    "skipped": 23,
    "failed": 2
  }
}
```

### 8. Welcome Broadcast UI
**File:** `app/bot-management/page.tsx`

Added a new "Welcome Broadcast" section to the bot management page with:
- Two buttons:
  - **Send Welcome Message** - Only sends to customers who haven't received a welcome
  - **Force Send to All** - Sends to all customers regardless
- Warning alert about using with caution
- Helpful hints explaining the difference
- Loading state during broadcast
- Success toast with delivery statistics
- Only enabled when bot status is ACTIVE

### 9. Translations
Updated both `locales/en.ts` and `locales/ar.ts` with:

```typescript
botManagement: {
  welcomeBroadcast: {
    title: "Welcome Broadcast",
    description: "Send a welcome message to all customers...",
    warning: "This will send a welcome message to customers...",
    send: "Send Welcome Message",
    sendForce: "Force Send to All",
    sending: "Sending...",
    success: "Broadcast sent: {delivered} delivered...",
    failed: "Failed to trigger welcome broadcast",
    hint1: "Regular send: Only sends to customers...",
    hint2: "Force send: Sends to all customers...",
  }
}
```

## Notification Types

### order_created
**Metadata:**
- `orderId` - Order ID for deep-linking
- `orderReference` - Human-readable order number
- `totalCents` - Order total in cents
- `currency` - Currency code (SAR)
- `conversationId` - Related conversation
- `customerName` - Customer name
- `customerPhone` - Customer phone

**Example:**
```json
{
  "id": "cmhalv5ad0001kjzv5e8r4m1p",
  "type": "order_created",
  "title": "طلب جديد من محمود سعد",
  "body": "تم استلام طلب جديد رقم 512 بقيمة 144.00 SAR.",
  "createdAt": "2025-10-28T13:42:10.511Z",
  "status": "unread",
  "metadata": {
    "orderId": "cmhalv59f0000kjzv79xt3pju",
    "orderReference": "512",
    "totalCents": 14400,
    "currency": "SAR",
    "conversationId": "cmh93png70001sa5j1odq2qho",
    "customerName": "محمود سعد",
    "customerPhone": "201157337829"
  }
}
```

### conversation_started
**Metadata:**
- `conversationId` - Conversation ID for deep-linking
- `customerName` - Customer name
- `customerPhone` - Customer phone

**Example:**
```json
{
  "type": "conversation_started",
  "title": "محادثة جديدة مع أحمد",
  "body": "بدأ العميل محادثة جديدة عبر واتساب. افتح المحادثة للرد فورًا.",
  "metadata": {
    "conversationId": "...",
    "customerName": "أحمد",
    "customerPhone": "9665..."
  }
}
```

### welcome_broadcast
**Metadata:**
- `delivered` - Number of messages delivered
- `skipped` - Number of messages skipped
- `failed` - Number of failed messages

## Real-time Flow

1. Bot server emits notification event:
```typescript
{
  type: "notification.created",
  data: { /* Notification object */ }
}
```

2. Dashboard WebSocket receives event in `realtime-context.tsx`

3. Notification is added to local state via `addNotification()`

4. Toast notification is shown to user

5. Unread count badge updates automatically

6. User clicks notification → marks as read → deep-links to relevant page

## Deep-linking

The system automatically generates deep links based on notification metadata:

- **Conversations:** `/chats?conversation={conversationId}`
- **Orders:** `/orders?order={orderId}`

When a notification is clicked:
1. Mark as read (if unread)
2. Close the sheet/popover
3. Navigate to the deep link

## Mobile-First Design

All notification components are optimized for mobile:
- Sheet on mobile (full width)
- Popover on desktop
- Touch-friendly buttons
- Responsive layout
- RTL support for Arabic

## Testing

To test the notification system:

1. **Fetch notifications:**
   ```bash
   GET https://bot.sufrah.sa/api/notifications?tenantId={botId}&limit=20
   Authorization: Bearer {PAT}
   ```

2. **Mark as read:**
   ```bash
   POST https://bot.sufrah.sa/api/notifications/read?tenantId={botId}
   Body: { "notificationIds": ["id1", "id2"] }
   ```

3. **Trigger welcome broadcast:**
   ```bash
   POST https://bot.sufrah.sa/api/notifications/welcome-broadcast
   Body: { "force": false }
   ```

4. **Test WebSocket:**
   - Connect to WebSocket server
   - Subscribe to notifications channel
   - Trigger an event (new order, new conversation)
   - Verify notification appears in real-time

## Environment Variables

Ensure these are set:
- `BOT_API_URL` - Bot server URL (default: https://bot.sufrah.sa)
- `DASHBOARD_PAT` - Dashboard Personal Access Token
- `NEXT_PUBLIC_REALTIME_WS_URL` - WebSocket server URL

## Summary

✅ All notification types updated to match new API
✅ Cursor-based pagination implemented
✅ Bulk mark as read functionality
✅ Real-time WebSocket notifications
✅ Deep-linking for conversations and orders
✅ Welcome broadcast UI and API
✅ Mobile-first responsive design
✅ Full English and Arabic translations
✅ Zero linter errors

The notification system is now fully integrated and ready for production use! 🎉

