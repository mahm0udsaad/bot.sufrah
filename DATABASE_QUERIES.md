# Database Message Queries - Implementation Guide

## Overview

The Sufrah Dashboard now fetches messages **directly from the database using Prisma**, eliminating the need to call external bot servers for message history. This document explains the implementation, available query functions, and usage patterns.

## Architecture

```
Client (chat-context.tsx)
    ↓ (fetch API)
API Routes (/api/messages, /api/conversations)
    ↓ (function calls)
Database Helpers (lib/db.ts)
    ↓ (Prisma queries)
PostgreSQL Database
```

## Database Schema

### Conversation Model
```prisma
model Conversation {
  id               String             @id @default(cuid())
  restaurantId     String             @map("restaurant_id")
  customerWa       String             @map("customer_wa")      // Normalized phone (digits only)
  customerName     String?            @map("customer_name")
  status           ConversationStatus @default(active)         // "active" | "closed"
  lastMessageAt    DateTime           @map("last_message_at")
  unreadCount      Int                @default(0) @map("unread_count")
  isBotActive      Boolean            @default(true) @map("is_bot_active")
  
  @@unique([restaurantId, customerWa])
}
```

### Message Model
```prisma
model Message {
  id             String       @id @default(cuid())
  restaurantId   String       @map("restaurant_id")
  conversationId String       @map("conversation_id")
  direction      MsgDir                                // "IN" | "OUT"
  messageType    String       @map("message_type")
  content        String       @map("body")
  mediaUrl       String?      @map("media_url")
  createdAt      DateTime     @default(now()) @map("created_at")
  
  @@index([conversationId, createdAt])
  @@index([restaurantId, createdAt])
}
```

## Phone Normalization

All phone numbers are stored in **normalized format** (digits only, no `+`, no `whatsapp:` prefix).

### Usage
```typescript
import { normalizePhone } from "@/lib/db"

const normalized = normalizePhone("whatsapp:+966501234567")  // "966501234567"
const normalized2 = normalizePhone("+966-50-123-4567")       // "966501234567"
```

## Query Functions

All query functions are available in `lib/db.ts` under the `db` export.

### 1. List Messages by Conversation ID
```typescript
db.listMessages(restaurantId: string, conversationId: string, take?: number)
```
- **Multi-tenant safe**: Requires both `restaurantId` and `conversationId`
- **Returns**: Messages in ascending chronological order
- **Default limit**: 100 messages

**Example**:
```typescript
const messages = await db.listMessages("rest_123", "conv_456", 50)
```

### 2. List Messages with Pagination Support
```typescript
db.listMessagesByConversationId(
  conversationId: string,
  opts?: { limit?: number; before?: Date }
)
```
- **Pagination**: Use `before` cursor to load older messages
- **Returns**: Messages in ascending order
- **Default limit**: 100 messages

**Example**:
```typescript
// Initial load
const messages = await db.listMessagesByConversationId("conv_123")

// Load older messages (pagination)
const oldestDate = new Date(messages[0].createdAt)
const olderMessages = await db.listMessagesByConversationId("conv_123", {
  limit: 50,
  before: oldestDate
})
```

### 3. List Messages by Restaurant and Phone
```typescript
db.listMessagesByRestaurantAndPhone(
  restaurantId: string,
  customerPhoneRaw: string,
  opts?: { limit?: number; before?: Date }
)
```
- **Auto-resolves**: Finds conversation by phone, then fetches messages
- **Phone normalization**: Automatically normalizes the phone number
- **Returns**: Messages in ascending order, or empty array if no conversation exists

**Example**:
```typescript
const messages = await db.listMessagesByRestaurantAndPhone(
  "rest_123",
  "whatsapp:+966501234567",
  { limit: 100 }
)
```

### 4. Paginated Message Loading (UI-Friendly)
```typescript
db.listMessagesPage(
  conversationId: string,
  pageSize?: number,
  before?: Date
)
```
- **Optimized for UI**: Fetches descending, reverses to ascending
- **Pagination**: Load older messages with `before` cursor
- **Default page size**: 50 messages

**Example**:
```typescript
// Initial load
const messages = await db.listMessagesPage("conv_123", 50)

// Load previous page (older messages)
const oldestDate = new Date(messages[0].createdAt)
const previousPage = await db.listMessagesPage("conv_123", 50, oldestDate)
```

### 5. Recent Messages for Restaurant (Timeline View)
```typescript
db.getRecentMessages(restaurantId: string, limit?: number)
```
- **Cross-conversation**: Fetches recent messages across all conversations
- **Returns**: Messages in descending order (newest first)
- **Use case**: Activity feed, dashboard overview

**Example**:
```typescript
const recentActivity = await db.getRecentMessages("rest_123", 20)
```

## Conversation Management

### Find or Create Conversation
```typescript
db.findOrCreateConversation(
  restaurantId: string,
  customerPhoneRaw: string,
  customerName?: string | null
)
```
- **Idempotent**: Returns existing or creates new conversation
- **Auto-normalizes**: Handles phone normalization automatically

**Example**:
```typescript
const conversation = await db.findOrCreateConversation(
  "rest_123",
  "+966501234567",
  "أحمد محمد"
)
```

### List Conversations
```typescript
db.listConversations(restaurantId: string, take?: number, cursorId?: string)
```
- **Sorted**: By `lastMessageAt` descending
- **Cursor pagination**: Use `cursorId` for pagination
- **Default limit**: 50 conversations

### Update Conversation
```typescript
db.updateConversation(
  conversationId: string,
  data: {
    status?: "active" | "closed"
    isBotActive?: boolean
    lastMessageAt?: Date
    unreadCount?: number
  }
)
```

## Message Creation

### Create Message
```typescript
db.createMessage({
  restaurantId: string
  conversationId: string
  direction: "IN" | "OUT"
  body: string
  waSid?: string          // WhatsApp SID (optional)
  mediaUrl?: string       // Media URL (optional)
})
```
- **Auto-updates**: Automatically updates conversation's `lastMessageAt`
- **Direction**: `IN` for customer messages, `OUT` for restaurant messages

**Example**:
```typescript
const message = await db.createMessage({
  restaurantId: "rest_123",
  conversationId: "conv_456",
  direction: "OUT",
  body: "مرحباً! كيف يمكنني مساعدتك؟",
})
```

## API Routes

### GET /api/messages
Query messages for a conversation.

**Query Parameters**:
- `conversationId` (required): Conversation ID
- `take` (optional): Number of messages (max 200, default 100)

**Response**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "conversationId": "conv_456",
      "restaurantId": "rest_789",
      "direction": "IN",
      "content": "السلام عليكم",
      "mediaUrl": null,
      "messageType": "text",
      "createdAt": "2025-10-15T10:30:00Z"
    }
  ]
}
```

### GET /api/conversations
List conversations for the authenticated restaurant.

**Query Parameters**:
- `take` (optional): Number of conversations (max 100, default 50)
- `cursor` (optional): Cursor ID for pagination

**Response**:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_123",
      "customerWa": "966501234567",
      "customerName": "أحمد محمد",
      "status": "active",
      "lastMessageAt": "2025-10-15T10:30:00Z",
      "unreadCount": 3,
      "isBotActive": true
    }
  ]
}
```

## Security & Multi-Tenancy

### ✅ Best Practices

1. **Always scope by restaurantId**:
   ```typescript
   // ✅ Good - tenant-scoped
   const messages = await db.listMessages(restaurantId, conversationId)
   
   // ❌ Bad - missing tenant check
   const messages = await prisma.message.findMany({ 
     where: { conversationId } 
   })
   ```

2. **Verify conversation ownership**:
   ```typescript
   // ✅ Good - verifies restaurant owns the conversation
   const conversation = await db.getConversation(restaurantId, conversationId)
   if (!conversation) {
     return NextResponse.json({ error: "Not found" }, { status: 404 })
   }
   ```

3. **Use normalized phones for lookups**:
   ```typescript
   // ✅ Good - uses normalized phone
   const conv = await db.findOrCreateConversation(restaurantId, phoneRaw)
   
   // ❌ Bad - phone format mismatch
   const conv = await prisma.conversation.findFirst({
     where: { customerWa: phoneRaw }  // May not match
   })
   ```

## UI Integration

### Chat Context (React)

The `ChatProvider` in `contexts/chat-context.tsx` automatically:
- Fetches conversations on mount
- Loads messages when a conversation is selected
- Normalizes data from API responses
- Handles real-time updates via Supabase Realtime

**Status Mapping**:
- Database: `"active"` | `"closed"`
- UI: النشط (Active) | مغلق (Closed)

**Direction Mapping**:
- Database: `"IN"` | `"OUT"`
- UI: Messages from customer vs restaurant

### Message Bubble Rendering
```typescript
const isFromCustomer = message.direction === "IN"

<div className={cn(
  "message-bubble",
  isFromCustomer ? "justify-start" : "justify-end"
)}>
  <p>{message.content}</p>
  {message.mediaUrl && <img src={message.mediaUrl} />}
</div>
```

## Testing

### Test Checklist
- [ ] Create conversation with messages
- [ ] Fetch messages by conversation ID
- [ ] Fetch messages by restaurant + phone
- [ ] Pagination with `before` cursor returns older messages
- [ ] Messages are in ascending chronological order
- [ ] Phone normalization handles various formats
- [ ] Multi-tenancy: Can't access other restaurant's messages
- [ ] Create message updates conversation `lastMessageAt`

### Example Test
```typescript
// Create test data
const conv = await db.findOrCreateConversation("rest_123", "+966501234567")
await db.createMessage({
  restaurantId: "rest_123",
  conversationId: conv.id,
  direction: "IN",
  body: "Test message 1"
})

// Fetch and verify
const messages = await db.listMessages("rest_123", conv.id)
expect(messages).toHaveLength(1)
expect(messages[0].content).toBe("Test message 1")
expect(messages[0].direction).toBe("IN")
```

## Performance Considerations

### Indexes
The schema includes optimized indexes:
```prisma
@@index([conversationId, createdAt])  // Fast message queries
@@index([restaurantId, createdAt])    // Fast restaurant queries
@@index([restaurantId, lastMessageAt]) // Fast conversation sorting
```

### Pagination
For large message histories:
- Use `listMessagesPage()` with cursor-based pagination
- Load in chunks of 50-100 messages
- Keep the most recent messages in memory
- Load older messages on scroll

### Caching
Consider implementing:
- Client-side message caching in React state
- Redis caching for frequently accessed conversations
- Optimistic updates for sent messages

## Migration from Bot Server

If migrating from calling the bot server:

### Before
```typescript
const response = await fetch(`${BOT_SERVER}/messages?conversationId=${id}`)
const messages = await response.json()
```

### After
```typescript
const messages = await db.listMessages(restaurantId, conversationId)
```

### Benefits
- ✅ Faster: No network hop to bot server
- ✅ Simpler: Direct database access
- ✅ Reliable: No external dependency
- ✅ Consistent: Same data source as bot
- ✅ Scalable: Optimized database queries

## Environment Setup

Ensure `.env` includes:
```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
```

Prisma is already configured and client is generated. To regenerate:
```bash
npx prisma generate
```

## Summary

✅ **Implemented**: Direct Prisma database queries for all message operations  
✅ **Multi-tenant**: All queries scoped to authenticated restaurant  
✅ **Phone Normalization**: Automatic phone number normalization  
✅ **Pagination**: Cursor-based pagination support  
✅ **Type-Safe**: Full TypeScript support with Prisma types  
✅ **Performant**: Optimized indexes and query patterns  
✅ **Secure**: Restaurant-scoped access control  

The dashboard now has full access to message history without depending on external services.

