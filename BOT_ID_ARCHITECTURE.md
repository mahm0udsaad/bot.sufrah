# Bot ID Architecture - Correct Implementation

## Problem Statement

The dashboard was receiving **403 Forbidden** errors when calling the bot server API because it was using mismatched IDs:
- **Authentication Header (`X-Restaurant-Id`):** One ID
- **URL Path:** A different ID
- **Root Cause:** Dashboard was generating its own Bot IDs locally instead of using the Bot IDs from the external bot server

## Solution Overview

The dashboard must use **Bot IDs from the external bot server** (`bot.sufrah.sa`), not locally-generated IDs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Restaurant Registration Flow                 │
└─────────────────────────────────────────────────────────────────┘

1. User registers WhatsApp number via Dashboard
   ↓
2. Dashboard creates Twilio sender
   ↓
3. ✅ Dashboard calls External Bot Server API
   POST https://bot.sufrah.sa/api/admin/bots
   ↓
4. ✅ Bot Server creates bot and returns Bot ID
   Response: { id: "cmh93958o0004sauw8iv09f7n", ... }
   ↓
5. ✅ Dashboard saves RestaurantBot with THAT Bot ID
   prisma.restaurantBot.create({ 
     data: { 
       id: externalBotId,  // ← Use external server's ID
       ...
     } 
   })
   ↓
6. ✅ All future API calls use this Bot ID
   - X-Restaurant-Id: cmh93958o0004sauw8iv09f7n
   - URL: /api/tenants/cmh93958o0004sauw8iv09f7n/overview
```

## Database Schema

```
User
 └── Restaurant (id: "cmglbn6vk0002savgy9f8zo8s")
      └── RestaurantBot (id: "cmh93958o0004sauw8iv09f7n")  ← From external server
           └── One-to-one relationship via restaurantId
```

## Two Types of IDs

| ID Type | Purpose | Example | Used For |
|---------|---------|---------|----------|
| **Restaurant ID** | Internal database operations | `cmglbn6vk0002savgy9f8zo8s` | Prisma queries, database relationships |
| **Bot ID (Tenant ID)** | External API calls | `cmh93958o0004sauw8iv09f7n` | Bot server API calls, multi-tenancy |

## Implementation Details

### 1. Onboarding Flow (`/api/onboarding/whatsapp/start`)

**Updated Flow:**

```typescript
// Step 1-5: Create Twilio sender (unchanged)

// Step 6: Register bot with EXTERNAL server first
const externalBotResponse = await fetch(`${BOT_API_URL}/admin/bots`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${BOT_API_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: displayName,
    restaurantName: restaurant.name,
    whatsappNumber: normalizedPhone,
    accountSid,
    authToken,
    senderSid: senderData.sid,
    wabaId: wabaId,
    status: "VERIFYING",
    isActive: true,
  }),
})

const externalBot = await externalBotResponse.json()
const externalBotId = externalBot.id  // ← This is the Bot ID we need

// Step 7: Save to local database with EXTERNAL Bot ID
const bot = await prisma.restaurantBot.create({
  data: {
    id: externalBotId,  // ✅ Use external server's ID
    accountSid,
    name: displayName,
    restaurantName: restaurant.name,
    whatsappNumber: normalizedPhone,
    // ... other fields
    restaurantId: restaurant.id,
  },
})
```

### 2. Link Sender Flow (`/api/onboarding/link-sender`)

**Updated Flow:**

```typescript
// Step 1: Fetch bot from external server
const externalBot = await fetch(`${BOT_API_URL}/admin/bots/${botId}`)
const extBot = await externalBot.json()

// Step 2: Create local record with EXTERNAL Bot ID
const localBot = await prisma.restaurantBot.create({ 
  data: { 
    id: botId,  // ✅ Use the Bot ID from external server
    accountSid: extBot.accountSid,
    name: extBot.name,
    restaurantName: extBot.restaurantName,
    whatsappNumber: extBot.whatsappNumber,
    // ... other fields
    restaurantId: currentRestaurantId 
  } 
})
```

### 3. Auth API (`/api/auth/me`)

**Already Correct:**

```typescript
const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
const restaurantBot = await prisma.restaurantBot.findFirst({ 
  where: { restaurantId: restaurant.id } 
})

return {
  id: user.id,
  phone_number: user.phone,
  name: user.name,
  restaurant: restaurant,
  tenantId: restaurantBot?.id ?? null,  // ✅ Returns external Bot ID
}
```

### 4. Dashboard API Calls

**Server Components:**

```typescript
// app/page.tsx
const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
const tenantId = restaurant.bots?.id || restaurant.id  // ✅ Bot ID first

const result = await getDashboardOverview(tenantId, locale, "SAR")
```

**Client Components:**

```typescript
// hooks/use-dashboard-api.ts
const { user } = useAuth()
const tenantId = user?.tenantId || user?.restaurant?.id  // ✅ Bot ID first

const headers = {
  'Authorization': `Bearer ${token}`,
  'X-Restaurant-Id': tenantId,  // ✅ Bot ID
}

const response = await fetch(
  `${BOT_API_URL}/tenants/${tenantId}/overview`,  // ✅ Bot ID in URL
  { headers }
)
```

## Environment Variables

### Backend (Already Correct)
```bash
BOT_API_TOKEN=sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM
DASHBOARD_PAT=sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM
BOT_API_URL=https://bot.sufrah.sa/api
BOT_URL=https://bot.sufrah.sa
```

### Frontend (Handled Automatically)
No hardcoded IDs needed! The Bot ID flows from:
1. Database → Auth API (`/api/auth/me`)
2. Auth API → Frontend Context (`useAuth()`)
3. Frontend Context → All API calls

## How It Works Now

### New Restaurant Registration

1. **User fills onboarding form** with WhatsApp number
2. **Dashboard creates Twilio sender** (Step 1-5)
3. **Dashboard calls bot server:** `POST https://bot.sufrah.sa/api/admin/bots`
4. **Bot server creates bot** and returns Bot ID: `cmh93958o0004sauw8iv09f7n`
5. **Dashboard saves to local DB** using that Bot ID
6. **All API calls work** because both systems use the same ID

### Existing Bot Linking

1. **User provides existing Bot ID** (e.g., from bot server admin panel)
2. **Dashboard fetches bot details** from external server
3. **Dashboard creates local record** using external Bot ID
4. **All API calls work** because IDs match

### API Call Flow

```typescript
// 1. User logs in
const user = await db.getUserByPhone(phone)

// 2. Get restaurant and bot
const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
const bot = restaurant.bots  // Bot ID: cmh93958o0004sauw8iv09f7n

// 3. Make API call with Bot ID
const response = await fetch(
  `https://bot.sufrah.sa/api/tenants/${bot.id}/overview`,  // ← Bot ID in URL
  {
    headers: {
      'Authorization': 'Bearer sufrah_bot_...',
      'X-Restaurant-Id': bot.id,  // ← Bot ID in header
    }
  }
)

// ✅ SUCCESS: 200 OK
```

## Testing

### Check Current Configuration

```bash
# See all bots in database
bun run scripts/checkBotConfig.ts

# Check specific restaurant
bun run scripts/checkBotConfig.ts +966573610338
```

### Test API Call

```bash
# Get Bot ID from database first
BOT_ID=$(bun run scripts/checkBotConfig.ts +966573610338 | grep "Bot ID:" | awk '{print $3}')

# Test API call
curl -X GET \
  "https://bot.sufrah.sa/api/tenants/${BOT_ID}/overview?currency=SAR" \
  -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM" \
  -H "X-Restaurant-Id: ${BOT_ID}"

# Should return: 200 OK with dashboard data
```

### Manual Bot ID Update (If Needed)

If you have an existing restaurant with wrong Bot ID:

```bash
# Update to use correct external Bot ID
bun run scripts/updateBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n
```

## Migration Path for Existing Restaurants

If you have existing restaurants with locally-generated Bot IDs:

1. **Option A: Re-register (Recommended)**
   - Delete local RestaurantBot record
   - Go through onboarding flow again
   - This will register with external server and get correct Bot ID

2. **Option B: Manual Sync**
   - Get Bot ID from external bot server
   - Use `scripts/updateBotId.ts` to update local record
   - Verify with `scripts/checkBotConfig.ts`

3. **Option C: API Sync**
   - Call external bot server API to create bot
   - Update local record with returned Bot ID
   - See `scripts/updateBotId.ts` for example

## Files Modified

1. ✅ **`app/api/onboarding/whatsapp/start/route.ts`**
   - Added Step 6: Register with external bot server
   - Use external Bot ID when creating local record

2. ✅ **`app/api/onboarding/link-sender/route.ts`**
   - Use external Bot ID from parameter when creating local record

3. ✅ **`app/api/auth/me/route.ts`** (Already correct)
   - Returns bot ID as `tenantId`

4. ✅ **`lib/db.ts`** (Already correct)
   - Includes `bots` relation in restaurant query

5. ✅ **`app/page.tsx`** (Already correct)
   - Uses `restaurant.bots?.id` for API calls

## Summary

✅ **Before:** Dashboard generated its own Bot IDs → 403 Forbidden errors
✅ **After:** Dashboard uses external server's Bot IDs → Everything works

The key principle: **Bot IDs must come from the external bot server**, not be generated locally.

---

**Last Updated:** October 27, 2025
**Status:** ✅ Implemented and Tested

