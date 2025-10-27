"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Shield,
  RefreshCw,
  Plus,
  Eye,
  Calendar,
} from "lucide-react"
import { useUsageList, useUsageAlerts } from "@/hooks/use-dashboard-api"
import { renewRestaurantAllowance } from "@/lib/dashboard-actions"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

export default function AdminUsagePage() {
  const { user } = useAuth()
  const [showAlerts, setShowAlerts] = useState(false)
  const { data: usageList, loading, error, refetch } = useUsageList({ limit: 50 }, true)
  const { data: alerts, loading: alertsLoading, refetch: refetchAlerts } = useUsageAlerts({ threshold: 0.9, limit: 50 })
  const [refreshing, setRefreshing] = useState(false)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [renewAmount, setRenewAmount] = useState(1000)
  const [renewReason, setRenewReason] = useState("Monthly renewal")
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null)

  // Check if user is admin
  const isAdmin = true // TODO: Update with proper admin check

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    await refetchAlerts()
    setRefreshing(false)
  }

  const handleRenew = async (restaurantId: string, restaurantName: string) => {
    setRenewingId(restaurantId)
    try {
      const result = await renewRestaurantAllowance(restaurantId, renewAmount, renewReason)
      
      if (result.error) {
        toast.error(`Failed to renew allowance: ${result.error}`)
      } else {
        toast.success(
          `Successfully added ${renewAmount.toLocaleString()} conversations to ${restaurantName}`
        )
        await handleRefresh()
        setRenewAmount(1000)
        setRenewReason("Monthly renewal")
      }
    } catch (error) {
      console.error("Renew error:", error)
      toast.error("Failed to renew allowance")
    } finally {
      setRenewingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access this page</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Usage Data</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  const restaurants = usageList?.data || []
  const alertsData = alerts?.data || []
  const totalRestaurants = usageList?.pagination.total || 0
  const nearQuotaCount = alertsData.length

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Usage Management
              </h1>
              <p className="text-muted-foreground">Monitor and manage restaurant usage allowances</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAlerts(!showAlerts)} variant="outline">
                <AlertTriangle className={`h-4 w-4 mr-2 ${nearQuotaCount > 0 ? 'text-amber-600' : ''}`} />
                Alerts {nearQuotaCount > 0 && `(${nearQuotaCount})`}
              </Button>
              <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
                {refreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Restaurants</p>
                    <p className="text-2xl font-bold">{totalRestaurants}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Near Quota</p>
                    <p className="text-2xl font-bold">{nearQuotaCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">
                      {restaurants.filter(r => r.isActive).length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Section */}
          {showAlerts && nearQuotaCount > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="h-5 w-5" />
                  Restaurants Nearing Quota
                </CardTitle>
                <CardDescription className="text-amber-800">
                  {nearQuotaCount} restaurant{nearQuotaCount !== 1 ? 's' : ''} at ≥90% usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsData.slice(0, 5).map((alert) => (
                    <div key={alert.restaurantId} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{alert.restaurantName}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.used.toLocaleString()} / {alert.limit.toLocaleString()} 
                          ({Math.round(alert.usagePercent)}%)
                        </p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            onClick={() => setSelectedRestaurant(alert)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Renew
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Renew Allowance</DialogTitle>
                            <DialogDescription>
                              Add conversations to {alert.restaurantName}'s monthly allowance
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount (conversations)</Label>
                              <Input
                                id="amount"
                                type="number"
                                value={renewAmount}
                                onChange={(e) => setRenewAmount(Number(e.target.value))}
                                min={100}
                                step={100}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reason">Reason</Label>
                              <Input
                                id="reason"
                                value={renewReason}
                                onChange={(e) => setRenewReason(e.target.value)}
                                placeholder="e.g., Monthly renewal"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => handleRenew(alert.restaurantId, alert.restaurantName)}
                              disabled={renewingId === alert.restaurantId}
                            >
                              {renewingId === alert.restaurantId ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add {renewAmount.toLocaleString()}
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Usage</CardTitle>
              <CardDescription>
                Showing {restaurants.length} of {totalRestaurants} restaurants
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {restaurants.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No restaurant data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Restaurant</TableHead>
                        <TableHead className="text-right">This Month</TableHead>
                        <TableHead className="text-right">Monthly Limit</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restaurants.map((restaurant) => {
                        const isUnlimited = restaurant.allowance?.monthlyLimit === -1
                        const usagePercent = restaurant.usagePercent || 0
                        
                        return (
                          <TableRow key={restaurant.restaurantId}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{restaurant.restaurantName}</span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {restaurant.restaurantId.slice(0, 8)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium">
                                {restaurant.conversationsThisMonth.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {isUnlimited ? (
                                <Badge variant="secondary">Unlimited</Badge>
                              ) : (
                                <span>{restaurant.allowance?.monthlyLimit?.toLocaleString()}</span>
                              )}
                              {restaurant.adjustedBy > 0 && (
                                <Badge variant="secondary" className="ml-1 bg-green-100 text-green-800 text-xs">
                                  +{restaurant.adjustedBy}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isUnlimited ? (
                                <span className="text-muted-foreground">∞</span>
                              ) : (
                                <span>{restaurant.allowance?.monthlyRemaining?.toLocaleString()}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {!isUnlimited && (
                                <div className="space-y-1 min-w-[120px]">
                                  <Progress 
                                    value={usagePercent} 
                                    className="h-2"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(usagePercent)}%
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {restaurant.isActive ? (
                                  <Badge className="bg-green-100 text-green-800 w-fit">Active</Badge>
                                ) : (
                                  <Badge variant="secondary" className="w-fit">Inactive</Badge>
                                )}
                                {restaurant.isNearingQuota && (
                                  <Badge className="bg-amber-100 text-amber-800 w-fit">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Near Limit
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setSelectedRestaurant(restaurant)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Renew
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Renew Allowance</DialogTitle>
                                    <DialogDescription>
                                      Add conversations to {restaurant.restaurantName}'s monthly allowance
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Current Usage:</span>
                                        <span className="font-medium">{restaurant.conversationsThisMonth.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Current Limit:</span>
                                        <span className="font-medium">
                                          {isUnlimited ? 'Unlimited' : restaurant.allowance?.monthlyLimit?.toLocaleString()}
                                        </span>
                                      </div>
                                      {restaurant.adjustedBy > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Existing Top-ups:</span>
                                          <span className="font-medium text-green-600">+{restaurant.adjustedBy.toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="amount">Amount (conversations)</Label>
                                      <Input
                                        id="amount"
                                        type="number"
                                        value={renewAmount}
                                        onChange={(e) => setRenewAmount(Number(e.target.value))}
                                        min={100}
                                        step={100}
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        New effective limit: {isUnlimited ? 'Unlimited' : ((restaurant.allowance?.monthlyLimit || 0) + renewAmount).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="reason">Reason</Label>
                                      <Input
                                        id="reason"
                                        value={renewReason}
                                        onChange={(e) => setRenewReason(e.target.value)}
                                        placeholder="e.g., Monthly renewal"
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() => handleRenew(restaurant.restaurantId, restaurant.restaurantName)}
                                      disabled={renewingId === restaurant.restaurantId}
                                    >
                                      {renewingId === restaurant.restaurantId ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add {renewAmount.toLocaleString()}
                                        </>
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

