"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  Clock, 
  Loader2, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  Filter,
  ArrowUpRight,
  TrendingUp,
  MoreHorizontal
} from "lucide-react"
import { toast } from "sonner"
import { useOrdersPaginated, useOrderStats } from "@/hooks/use-dashboard-api"
import { updateOrderStatus } from "@/lib/dashboard-actions"
import type { Order, OrderStatus } from "@/lib/dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { motion, AnimatePresence } from "framer-motion"

const STATUS_STYLES: Record<OrderStatus, { badge: string; icon: any; color: string }> = {
  CONFIRMED: { 
    badge: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900", 
    icon: CheckCircle2,
    color: "text-blue-600"
  },
  PREPARING: { 
    badge: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900", 
    icon: Clock,
    color: "text-amber-600"
  },
  OUT_FOR_DELIVERY: { 
    badge: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900", 
    icon: Package,
    color: "text-indigo-600"
  },
  DELIVERED: { 
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900", 
    icon: CheckCircle2,
    color: "text-emerald-600"
  },
  CANCELLED: { 
    badge: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900", 
    icon: AlertTriangle,
    color: "text-red-600"
  },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
}

function OrdersContent() {
  const { user } = useAuth()
  const { t, dir, locale } = useI18n()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const isRtl = dir === "rtl"
  const tenantId = user?.tenantId || user?.restaurant?.id || ''

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

  const {
    data: stats,
    loading: statsLoading,
  } = useOrderStats(30, locale as 'en' | 'ar')

  useEffect(() => {
    if (ordersError) {
      toast.error(t("orders.toasts.loadFailed") || `Failed to load orders: ${ordersError}`)
    }
  }, [ordersError, t])

  useEffect(() => {
    reset()
  }, [statusFilter, reset])

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
        toast.success(t("orders.toasts.statusChangeSuccess") || "Order updated successfully")
        reset()
      }
    } catch (error) {
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
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading your orders...</p>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8 pb-10"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{t("orders.header.title") || "Orders"}</h1>
          <p className="text-muted-foreground mt-1 text-lg">{t("orders.header.subtitle") || "Real-time order management and tracking"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} className="bg-background shadow-sm border-border/60 rounded-xl h-11 px-5 font-bold">
            <RefreshCw className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2", ordersLoading && "animate-spin")} />
            {t("orders.actions.refresh") || "Refresh"}
          </Button>
          <Button variant="outline" className="bg-background shadow-sm border-border/60 rounded-xl h-11 px-5 font-bold">
            <Download className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("orders.actions.export") || "Export"}
          </Button>
          
          <div className="h-11 flex items-center bg-muted/50 rounded-xl border border-border/50 p-1">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "ALL")}>
              <SelectTrigger className="w-40 border-0 bg-transparent shadow-none focus:ring-0 font-bold" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl p-1">
                <SelectItem value="ALL" className="rounded-lg">{t("orders.filters.allStatuses") || "All Statuses"}</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("orders.metrics.totalOrders.title") || "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: t("orders.metrics.revenue.title") || "Total Revenue", value: (stats?.totalRevenue ?? 0) / 100, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10", isCurrency: true },
          { label: t("orders.metrics.avgValue.title") || "Avg Order", value: (stats?.averageOrderValue ?? 0) / 100, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-500/10", isCurrency: true },
          { label: t("orders.metrics.period.title") || "Active Period", value: stats?.period.days ?? 30, icon: Calendar, color: "text-orange-600", bg: "bg-orange-500/10", unit: " days" }
        ].map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="overflow-hidden border-border/50 group hover:shadow-md transition-all">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black">
                      {stat.isCurrency ? 
                        new Intl.NumberFormat(locale, { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(stat.value) : 
                        stat.value.toLocaleString()
                      }
                    </p>
                    {stat.unit && <span className="text-xs text-muted-foreground font-bold">{stat.unit}</span>}
                  </div>
                </div>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Orders Table Section */}
      <motion.div variants={item}>
        <Card className="border-border/50 shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm">
          <CardHeader className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border/50 bg-muted/10 p-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black">{t("orders.table.title") || "Recent Orders"}</CardTitle>
              <CardDescription className="font-medium">{t("orders.table.subtitle") || "Comprehensive list of all incoming and past orders"}</CardDescription>
            </div>
            <div className="flex w-full max-w-md items-center gap-2 md:w-auto">
              <div className="relative flex-1">
                <Search className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", isRtl ? "right-4" : "left-4")} />
                <Input
                  dir={dir}
                  placeholder={t("orders.filters.searchPlaceholder") || "Search by customer or order ID..."}
                  className={cn("w-full h-11 bg-background rounded-xl border-border/60 pl-11 pr-4 focus:ring-primary/20 transition-all font-medium")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-bold py-4">{t("orders.table.columns.order") || "Order ID"}</TableHead>
                    <TableHead className="font-bold py-4">{t("orders.table.columns.customer") || "Customer"}</TableHead>
                    <TableHead className="font-bold py-4 text-center">{t("orders.table.columns.items") || "Items"}</TableHead>
                    <TableHead className="font-bold py-4">{t("orders.table.columns.total") || "Total"}</TableHead>
                    <TableHead className="font-bold py-4">{t("orders.table.columns.status") || "Status"}</TableHead>
                    <TableHead className="font-bold py-4">{t("orders.table.columns.alerts") || "Alerts"}</TableHead>
                    <TableHead className={cn("font-bold py-4", isRtl ? "text-left" : "text-right")}>
                      {t("orders.table.columns.actions") || "Update Status"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredOrders.map((order) => (
                      <motion.tr 
                        key={order.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-primary/5 transition-colors border-border/50"
                      >
                        <TableCell className="font-mono text-sm py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-foreground group-hover:text-primary transition-colors">#{order.orderReference}</span>
                            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">{order.id.slice(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{order.customerName}</span>
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {order.createdAtRelative}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Badge variant="outline" className="rounded-lg font-bold bg-background">
                            {order.itemCount} {t("orders.table.items") || "Items"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-primary py-4">{order.totalFormatted}</TableCell>
                        <TableCell className="py-4">
                          <Badge className={cn("rounded-lg px-3 py-1 font-bold border shadow-sm", STATUS_STYLES[order.status].badge)}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_STYLES[order.status].color.replace('text-', 'bg-'))} />
                              {order.statusDisplay}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex gap-2">
                            {order.alerts.isLate && (
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shadow-sm" title={t("orders.alerts.late")}>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              </div>
                            )}
                            {order.alerts.awaitingPayment && (
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shadow-sm" title={t("orders.alerts.payment")}>
                                <DollarSign className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            {order.alerts.requiresReview && (
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shadow-sm" title={t("orders.alerts.review")}>
                                <Eye className="h-4 w-4 text-purple-600" />
                              </div>
                            )}
                            {!order.alerts.isLate && !order.alerts.awaitingPayment && !order.alerts.requiresReview && (
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shadow-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn("py-4", isRtl ? "text-left" : "text-right")}>
                          <div className={cn("flex items-center gap-2", isRtl ? "justify-start" : "justify-end")}>
                            <Select
                              onValueChange={(value) => handleStatusUpdate(order.id, value as OrderStatus)}
                              disabled={updatingId === order.id}
                              value={order.status}
                            >
                              <SelectTrigger className="w-40 h-10 rounded-xl font-bold bg-background shadow-sm border-border/60" dir={isRtl ? "rtl" : "ltr"}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl p-1">
                                {statusOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="rounded-lg font-medium">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", STATUS_STYLES[option.value].color.replace('text-', 'bg-'))} />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary h-10 w-10">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>

                  {filteredOrders.length === 0 && !ordersLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-foreground">
                              {searchQuery ? t("orders.table.noResults") : t("orders.table.empty")}
                            </p>
                            <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
                          </div>
                          {searchQuery && (
                            <Button variant="link" onClick={() => setSearchQuery("")} className="font-bold text-primary">
                              Show all orders
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Load More Button Section */}
            {hasMore && filteredOrders.length > 0 && (
              <div className="p-6 border-t border-border/50 flex justify-center bg-muted/5">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={ordersLoading}
                  className="rounded-xl h-12 px-10 font-black border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm"
                >
                  {ordersLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("orders.actions.loading") || "Loading..."}
                    </>
                  ) : (
                    <>
                      {t("orders.actions.loadMore") || "Load More Orders"}
                      <ArrowUpRight className="ml-2 h-4 w-4 rotate-90" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modern Status Updating Indicator */}
      <AnimatePresence>
        {updatingId && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "fixed bottom-8 z-50 flex items-center gap-4 rounded-2xl border border-primary/20 bg-background/80 backdrop-blur-xl px-6 py-4 shadow-2xl shadow-primary/20",
              isRtl ? "left-8" : "right-8",
            )}
          >
            <div className="relative">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <Package className="h-3 w-3 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{t("orders.loading.updating") || "Updating Order Status"}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Please wait a moment...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
