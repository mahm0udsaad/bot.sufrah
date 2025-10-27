# Usage API Integration Guide

This document explains how the Sufrah Dashboard integrates with the Usage APIs for managing restaurant conversation allowances and monitoring quota usage.

## Overview

The dashboard now supports full integration with the backend Usage APIs, enabling:
- **Restaurant View**: Monitor your own usage and allowance
- **Admin View**: Manage all restaurants' usage, renew allowances, and view quota alerts

## Architecture

### 1. API Layer (`lib/dashboard-api.ts`)

Defines TypeScript interfaces and client-side API functions:

```typescript
// Key interfaces
interface UsageAllowance {
  dailyLimit: number;
  dailyRemaining: number;
  monthlyLimit: number;
  monthlyRemaining: number;
}

interface UsageRecord {
  restaurantId: string;
  restaurantName: string;
  conversationsThisMonth: number;
  lastConversationAt: string | null;
  allowance: UsageAllowance;
  adjustedBy: number;  // Top-ups this month
  usagePercent?: number;
  isNearingQuota: boolean;
  firstActivity: string | null;
  lastActivity: string | null;
  isActive: boolean;
}
```

### 2. Server Actions (`lib/dashboard-actions.ts`)

Server-side functions that call the backend API:

```typescript
// Restaurant view (PAT authentication)
export async function getSingleRestaurantUsage(
  restaurantId: string,
  locale: Locale = 'en'
)

// Admin view (API Key authentication)
export async function getUsageList(params, useApiKey = false)
export async function getUsageDetail(restaurantId, locale)
export async function getUsageAlerts(params)
export async function renewRestaurantAllowance(restaurantId, amount, reason)
```

### 3. React Hooks (`hooks/use-dashboard-api.ts`)

Custom hooks for easy component integration:

```typescript
// Restaurant usage hook
export function useRestaurantUsage(locale = 'en')

// Admin hooks
export function useUsageList(params, useApiKey = false)
export function useUsageDetail(restaurantId, locale)
export function useUsageAlerts(params)
```

## Pages

### 1. Restaurant Usage Page (`/usage`)

**Location**: `app/usage/page.tsx`

**Features**:
- Real-time usage display
- Progress bar with percentage
- Near-quota warnings
- Allowance details (daily/monthly limits)
- Top-up visibility
- Activity status

**Usage**:
```tsx
const { data: usage, loading, error, refetch } = useRestaurantUsage('en')
```

**Key Metrics Displayed**:
- Conversations this month
- Monthly limit (with unlimited support)
- Monthly remaining
- Usage percentage
- Top-ups (adjustedBy)
- Daily limits and remaining
- Last conversation timestamp
- Activity status (active/inactive)

### 2. Admin Usage Management (`/admin/usage`)

**Location**: `app/admin/usage/page.tsx`

**Features**:
- View all restaurants' usage
- Near-quota alerts dashboard
- Renew allowances with custom amounts
- Filter and search capabilities
- Batch operations support
- Real-time refresh

**Admin Actions**:

#### Renew Allowance
```typescript
await renewRestaurantAllowance(
  restaurantId,
  1000,  // amount
  'Monthly renewal'  // reason
)
```

**Response includes**:
- New effective limit
- Updated remaining count
- New usage percentage
- Updated quota warning status

## API Endpoints Used

### Restaurant Endpoints (PAT)

#### Get Own Usage
```
GET /api/usage
Headers:
  Authorization: Bearer <PAT>
  X-Restaurant-Id: <restaurantId>
```

**Response**:
```json
{
  "restaurantId": "cuid123",
  "restaurantName": "Example Restaurant",
  "conversationsThisMonth": 45,
  "lastConversationAt": "2025-10-20T15:30:00.000Z",
  "allowance": {
    "dailyLimit": 1000,
    "dailyRemaining": 1000,
    "monthlyLimit": 2000,
    "monthlyRemaining": 1955
  },
  "adjustedBy": 1000,
  "usagePercent": 2.25,
  "isNearingQuota": false,
  "firstActivity": "2025-09-01T08:00:00.000Z",
  "lastActivity": "2025-10-20T15:30:00.000Z",
  "isActive": true
}
```

### Admin Endpoints (API Key)

#### List All Usage
```
GET /api/usage?limit=20&offset=0
Headers:
  X-API-Key: <BOT_API_KEY>
```

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Detailed Usage
```
GET /api/usage/:restaurantId
Headers:
  X-API-Key: <BOT_API_KEY>
```

**Response** includes 6-month history:
```json
{
  ...UsageRecord,
  "history": [
    {
      "month": 10,
      "year": 2025,
      "conversationCount": 45,
      "lastConversationAt": "2025-10-20T15:30:00.000Z"
    }
  ]
}
```

#### Get Near-Quota Alerts
```
GET /api/usage/alerts?threshold=0.9&limit=50&offset=0
Headers:
  X-API-Key: <BOT_API_KEY>
```

**Response**:
```json
{
  "data": [
    {
      "restaurantId": "cuid999",
      "restaurantName": "High Usage",
      "used": 910,
      "limit": 1000,
      "remaining": 90,
      "usagePercent": 91.0,
      "isNearingQuota": true,
      "adjustedBy": 0
    }
  ],
  "pagination": {...},
  "threshold": 0.9
}
```

#### Renew Allowance
```
POST /api/admin/usage/:restaurantId/renew
Headers:
  X-API-Key: <BOT_API_KEY>
  Content-Type: application/json
Body:
{
  "amount": 1000,
  "reason": "Manual renewal"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "used": 45,
    "limit": 1000,
    "effectiveLimit": 2000,
    "adjustedBy": 1000,
    "remaining": 1955,
    "usagePercent": 2.25,
    "isNearingQuota": false
  }
}
```

## Authentication

### PAT (Personal Access Token) - Restaurant View
```typescript
headers: {
  'Authorization': `Bearer ${DASHBOARD_PAT}`,
  'X-Restaurant-Id': restaurantId
}
```

### API Key - Admin View
```typescript
headers: {
  'X-API-Key': DASHBOARD_API_KEY
}
```

## UI Components

### Usage Progress Bar
Shows usage percentage with color coding:
- Green: < 70%
- Amber: 70-89%
- Red: ≥ 90%

### Near-Quota Warning
Automatically displays when `isNearingQuota` is true (≥90% usage):
```tsx
{isNearingQuota && (
  <div className="bg-amber-50 border-amber-200">
    <AlertTriangle />
    You're approaching your monthly limit
  </div>
)}
```

### Top-up Badge
Shows additional allowance granted:
```tsx
{adjustedBy > 0 && (
  <Badge className="bg-green-100">
    +{adjustedBy.toLocaleString()}
  </Badge>
)}
```

### Renew Dialog
Admin interface for adding allowance:
- Amount input (default: 1000)
- Reason input
- Shows current usage stats
- Calculates new effective limit
- Confirms action

## Mobile-First Design

All components are optimized for mobile:
- Responsive grid layouts
- Touch-friendly buttons
- Swipe-friendly tables
- Collapsible sections
- Progressive disclosure

## Error Handling

### Loading States
```tsx
if (loading) return <Loader2 className="animate-spin" />
```

### Error States
```tsx
if (error) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">Error</CardTitle>
        <CardDescription>{error}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={refetch}>Retry</Button>
      </CardContent>
    </Card>
  )
}
```

### Network Errors
All API calls include try-catch blocks and return error messages in consistent format:
```typescript
{
  data: null,
  error: 'Error message'
}
```

## Special Cases

### Unlimited Plans
When `monthlyLimit === -1`:
- Display "Unlimited" instead of numeric limit
- Hide progress bar
- Skip percentage calculations
- Show special badge

```tsx
const isUnlimited = monthlyLimit === -1

{isUnlimited ? (
  <Badge>Unlimited</Badge>
) : (
  <Progress value={usagePercent} />
)}
```

### Zero Usage
Gracefully handles restaurants with no conversations:
```tsx
conversationsThisMonth: 0
usagePercent: 0
isNearingQuota: false
```

### Multiple Top-ups
Automatically accumulates in `adjustedBy`:
- First renewal: +1000 → adjustedBy = 1000
- Second renewal: +500 → adjustedBy = 1500
- Total effective limit = plan limit + 1500

## Refresh Strategy

### Manual Refresh
```tsx
const [refreshing, setRefreshing] = useState(false)

const handleRefresh = async () => {
  setRefreshing(true)
  await refetch()
  setRefreshing(false)
}
```

### Auto-refresh
Optional polling can be added:
```tsx
useEffect(() => {
  const interval = setInterval(refetch, 60000) // Every minute
  return () => clearInterval(interval)
}, [refetch])
```

## Testing

### Test Scenarios

1. **Normal Usage** (< 70%)
   - Progress bar should be green
   - No warnings displayed

2. **High Usage** (70-89%)
   - Progress bar should be amber
   - No critical warnings

3. **Near Quota** (≥ 90%)
   - Progress bar should be red
   - Warning message displayed
   - `isNearingQuota` badge shown

4. **Unlimited Plan**
   - No progress bar
   - "Unlimited" badge
   - No percentage shown

5. **With Top-ups**
   - Green +X badge displayed
   - Effective limit calculated correctly
   - Usage percentage based on effective limit

6. **Renew Allowance**
   - Dialog opens with current stats
   - Amount input works
   - Success updates UI immediately
   - Error shows toast notification

## Environment Variables

Required in `.env.local`:

```bash
# Backend API URL (must be absolute)
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3000

# PAT for restaurant authentication
NEXT_PUBLIC_DASHBOARD_PAT=your_pat_here

# API Key for admin operations
NEXT_PUBLIC_DASHBOARD_API_KEY=your_api_key_here
```

## Navigation

The usage pages are accessible via:
- Restaurant: `/usage` (in main navigation)
- Admin: `/admin/usage` (in admin section)

Both are protected by `<AuthGuard>` and wrapped in `<DashboardLayout>`.

## Future Enhancements

Potential improvements:
1. Historical usage charts (using `history` array)
2. Usage predictions based on trends
3. Automated renewal policies
4. Bulk operations for admins
5. Export usage reports
6. Email alerts for near-quota
7. Custom threshold configuration
8. Usage analytics dashboard

## Troubleshooting

### "API URL not configured"
- Check `NEXT_PUBLIC_DASHBOARD_API_URL` is set
- Ensure it's an absolute URL (http:// or https://)

### "Received HTML instead of JSON"
- Backend endpoint doesn't exist
- Wrong API URL (pointing to wrong server)

### 401 Unauthorized
- Check PAT or API Key is correct
- Verify headers are sent properly

### 404 Restaurant Not Found
- Restaurant ID is invalid
- Restaurant not in database

### Empty data
- No restaurants in system yet
- All restaurants filtered out
- Database connection issue

## Summary

The Usage API integration provides:
- ✅ Real-time usage monitoring
- ✅ Admin management capabilities
- ✅ Quota warnings and alerts
- ✅ Flexible allowance renewal
- ✅ Mobile-first responsive design
- ✅ Comprehensive error handling
- ✅ Type-safe API integration
- ✅ Unlimited plan support
- ✅ Top-up tracking
- ✅ Activity monitoring

All components follow best practices for React hooks, TypeScript typing, and modern UI/UX patterns.

