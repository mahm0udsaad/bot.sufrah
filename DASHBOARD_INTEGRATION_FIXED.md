# Dashboard API Integration - Fixed Implementation

## Summary of Changes

The dashboard integration has been updated to correctly align with the bot server API documentation. Here's what was fixed:

### 1. Environment Variables
**Before:**
- `NEXT_PUBLIC_API_URL` - inconsistent naming
- `NEXT_PUBLIC_BOT_API_KEY` - confusing name

**After (with backwards compatibility):**
- `NEXT_PUBLIC_DASHBOARD_API_URL` (primary) or `NEXT_PUBLIC_API_URL` (fallback)
- `NEXT_PUBLIC_DASHBOARD_API_KEY` (primary) or `NEXT_PUBLIC_BOT_API_KEY` (fallback)
- `NEXT_PUBLIC_DASHBOARD_PAT` (unchanged)

### 2. Response Handling
All API responses now properly handle the standardized structure:
```json
{
  "data": { /* actual payload */ },
  "meta": {
    "locale": "en",
    "currency": "SAR",
    "timestamp": "2025-01-15T09:21:33.842Z"
  }
}
```

The `apiFetch` function now:
- Extracts `data` and `meta` fields when present
- Falls back to treating the entire response as data (backwards compatibility)
- Provides better error messages with status codes

### 3. Headers Configuration
All requests now include the correct headers per documentation:
- `Authorization: Bearer <DASHBOARD_PAT>` for tenant-scoped access
- `X-Restaurant-Id: <restaurantId>` required with PAT for tenant isolation
- `X-API-Key: <DASHBOARD_API_KEY>` for admin-only endpoints
- `Content-Type: application/json`
- `Accept-Language: en|ar` for localized responses

### 4. Architecture
The current architecture is **correct** and follows best practices:

```
┌─────────────────────────────────────────────────────────────┐
│  UI Components (dashboard-overview.tsx, etc.)                │
│  - Display data                                              │
│  - Handle user interactions                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  React Hooks (use-dashboard-api.ts)                          │
│  - State management                                          │
│  - Loading states                                            │
│  - Error handling                                            │
│  - Call server actions                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Server Actions (dashboard-actions.ts) - 'use server'        │
│  - Execute on server side                                    │
│  - Keep secrets secure                                       │
│  - Make actual API calls                                     │
│  - Avoid CORS issues                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Bot Server API (external service)                           │
│  - Process requests                                          │
│  - Return data                                               │
└─────────────────────────────────────────────────────────────┘
```

**dashboard-api.ts** is now deprecated for making API calls but still used for type definitions.

## Environment Setup

Create or update your `.env.local`:

```bash
# Bot Server API
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3000  # or https://bot.sufrah.sa
NEXT_PUBLIC_DASHBOARD_PAT=your-personal-access-token
NEXT_PUBLIC_DASHBOARD_API_KEY=your-api-key-for-admin-endpoints

# Restaurant/Bot ID (your tenant identifier)
NEXT_PUBLIC_RESTAURANT_ID=your-restaurant-bot-id
```

## Verified Endpoints

All endpoints have been audited and verified against the documentation:

### Core Endpoints
- ✅ `GET /api/tenants/:botId/overview` - Dashboard overview with KPIs
- ✅ `GET /api/bot` - Bot status and health
- ✅ `PATCH /api/bot` - Update bot settings

### Conversations
- ✅ `GET /api/conversations/summary` - List conversations
- ✅ `GET /api/conversations/:id/transcript` - Full transcript
- ✅ `PATCH /api/conversations/:id` - Update conversation
- ✅ `GET /api/conversations/:id/export` - Export conversation

### Orders
- ✅ `GET /api/orders/live` - Live orders feed
- ✅ `PATCH /api/orders/:id` - Update order status
- ✅ `GET /api/orders/stats` - Order statistics

### Ratings & Reviews
- ✅ `GET /api/ratings` - Rating analytics
- ✅ `GET /api/ratings/reviews` - Reviews list
- ✅ `GET /api/ratings/timeline` - Rating timeline

### Notifications
- ✅ `GET /api/notifications` - Notifications list
- ✅ `PATCH /api/notifications/:id` - Mark as read

### Templates
- ✅ `GET /api/templates` - Templates list
- ✅ `POST /api/templates` - Create template
- ✅ `PATCH /api/templates/:id` - Update template
- ✅ `DELETE /api/templates/:id` - Delete template

### Catalog
- ✅ `GET /api/catalog/categories` - Categories list
- ✅ `GET /api/catalog/branches` - Branches list
- ✅ `GET /api/catalog/sync-status` - Sync status

### Settings
- ✅ `GET /api/settings/profile` - Restaurant profile
- ✅ `PATCH /api/settings/profile` - Update profile
- ✅ `GET /api/settings/audit-logs` - Audit logs

### Monitoring
- ✅ `GET /api/logs` - System logs
- ✅ `GET /api/logs/export` - Export logs
- ✅ `GET /api/onboarding` - Onboarding progress
- ✅ `GET /api/health` - Health check

## Usage Examples

### In a Page Component (Server Component)
```tsx
import { getDashboardOverview } from '@/lib/dashboard-actions';

export default async function DashboardPage() {
  const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID!;
  const { data, error } = await getDashboardOverview(restaurantId, 'en', 'SAR');

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <DashboardOverview overview={data} />;
}
```

### In a Client Component (with Hook)
```tsx
'use client';

import { useDashboardOverview } from '@/hooks/use-dashboard-api';

export function DashboardClient() {
  const { data, loading, error, refetch } = useDashboardOverview('en', 'SAR');

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return <DashboardOverview overview={data} onRefresh={refetch} />;
}
```

### Making a Direct Server Action Call
```tsx
'use client';

import { updateOrderStatus } from '@/lib/dashboard-actions';

async function handleStatusChange(orderId: string, status: OrderStatus) {
  const restaurantId = user.restaurant.id;
  const result = await updateOrderStatus(orderId, status, restaurantId);
  
  if (result.error) {
    toast.error(result.error);
  } else {
    toast.success('Order updated');
  }
}
```

## Testing Checklist

- [ ] Set environment variables in `.env.local`
- [ ] Start bot server API (default: http://localhost:3000)
- [ ] Test dashboard overview page loads data
- [ ] Test conversations list and detail views
- [ ] Test orders management and status updates
- [ ] Test ratings and reviews display
- [ ] Test notifications bell
- [ ] Test catalog view (categories and branches)
- [ ] Test settings/profile page
- [ ] Test logs and monitoring pages
- [ ] Verify error handling (disconnect bot server)
- [ ] Verify localization (switch between en/ar)

## Troubleshooting

### 401/403 Errors
- Verify `NEXT_PUBLIC_DASHBOARD_PAT` is set correctly
- Verify `NEXT_PUBLIC_RESTAURANT_ID` matches your bot ID
- Check that headers include both `Authorization` and `X-Restaurant-Id`

### 404 Errors
- Verify `NEXT_PUBLIC_DASHBOARD_API_URL` points to the correct server
- Check that the bot server is running
- Verify endpoint paths match the documentation

### CORS Errors
- Should not occur since we use server actions
- If you see CORS errors, you're likely using deprecated client-side calls from `dashboard-api.ts`
- Switch to using `dashboard-actions.ts` via hooks

### Empty Data
- Check browser console for errors
- Verify the bot server has data for your restaurant ID
- Try the `/api/health` endpoint to verify connectivity

## Migration from Old Implementation

If you have existing code using `dashboard-api.ts` directly:

**Before:**
```tsx
import { fetchDashboardOverview } from '@/lib/dashboard-api';

const result = await fetchDashboardOverview(restaurantId);
```

**After (Server Component):**
```tsx
import { getDashboardOverview } from '@/lib/dashboard-actions';

const result = await getDashboardOverview(restaurantId);
```

**After (Client Component):**
```tsx
import { useDashboardOverview } from '@/hooks/use-dashboard-api';

const { data, loading, error } = useDashboardOverview();
```

## What's Next

1. Update your environment variables
2. Test each page to ensure data loads correctly
3. Check browser console for any errors
4. Verify all user actions (status updates, etc.) work
5. Test with different locales (en/ar)
6. Test error scenarios (network issues, invalid data)

All dashboard pages should now correctly integrate with the bot server API following the official documentation.

