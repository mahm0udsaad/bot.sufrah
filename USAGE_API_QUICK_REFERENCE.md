# Usage API Integration - Quick Reference

## 🚀 Quick Start

### Restaurant View
```tsx
import { useRestaurantUsage } from '@/hooks/use-dashboard-api'

function UsagePage() {
  const { data, loading, error, refetch } = useRestaurantUsage('en')
  
  if (loading) return <Loader2 className="animate-spin" />
  if (error) return <ErrorCard error={error} onRetry={refetch} />
  
  return (
    <div>
      <h1>Usage: {data.conversationsThisMonth} / {data.allowance.monthlyLimit}</h1>
      <Progress value={data.usagePercent} />
      {data.isNearingQuota && <Warning />}
    </div>
  )
}
```

### Admin View
```tsx
import { useUsageList, useUsageAlerts } from '@/hooks/use-dashboard-api'
import { renewRestaurantAllowance } from '@/lib/dashboard-actions'

function AdminUsagePage() {
  const { data: usage } = useUsageList({ limit: 50 }, true) // useApiKey = true
  const { data: alerts } = useUsageAlerts({ threshold: 0.9 })
  
  const handleRenew = async (restaurantId) => {
    const result = await renewRestaurantAllowance(restaurantId, 1000, 'Monthly renewal')
    if (!result.error) {
      toast.success('Renewed!')
      refetch()
    }
  }
  
  return <UsageTable data={usage.data} onRenew={handleRenew} />
}
```

## 📋 Available Hooks

### `useRestaurantUsage(locale?)`
Fetch current restaurant's usage (PAT auth).

**Returns:**
```typescript
{
  data: UsageRecord | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}
```

### `useUsageList(params?, useApiKey?)`
Fetch all restaurants (admin only).

**Params:**
```typescript
{
  limit?: number    // default: 20
  offset?: number   // default: 0
  locale?: Locale   // 'en' | 'ar'
}
```

### `useUsageAlerts(params?)`
Fetch near-quota restaurants (admin only).

**Params:**
```typescript
{
  threshold?: number  // default: 0.9 (90%)
  limit?: number      // default: 50
  offset?: number     // default: 0
  locale?: Locale
}
```

### `useUsageDetail(restaurantId, locale?)`
Fetch single restaurant with 6-month history (admin only).

## 🔑 Server Actions

### Restaurant Actions
```typescript
// Get own usage
await getSingleRestaurantUsage(restaurantId, locale)
```

### Admin Actions
```typescript
// List all
await getUsageList({ limit: 50 }, true)

// Get detail with history
await getUsageDetail(restaurantId, locale)

// Get alerts
await getUsageAlerts({ threshold: 0.9, limit: 50 })

// Renew allowance
await renewRestaurantAllowance(restaurantId, amount, reason)
```

## 🎨 UI Patterns

### Progress Bar with Color
```tsx
<Progress 
  value={usagePercent} 
  className={cn(
    'h-3',
    usagePercent >= 90 && 'bg-red-100',
    usagePercent >= 70 && usagePercent < 90 && 'bg-amber-100'
  )}
/>
```

### Near-Quota Warning
```tsx
{isNearingQuota && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      You're at {Math.round(usagePercent)}% of your limit
    </AlertDescription>
  </Alert>
)}
```

### Top-up Badge
```tsx
{adjustedBy > 0 && (
  <Badge variant="secondary" className="bg-green-100 text-green-800">
    +{adjustedBy.toLocaleString()}
  </Badge>
)}
```

### Unlimited Plan
```tsx
{monthlyLimit === -1 ? (
  <Badge>Unlimited</Badge>
) : (
  <span>{monthlyLimit.toLocaleString()}</span>
)}
```

### Loading State
```tsx
{loading && (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)}
```

### Error State
```tsx
{error && (
  <Card>
    <CardHeader>
      <CardTitle className="text-destructive">Error Loading Data</CardTitle>
      <CardDescription>{error}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={refetch} disabled={refreshing}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </CardContent>
  </Card>
)}
```

## 📊 Data Structure Cheat Sheet

```typescript
// UsageRecord
{
  restaurantId: string              // CUID
  restaurantName: string            // Display name
  conversationsThisMonth: number    // Count for current month
  lastConversationAt: string        // ISO timestamp
  allowance: {
    dailyLimit: number              // -1 = unlimited
    dailyRemaining: number          // -1 = unlimited
    monthlyLimit: number            // Base plan limit, -1 = unlimited
    monthlyRemaining: number        // effectiveLimit - used
  }
  adjustedBy: number                // Sum of top-ups this month
  usagePercent: number              // 0-100, omitted if unlimited
  isNearingQuota: boolean           // true if >= 90%
  firstActivity: string             // ISO timestamp
  lastActivity: string              // ISO timestamp
  isActive: boolean                 // Has recent activity
}
```

## 🔢 Calculations

### Effective Limit
```typescript
const effectiveLimit = monthlyLimit + adjustedBy
// Example: 1000 + 500 = 1500
```

### Usage Percent
```typescript
const usagePercent = (conversationsThisMonth / effectiveLimit) * 100
// Example: (450 / 1500) * 100 = 30%
```

### Remaining
```typescript
const remaining = effectiveLimit - conversationsThisMonth
// Example: 1500 - 450 = 1050
```

### Is Nearing Quota
```typescript
const isNearingQuota = usagePercent >= 90
// Example: 92% >= 90 = true
```

## 🎯 Common Use Cases

### Display Usage Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Usage This Month</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex justify-between">
        <span className="text-3xl font-bold">
          {data.conversationsThisMonth.toLocaleString()}
        </span>
        <span className="text-muted-foreground">
          of {data.allowance.monthlyLimit.toLocaleString()}
        </span>
      </div>
      <Progress value={data.usagePercent} />
      <div className="flex justify-between text-sm">
        <span>{Math.round(data.usagePercent)}% used</span>
        <span>{data.allowance.monthlyRemaining.toLocaleString()} remaining</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### Renew Dialog
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Renew
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Renew Allowance</DialogTitle>
      <DialogDescription>
        Add conversations to monthly allowance
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>Amount</Label>
        <Input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={100}
          step={100}
        />
      </div>
      <div>
        <Label>Reason</Label>
        <Input 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Monthly renewal"
        />
      </div>
    </div>
    <DialogFooter>
      <Button onClick={handleRenew} disabled={renewing}>
        {renewing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Add {amount.toLocaleString()}
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Usage Table Row
```tsx
<TableRow>
  <TableCell>
    <div>
      <p className="font-medium">{restaurant.restaurantName}</p>
      <p className="text-xs text-muted-foreground">
        ID: {restaurant.restaurantId.slice(0, 8)}...
      </p>
    </div>
  </TableCell>
  <TableCell className="text-right">
    {restaurant.conversationsThisMonth.toLocaleString()}
  </TableCell>
  <TableCell className="text-right">
    {restaurant.allowance.monthlyLimit === -1 ? (
      <Badge>Unlimited</Badge>
    ) : (
      <span>{restaurant.allowance.monthlyLimit.toLocaleString()}</span>
    )}
    {restaurant.adjustedBy > 0 && (
      <Badge className="ml-1 bg-green-100 text-green-800">
        +{restaurant.adjustedBy}
      </Badge>
    )}
  </TableCell>
  <TableCell>
    <div className="space-y-1">
      <Progress value={restaurant.usagePercent} />
      <span className="text-xs">{Math.round(restaurant.usagePercent)}%</span>
    </div>
  </TableCell>
  <TableCell>
    {restaurant.isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )}
    {restaurant.isNearingQuota && (
      <Badge className="bg-amber-100 text-amber-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Near Limit
      </Badge>
    )}
  </TableCell>
  <TableCell>
    <Button size="sm" onClick={() => handleRenew(restaurant.restaurantId)}>
      <Plus className="h-4 w-4 mr-1" />
      Renew
    </Button>
  </TableCell>
</TableRow>
```

## 🔍 Debugging

### Enable Debug Logging
Dashboard actions automatically log in development:
```bash
🌐 API Call: GET http://localhost:3000/api/usage
   Headers: { Authorization: 'Bearer ***', ... }
✅ Success: /api/usage
```

### Check Environment
```typescript
console.log('API_URL:', process.env.NEXT_PUBLIC_DASHBOARD_API_URL)
console.log('PAT:', process.env.NEXT_PUBLIC_DASHBOARD_PAT ? 'Set' : 'Missing')
console.log('API_KEY:', process.env.NEXT_PUBLIC_DASHBOARD_API_KEY ? 'Set' : 'Missing')
```

### Test API Directly
```bash
# Restaurant usage (PAT)
curl -H "Authorization: Bearer <PAT>" \
     -H "X-Restaurant-Id: <ID>" \
     http://localhost:3000/api/usage

# Admin list (API Key)
curl -H "X-API-Key: <KEY>" \
     http://localhost:3000/api/usage?limit=20

# Renew (API Key)
curl -X POST \
     -H "X-API-Key: <KEY>" \
     -H "Content-Type: application/json" \
     -d '{"amount":1000,"reason":"Test"}' \
     http://localhost:3000/api/admin/usage/<RESTAURANT_ID>/renew
```

## 🛡️ Type Safety

All functions are fully typed. Import types:
```typescript
import type {
  UsageRecord,
  UsageAllowance,
  UsageListResponse,
  UsageAlertsResponse,
  RenewAllowanceResponse,
} from '@/lib/dashboard-api'
```

## 🎉 That's It!

You now have everything you need to work with the Usage API integration. Check the full documentation in `USAGE_API_INTEGRATION.md` for more details.

**Happy coding! 🚀**

