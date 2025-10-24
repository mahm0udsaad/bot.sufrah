# Migration Guide: Client API to Server Actions

## Overview

We've migrated from client-side API calls to Next.js Server Actions to solve CORS issues and improve security.

## What Changed

- **Old**: `lib/dashboard-api.ts` - Client-side API calls with CORS issues
- **New**: `lib/dashboard-actions.ts` - Server Actions that run on the server

## Benefits

✅ **No CORS Issues** - API calls run on the server  
✅ **Better Security** - API keys never exposed to client  
✅ **Simpler Code** - No need to handle auth headers in components  
✅ **Type Safety** - Full TypeScript support maintained

## Migration Examples

### Before (Client-side)

```typescript
// In a client component
'use client';

import { fetchDashboardOverview } from '@/lib/dashboard-api';

export function DashboardPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    async function load() {
      const result = await fetchDashboardOverview(restaurantId);
      if (!result.error) {
        setData(result.data);
      }
    }
    load();
  }, []);
  
  // ...
}
```

### After (Server Actions)

```typescript
// In a server component (default in Next.js App Router)
import { getDashboardOverview } from '@/lib/dashboard-actions';

export default async function DashboardPage() {
  const { data, error } = await getDashboardOverview(restaurantId);
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return <DashboardView data={data} />;
}
```

## Function Name Mapping

All functions follow a consistent pattern:

| Old (Client API) | New (Server Action) |
|-----------------|-------------------|
| `fetchDashboardOverview()` | `getDashboardOverview()` |
| `fetchConversations()` | `getConversations()` |
| `fetchOrders()` | `getOrders()` |
| `fetchRatings()` | `getRatings()` |
| `fetchReviews()` | `getReviews()` |
| `fetchTemplates()` | `getTemplates()` |
| `fetchBotStatus()` | `getBotStatus()` |
| `fetchNotifications()` | `getNotifications()` |
| `updateOrderStatus()` | `updateOrderStatus()` *(same)* |
| `updateConversation()` | `updateConversation()` *(same)* |

## Pattern: Server Component + Client UI

The recommended pattern is to fetch data in Server Components and pass it to Client Components for interactivity:

```typescript
// app/dashboard/page.tsx (Server Component)
import { getDashboardOverview } from '@/lib/dashboard-actions';
import { DashboardClient } from '@/components/dashboard-client';

export default async function DashboardPage() {
  const { data, error } = await getDashboardOverview('restaurant-123');
  
  return <DashboardClient initialData={data} />;
}

// components/dashboard-client.tsx (Client Component)
'use client';

import { useState } from 'react';

export function DashboardClient({ initialData }) {
  const [data, setData] = useState(initialData);
  
  // Handle interactions, real-time updates, etc.
  
  return <div>...</div>;
}
```

## Pattern: Client Component with Server Actions

If you need to call server actions from a client component (e.g., on button click):

```typescript
'use client';

import { updateOrderStatus } from '@/lib/dashboard-actions';

export function OrderCard({ order }) {
  const handleStatusChange = async (newStatus) => {
    const result = await updateOrderStatus(
      order.id,
      newStatus,
      'restaurant-123'
    );
    
    if (result.error) {
      console.error('Failed to update:', result.error);
    } else {
      // Update UI
    }
  };
  
  return (
    <button onClick={() => handleStatusChange('DELIVERED')}>
      Mark Delivered
    </button>
  );
}
```

## Pattern: Loading States

For loading states in Server Components, use `loading.tsx`:

```typescript
// app/orders/loading.tsx
export default function Loading() {
  return <div>Loading orders...</div>;
}

// app/orders/page.tsx
import { getOrders } from '@/lib/dashboard-actions';

export default async function OrdersPage() {
  const { data } = await getOrders('restaurant-123');
  return <OrdersList orders={data.orders} />;
}
```

## Pattern: Error Handling

For error boundaries in Server Components, use `error.tsx`:

```typescript
// app/orders/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

## Type Definitions

All TypeScript types remain in `dashboard-api.ts` for now. Import them like this:

```typescript
import type { Order, OrderStatus } from '@/lib/dashboard-api';
import { getOrders, updateOrderStatus } from '@/lib/dashboard-actions';
```

## Caching & Revalidation

Server Actions support Next.js caching:

```typescript
// Force fresh data
import { revalidatePath } from 'next/cache';

export async function updateOrder(orderId: string) {
  await updateOrderStatus(orderId, 'DELIVERED', 'rest-123');
  revalidatePath('/orders'); // Refresh the orders page
}

// Or use cache tags
fetch(url, { next: { tags: ['orders'] } });
```

## Migration Checklist

- [ ] Replace `'use client'` with server components where possible
- [ ] Change `fetch*` imports to `get*` from `dashboard-actions`
- [ ] Remove `useEffect` for initial data loading
- [ ] Move API calls to Server Components
- [ ] Pass data to Client Components as props
- [ ] Use `loading.tsx` for loading states
- [ ] Use `error.tsx` for error boundaries
- [ ] Test that CORS errors are gone
- [ ] Verify API keys are not in client bundle

## Common Issues

### "Cannot use Server Actions in Client Component"

**Problem**: Calling server actions from a component marked with `'use client'`

**Solution**: Server actions CAN be called from client components! The error usually means you're trying to define a server action inside a client component. Define it in a separate file with `'use server'` at the top.

### "Headers already sent"

**Problem**: Trying to set headers after rendering has started

**Solution**: Make sure all data fetching happens before any JSX is returned

### "Dynamic server usage"

**Problem**: Using dynamic functions in a static page

**Solution**: Add `export const dynamic = 'force-dynamic'` to the page, or use proper caching

## Questions?

Check the [Next.js Server Actions docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) for more information.

