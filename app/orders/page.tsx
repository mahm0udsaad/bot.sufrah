"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, RefreshCw, Eye, Clock, Loader2, Package, DollarSign, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useOrdersPaginated, useOrderStats } from "@/hooks/use-dashboard-api"
import { updateOrderStatus } from "@/lib/dashboard-actions"
import type { Order, OrderStatus } from "@/lib/dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

const STATUS_STYLES: Record<OrderStatus, { badge: string }> = {
  CONFIRMED: { badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  PREPARING: { badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  OUT_FOR_DELIVERY: { badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  DELIVERED: { badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  CANCELLED: { badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

function OrdersContent() {
  const { user } = useAuth()
  const { t, dir, locale } = useI18n()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const isRtl = dir === "rtl"
  // Use tenantId (bot ID) for API calls to external bot server
  const tenantId = user?.tenantId || user?.restaurant?.id || ''

  // Fetch orders with pagination
  const {
    orders,
    loading: ordersLoading,
    hasMore,
    loadMore,
    reset,
    error: ordersError,
  } = useOrdersPaginated(
    20,
    statusFilter === "ALL" ? undefined : statusFilter,
    locale as 'en' | 'ar',
    'SAR'
  )

  // Fetch order statistics
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
  } = useOrderStats(30, locale as 'en' | 'ar')

  // Show errors
  useEffect(() => {
    if (ordersError) {
      toast.error(t("orders.toasts.loadFailed") || `Failed to load orders: ${ordersError}`)
    }
    if (statsError) {
      toast.error(t("orders.toasts.statsLoadFailed") || `Failed to load stats: ${statsError}`)
    }
  }, [ordersError, statsError, t])

  // Reset orders when filter changes
  useEffect(() => {
    reset()
  }, [statusFilter, reset])

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return orders

    return orders.filter((order) => {
      const customerName = order.customerName.toLowerCase()
      const orderId = order.id.toLowerCase()
      const orderRef = order.orderReference.toLowerCase()
      
      return (
        customerName.includes(query) ||
        orderId.includes(query) ||
        orderRef.includes(query)
      )
    })
  }, [orders, searchQuery])

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!tenantId) {
      toast.error(t("orders.toasts.noRestaurant") || "No restaurant selected")
      return
    }

    try {
      setUpdatingId(orderId)
      const result = await updateOrderStatus(orderId, newStatus, tenantId)
      
      if (result.error) {
        toast.error(t("orders.toasts.updateFailed") || `Failed to update: ${result.error}`)
      } else {
        toast.success(t("orders.toasts.statusChangeSuccess") || `Order ${orderId.slice(0, 8)} updated successfully`)
        reset() // Reload orders
      }
    } catch (error) {
      console.error("Order status update failed", error)
      toast.error(t("orders.toasts.updateFailed") || "Failed to update order")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRefresh = () => {
    reset()
    toast.success(t("orders.toasts.refreshed") || "Orders refreshed")
  }

  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: "CONFIRMED", label: t("orders.status.confirmed") || "Confirmed" },
    { value: "PREPARING", label: t("orders.status.preparing") || "Preparing" },
    { value: "OUT_FOR_DELIVERY", label: t("orders.status.outForDelivery") || "Out for Delivery" },
    { value: "DELIVERED", label: t("orders.status.delivered") || "Delivered" },
    { value: "CANCELLED", label: t("orders.status.cancelled") || "Cancelled" },
  ]

  const loading = ordersLoading && orders.length === 0

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("orders.header.title") || "Orders"}</h1>
          <p className="text-muted-foreground">{t("orders.header.subtitle") || "Manage and track your orders"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2", ordersLoading && "animate-spin")} />
            {t("orders.actions.refresh") || "Refresh"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("orders.actions.export") || "Export"}
          </Button>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "ALL")}>
            <SelectTrigger className="w-40" dir={dir}>
              <SelectValue placeholder={t("orders.filters.statusPlaceholder") || "Filter by status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("orders.filters.allStatuses") || "All Statuses"}</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("orders.metrics.totalOrders.title") || "Total Orders"}
                </p>
                <p className="text-2xl font-bold">{stats?.totalOrders ?? 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("orders.metrics.revenue.title") || "Total Revenue"}
                </p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: 'SAR',
                  }).format((stats?.totalRevenue ?? 0) / 100)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("orders.metrics.avgValue.title") || "Avg Order Value"}
                </p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: 'SAR',
                  }).format((stats?.averageOrderValue ?? 0) / 100)}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200">
                Ø
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("orders.metrics.period.title") || "Period"}
                </p>
                <p className="text-2xl font-bold">{stats?.period.days ?? 30}d</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("orders.table.title") || "Orders"}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("orders.table.subtitle") || "View and manage all orders"}</p>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto">
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  isRtl ? "right-3" : "left-3",
                )}
              />
              <Input
                dir={dir}
                placeholder={t("orders.filters.searchPlaceholder") || "Search orders..."}
                className={cn("w-full", isRtl ? "pr-10 pl-3 text-right" : "pl-9")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>{t("orders.table.columns.order") || "Order ID"}</TableHead>
                  <TableHead>{t("orders.table.columns.customer") || "Customer"}</TableHead>
                  <TableHead>{t("orders.table.columns.items") || "Items"}</TableHead>
                  <TableHead>{t("orders.table.columns.total") || "Total"}</TableHead>
                  <TableHead>{t("orders.table.columns.status") || "Status"}</TableHead>
                  <TableHead>{t("orders.table.columns.time") || "Time"}</TableHead>
                  <TableHead>{t("orders.table.columns.alerts") || "Alerts"}</TableHead>
                <TableHead className={cn(isRtl ? "text-left" : "text-right")}>
                    {t("orders.table.columns.actions") || "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.orderReference}</span>
                        <span className="text-xs text-muted-foreground">{order.id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-xs text-muted-foreground">{order.createdAtRelative}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{order.itemCount} {t("orders.table.items") || "items"}</span>
                    </TableCell>
                    <TableCell className="font-medium">{order.totalFormatted}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[order.status].badge}>
                        {order.statusDisplay}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{new Date(order.createdAt).toLocaleDateString(locale)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.alerts.isLate && (
                          <AlertTriangle className="h-4 w-4 text-amber-600" title={t("orders.alerts.late") || "Late"} />
                        )}
                        {order.alerts.awaitingPayment && (
                          <Clock className="h-4 w-4 text-blue-600" title={t("orders.alerts.payment") || "Awaiting payment"} />
                        )}
                        {order.alerts.requiresReview && (
                          <Eye className="h-4 w-4 text-purple-600" title={t("orders.alerts.review") || "Requires review"} />
                        )}
                        {!order.alerts.isLate && !order.alerts.awaitingPayment && !order.alerts.requiresReview && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn(isRtl ? "text-left" : "text-right")}>
                      <div className={cn("flex gap-2", isRtl ? "justify-start" : "justify-end")}>
                        <Select
                          onValueChange={(value) => handleStatusUpdate(order.id, value as OrderStatus)}
                          disabled={updatingId === order.id}
                          value={order.status}
                        >
                          <SelectTrigger className="w-36" dir={dir}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredOrders.length === 0 && !ordersLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {searchQuery
                        ? t("orders.table.noResults") || "No orders found matching your search"
                        : t("orders.table.empty") || "No orders yet"}
                    </TableCell>
                  </TableRow>
                )}

                {ordersLoading && filteredOrders.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
                )}
            </TableBody>
          </Table>
          </div>

          {/* Load More Button */}
          {hasMore && filteredOrders.length > 0 && (
            <div className="p-4 border-t flex justify-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={ordersLoading}
              >
                {ordersLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("orders.actions.loading") || "Loading..."}
                  </>
                ) : (
                  t("orders.actions.loadMore") || "Load More"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Updating indicator */}
      {updatingId && (
        <div
          className={cn(
            "fixed bottom-4 flex items-center gap-2 rounded-md border bg-background px-4 py-2 shadow-lg",
            isRtl ? "left-4" : "right-4",
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("orders.loading.updating") || "Updating order..."}</span>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
            <OrdersContent />
      </DashboardLayout>
    </AuthGuard>
  )
}
