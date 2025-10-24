# ID Usage Guide: Restaurant ID vs Bot ID (Tenant ID)

## Overview

The dashboard interacts with TWO different systems:
1. **Internal Database** (PostgreSQL) - Uses `Restaurant ID`
2. **External Bot Server API** (bot.sufrah.sa) - Uses `Bot ID` (also called `Tenant ID`)

## Database Schema

```
Restaurant (id: cmglbn6vk0002savgy9f8zo8s)
  └── RestaurantBot (id: cmgm28wjo0001sa9oqd57vqko)
       └── One-to-one relationship via restaurantId
```

## When to Use Each ID

### ✅ Use Restaurant ID (`restaurant.id`)
**For internal database operations:**
- Querying conversations in your DB
- Querying messages in your DB  
- Querying orders in your DB
- Creating/updating database records
- Any Prisma queries

**Examples:**
```typescript
// ✅ Correct - Internal DB query
await db.listConversations(restaurant.id)
await db.createOrder({ restaurantId: restaurant.id, ... })
await prisma.message.findMany({ where: { restaurantId: restaurant.id } })
```

### ✅ Use Bot ID / Tenant ID (`restaurant.bots.id` or `user.tenantId`)
**For external bot server API calls:**
- Dashboard overview (`/api/tenants/{botId}/overview`)
- Orders stats from bot server
- Ratings analytics
- Templates management
- Bot status/management
- Any call to `https://bot.sufrah.sa`

**Examples:**
```typescript
// ✅ Correct - External API call
const tenantId = user?.tenantId || restaurant.bots?.id
await getDashboardOverview(tenantId, locale, currency)
await updateOrderStatus(orderId, status, tenantId)
```

## Implementation Patterns

### Pattern 1: Server Components (Server Actions)

```typescript
// app/page.tsx
const restaurant = await db.getPrimaryRestaurantByUserId(user.id) // includes bots relation
const tenantId = restaurant.bots?.id || restaurant.id // Use bot ID for API calls

const result = await getDashboardOverview(tenantId, locale, "SAR")
```

### Pattern 2: Client Components (via Hooks)

```typescript
// Hooks automatically use correct ID
const { user } = useAuth() // user.tenantId is the bot ID
const { orders } = useOrders() // Hook uses user?.tenantId internally

// For direct server action calls
const tenantId = user?.tenantId || user?.restaurant?.id || ''
await updateOrderStatus(orderId, status, tenantId)
```

### Pattern 3: Internal API Routes

```typescript
// app/api/conversations/route.ts
// Uses restaurant ID for database queries
const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
const conversations = await db.listConversations(restaurant.id) // ✅ Restaurant ID
```

## Files Updated to Use Correct IDs

### ✅ Server Components
- [x] `app/page.tsx` - Uses `restaurant.bots?.id` for dashboard overview
- [x] `app/orders/page.tsx` - Uses `user?.tenantId` for order status updates

### ✅ Client Hooks  
- [x] `hooks/use-dashboard-api.ts` - All hooks use `user?.tenantId || user?.restaurant?.id`

### ✅ Server Actions
- [x] `lib/dashboard-actions.ts` - All actions accept tenantId/restaurantId parameter

### ✅ Auth Context
- [x] `lib/auth.tsx` - User interface includes `tenantId` field
- [x] `app/api/auth/me/route.ts` - Returns bot ID as `tenantId`

### ✅ Database Helper
- [x] `lib/db.ts` - `getPrimaryRestaurantByUserId` includes `bots` relation

## Quick Reference

| Operation | ID Type | Example Value | Used For |
|-----------|---------|---------------|----------|
| Database queries | Restaurant ID | `cmglbn6vk0002savgy9f8zo8s` | Prisma/DB operations |
| Bot server API | Bot ID (tenantId) | `cmgm28wjo0001sa9oqd57vqko` | External API calls |
| Auth context | Bot ID (tenantId) | `cmgm28wjo0001sa9oqd57vqko` | User session info |

## How to Get the Correct ID

### In Server Components:
```typescript
const restaurant = await db.getPrimaryRestaurantByUserId(userId)
const tenantId = restaurant.bots?.id || restaurant.id // For bot server API
const restaurantId = restaurant.id // For database operations
```

### In Client Components:
```typescript
const { user } = useAuth()
const tenantId = user?.tenantId // For bot server API  
const restaurantId = user?.restaurant?.id // For database operations (if needed)
```

### In Hooks:
```typescript
// Hooks already handle this internally
const tenantId = user?.tenantId || user?.restaurantId || user?.restaurant?.id || ''
```

## Common Mistakes to Avoid

❌ **Wrong:** Using restaurant ID for bot server API
```typescript
const restaurant = await db.getPrimaryRestaurantByUserId(userId)
await getDashboardOverview(restaurant.id, ...) // ❌ Wrong ID!
```

✅ **Correct:** Using bot ID for bot server API
```typescript
const restaurant = await db.getPrimaryRestaurantByUserId(userId)
const tenantId = restaurant.bots?.id || restaurant.id
await getDashboardOverview(tenantId, ...) // ✅ Correct!
```

❌ **Wrong:** Using bot ID for database queries
```typescript
const tenantId = user?.tenantId
await db.listConversations(tenantId) // ❌ Won't find conversations!
```

✅ **Correct:** Using restaurant ID for database queries
```typescript
const restaurantId = user?.restaurant?.id
await db.listConversations(restaurantId) // ✅ Correct!
```

## Testing the Fix

To verify you're using the correct ID:

1. **Check the auth response:**
```bash
curl http://localhost:3000/api/auth/me
# Should return: { tenantId: "cmgm28wjo0001sa9oqd57vqko", ... }
```

2. **Check bot server API calls:**
```bash
# Should use bot ID in URL or X-Restaurant-Id header
curl https://bot.sufrah.sa/api/tenants/cmgm28wjo0001sa9oqd57vqko/overview \
  -H "Authorization: Bearer $DASHBOARD_PAT"
```

3. **Check database queries:**
```bash
# Should use restaurant ID in WHERE clauses
SELECT * FROM "Conversation" WHERE "restaurant_id" = 'cmglbn6vk0002savgy9f8zo8s';
```

## Summary

- **Restaurant ID** = Internal database foreign key
- **Bot ID (Tenant ID)** = External API identifier for multi-tenancy
- Always use Bot ID for `bot.sufrah.sa` API calls
- Always use Restaurant ID for Prisma/database queries
- Hooks and auth context provide the correct Bot ID as `tenantId`

---

**Last Updated:** October 24, 2025  
**Status:** ✅ All dashboard endpoints migrated to correct ID usage

