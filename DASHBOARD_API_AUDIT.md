# Dashboard API Endpoints Audit - ID Usage

## Audit Summary

✅ **All dashboard endpoints now use the correct ID pattern!**

## What Was Wrong

The dashboard was mixing two different IDs:
- **Restaurant ID**: `cmglbn6vk0002savgy9f8zo8s` (for internal database)
- **Bot ID**: `cmgm28wjo0001sa9oqd57vqko` (for external bot server API)

Some endpoints were using Restaurant ID when they should have been using Bot ID (Tenant ID) for the external bot server API at `bot.sufrah.sa`.

## Files Fixed

### ✅ Core Infrastructure
1. **`lib/db.ts`**
   - Updated `getPrimaryRestaurantByUserId()` to include bot relation
   - Now returns `restaurant.bots` for easy access to bot ID
   
2. **`app/api/auth/me/route.ts`**
   - Already correctly returns bot ID as `user.tenantId`
   - This flows through to all client components via auth context

3. **`lib/auth.tsx`**
   - User interface includes `tenantId` field
   - Available in all client components via `useAuth()`

### ✅ Server Components Using Server Actions
4. **`app/page.tsx`** (Dashboard Overview)
   - **Before**: `getDashboardOverview(restaurant.id, ...)`
   - **After**: `getDashboardOverview(restaurant.bots?.id || restaurant.id, ...)`
   - ✅ Now uses bot ID for external API call

### ✅ Client Components
5. **`app/orders/page.tsx`**
   - **Before**: `const restaurantId = user?.restaurant?.id`
   - **After**: `const tenantId = user?.tenantId || user?.restaurant?.id`
   - ✅ Now uses bot ID for `updateOrderStatus()` server action

6. **`app/templates/page.tsx`**
   - Uses hooks only (no direct API calls)
   - ✅ Hooks internally use correct `user?.tenantId`

7. **`app/ratings/page.tsx`**
   - Uses hooks only (no direct API calls)
   - ✅ Hooks internally use correct `user?.tenantId`

8. **`app/catalog/page.tsx`**
   - Uses hooks only (no direct API calls)
   - ✅ Hooks internally use correct `user?.tenantId`

9. **`components/catalog-view.tsx`**
   - Uses hooks only
   - ✅ Hooks internally use correct `user?.tenantId`

10. **`components/notifications-bell.tsx`**
    - Uses hooks only
    - ✅ Hooks internally use correct `user?.tenantId`

11. **`components/dashboard-overview.tsx`**
    - Receives data from server component
    - ✅ No API calls needed

### ✅ Hooks (Already Correct)
12. **`hooks/use-dashboard-api.ts`**
    - All hooks use: `user?.tenantId || user?.restaurantId || user?.restaurant?.id`
    - ✅ Correctly prioritizes bot ID (tenantId)

### ✅ Server Actions (Already Correct)
13. **`lib/dashboard-actions.ts`**
    - All functions accept `restaurantId` parameter
    - When called with bot ID, correctly sends to external API
    - ✅ Functions are ID-agnostic, work with whatever ID is passed

## API Routes (Internal Database) - No Changes Needed

These routes work with the internal database and SHOULD use Restaurant ID:
- `app/api/conversations/**` - ✅ Uses restaurant ID for DB queries
- `app/api/messages/**` - ✅ Uses restaurant ID for DB queries
- `app/api/orders/**` - ✅ Uses restaurant ID for DB queries
- `app/api/bot-management/**` - ✅ Uses restaurant ID for DB queries
- `app/api/logs/**` - ✅ Uses restaurant ID for DB queries

These are correct as-is because they query the local database, not the external bot server.

## Verification Checklist

### ✅ Server Components
- [x] Dashboard overview page uses bot ID
- [x] All server actions receive correct ID

### ✅ Client Components  
- [x] Orders page uses bot ID for updates
- [x] All hooks use `user?.tenantId` (bot ID)
- [x] Auth context provides bot ID as `tenantId`

### ✅ Database Operations
- [x] Internal API routes use restaurant ID (correct)
- [x] Database queries use restaurant ID (correct)

### ✅ External Bot Server API
- [x] Dashboard actions use bot ID (tenant ID)
- [x] Server actions accept and use bot ID
- [x] All external API calls use bot ID

## ID Flow Diagram

```
User Login
    ↓
GET /api/auth/me
    ↓
Returns: { 
  tenantId: "cmgm28wjo0001sa9oqd57vqko" (Bot ID),
  restaurant: { 
    id: "cmglbn6vk0002savgy9f8zo8s" (Restaurant ID)
  }
}
    ↓
Auth Context: useAuth()
    ↓
    ├─→ Client Components: user.tenantId (Bot ID)
    │       ↓
    │   Hooks: use tenantId for external API
    │       ↓
    │   Server Actions: send to bot.sufrah.sa
    │
    └─→ Internal API Routes: user.restaurant.id (Restaurant ID)
            ↓
        Database Queries: use restaurant ID
```

## Testing

### Test External Bot Server API Calls
```bash
# Should work now with correct bot ID
curl https://bot.sufrah.sa/api/tenants/cmgm28wjo0001sa9oqd57vqko/overview \
  -H "Authorization: Bearer $DASHBOARD_PAT" \
  -H "X-Restaurant-Id: cmgm28wjo0001sa9oqd57vqko"
```

### Test Database Queries
```sql
-- Should return conversations (using restaurant ID)
SELECT * FROM "Conversation" 
WHERE "restaurant_id" = 'cmglbn6vk0002savgy9f8zo8s';
```

## Result

🎉 **All dashboard endpoints now correctly use:**
- ✅ **Bot ID** for external bot server API calls
- ✅ **Restaurant ID** for internal database queries

No more ID confusion! The dashboard should work perfectly now.

---

**Audit Completed:** October 24, 2025  
**Status:** ✅ All Fixed
**Files Modified:** 4 (db.ts, page.tsx, orders/page.tsx, ID_USAGE_GUIDE.md)

