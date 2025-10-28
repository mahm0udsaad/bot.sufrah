# Duplicate Chat Bug Fix

## Problem Summary
Users were seeing **two types of duplication** in the chat interface:
1. **Duplicate messages** - When a user sent a message, it appeared 2-3 times in the chat
2. **Duplicate conversations** - The same customer (same phone number) appeared multiple times in the conversation list

## Root Causes

### Issue 1: Duplicate Messages
**Cause:** The WebSocket was handling BOTH `message.sent` AND `message.created` events for the same message, combined with optimistic UI updates.

**Flow:**
1. User sends message → Optimistic update adds it to UI immediately ✅
2. Server sends `message.sent` WebSocket event → Handler adds the message again ❌
3. Server sends `message.created` WebSocket event → Handler adds the message AGAIN ❌
4. **Result:** Same message appears 2-3 times

### Issue 2: Duplicate Conversations
**Cause:** Multiple conversation records exist in the database for the same phone number, and there was no frontend deduplication.

**Flow:**
1. Database has 2+ conversations for phone `201157337829` with different IDs
2. API returns all conversations without deduplication
3. Frontend displays all of them
4. **Result:** "Mahmoud Saad (201157337829)" appears twice in the list

## Solutions Implemented

### Fix 1: Eliminate Duplicate Messages

#### A. Ignore `message.sent` Events
**File:** `contexts/bot-websocket-context.tsx`

```typescript
case "message.created":
  // Only handle message.created to avoid duplicates
  {
    // ... process message
    messageHandlers.current.forEach((handler) => handler(normalized))
    
    // Update conversation metadata
    setConversations((prev) => {
      // Update last_message_at for proper sorting
    })
  }
  break

case "message.sent":
  // Ignore to prevent duplicates
  console.log("Ignoring message.sent event to prevent duplicate messages")
  break
```

#### B. Track Processed Messages
**File:** `components/chat/ChatInterface.tsx`

```typescript
// Add ref to track processed message IDs
const processedMessageIds = useRef<Set<string>>(new Set())

// Mark sent messages as processed
const handleSendMessage = async (text: string) => {
  const sentMessage = await sendMessage(selectedConversationId, text)
  processedMessageIds.current.add(sentMessage.id) // ✅ Mark as processed
  // Add to UI optimistically
}

// Skip WebSocket duplicates
useEffect(() => {
  const unsubscribe = subscribeToMessages((message) => {
    if (processedMessageIds.current.has(message.id)) {
      console.log('Skipping duplicate from WebSocket')
      return // ✅ Skip if already processed
    }
    // Add to UI
  })
}, [])
```

#### C. Mark Initial Messages as Processed
When loading conversation history, mark all message IDs to prevent WebSocket duplicates:

```typescript
const loadConversationMessages = async (conversationId: string) => {
  const fetchedMessages = await fetchMessages(conversationId)
  
  // Mark all as processed to prevent WebSocket duplicates
  fetchedMessages.forEach(msg => processedMessageIds.current.add(msg.id))
  
  setMessages(...)
}
```

### Fix 2: Deduplicate Conversations

**File:** `contexts/bot-websocket-context.tsx`

Added a deduplication function that ensures each phone number appears only once:

```typescript
function deduplicateConversationsByPhone(conversations: BotConversation[]): BotConversation[] {
  const phoneMap = new Map<string, BotConversation>()
  
  // Sort by most recent first
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )
  
  // Keep only the first (most recent) conversation for each phone
  for (const conv of sorted) {
    const phone = conv.customer_phone?.trim()
    if (phone && !phoneMap.has(phone)) {
      phoneMap.set(phone, conv)
    }
  }
  
  return Array.from(phoneMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )
}
```

Applied deduplication in:
- `fetchConversations()` - When loading conversations from API
- `conversation.updated` handler - When receiving updates via WebSocket

## Testing Checklist

After deploying these fixes, verify:

- [ ] Send a message from dashboard → Should appear exactly **once**
- [ ] Customer sends a message → Should appear exactly **once**
- [ ] Check conversation list → Each phone number appears exactly **once**
- [ ] Send multiple messages rapidly → All appear once, no duplicates
- [ ] Refresh page → Conversations still deduplicated
- [ ] Bot sends automated message → Appears once

## Long-term Recommendations

### 1. Fix Database Duplicates
The database should have a **UNIQUE constraint** on `(restaurant_id, customer_phone)` to prevent duplicate conversations:

```sql
CREATE UNIQUE INDEX idx_conversations_restaurant_phone 
ON conversations(restaurant_id, customer_phone) 
WHERE status = 'active';
```

### 2. Server-Side Deduplication
The bot server's `/api/db/conversations` endpoint should deduplicate by phone number before returning results.

### 3. Merge Duplicate Conversations
Run a one-time migration to:
1. Find duplicate conversations (same phone, same restaurant)
2. Merge messages into the newest conversation
3. Delete old conversations

### 4. Standardize WebSocket Events
Consider having the bot server send **only one event type** per message:
- Either `message.created` OR `message.sent`, not both
- This eliminates the need for frontend filtering

## Files Modified

1. ✅ `contexts/bot-websocket-context.tsx`
   - Added `deduplicateConversationsByPhone()` function
   - Ignore `message.sent` events
   - Apply deduplication on fetch and WebSocket updates
   - Update conversation metadata on `message.created`

2. ✅ `components/chat/ChatInterface.tsx`
   - Added `processedMessageIds` ref
   - Mark sent messages as processed
   - Mark initial messages as processed
   - Skip WebSocket duplicates

## Impact
- ✅ Eliminates duplicate messages in chat
- ✅ Eliminates duplicate conversations in list
- ✅ Improves user experience
- ✅ Prevents data inconsistencies
- ⚠️ Temporary solution - database should be fixed long-term

