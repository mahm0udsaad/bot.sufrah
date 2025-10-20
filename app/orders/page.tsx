"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Eye, Phone, Clock, MapPin, Loader2, Package, DollarSign, User2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { RealtimeProvider, useRealtime } from "@/contexts/realtime-context"
import { cn, normalizeCurrencyCode } from "@/lib/utils"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { BotWebSocketProvider } from "@/contexts/bot-websocket-context"
import { useI18n } from "@/hooks/use-i18n"

const STATUS_STYLES: Record<string, { labelKey: string; badge: string }> = {
  DRAFT: { labelKey: "orders.status.draft", badge: "bg-gray-100 text-gray-800" },
  CONFIRMED: { labelKey: "orders.status.confirmed", badge: "bg-blue-100 text-blue-800" },
  PREPARING: { labelKey: "orders.status.preparing", badge: "bg-yellow-100 text-yellow-800" },
  OUT_FOR_DELIVERY: { labelKey: "orders.status.outForDelivery", badge: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { labelKey: "orders.status.delivered", badge: "bg-green-100 text-green-800" },
  CANCELLED: { labelKey: "orders.status.cancelled", badge: "bg-red-100 text-red-800" },
}

const PAYMENT_STATUS_STYLES: Record<string, { labelKey: string; badge: string }> = {
  PENDING: { labelKey: "orders.paymentStatus.pending", badge: "bg-yellow-100 text-yellow-800" },
  PAID: { labelKey: "orders.paymentStatus.paid", badge: "bg-green-100 text-green-800" },
  FAILED: { labelKey: "orders.paymentStatus.failed", badge: "bg-red-100 text-red-800" },
  REFUNDED: { labelKey: "orders.paymentStatus.refunded", badge: "bg-gray-100 text-gray-800" },
}

interface OrderItem {
  id: string
  name: string
  qty: number
  unitCents: number
  totalCents: number
}

interface OrderRecord {
  id: string
  status: string
  totalCents: number
  currency: string
  createdAt: string
  updatedAt: string
  conversationId?: string | null
  restaurantId: string
  meta?: Record<string, any> | null
  items: OrderItem[]
}

interface OrderStatsResponse {
  todays_orders: number
  total_revenue: number
  avg_order_value: number
  completion_rate: number
}

function formatCurrency(amountCents: number, currency: string) {
  const code = normalizeCurrencyCode(currency)
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format((amountCents || 0) / 100)
  } catch {
    const amount = ((amountCents || 0) / 100).toFixed(2)
    return `${amount} ${code}`
  }
}

function deriveCustomerName(order: OrderRecord, fallback: string) {
  return (
    order.meta?.customer_name ||
    order.meta?.customerName ||
    order.meta?.name ||
    order.meta?.customer ||
    fallback
  )
}

function deriveCustomerPhone(order: OrderRecord, fallback: string) {
  const value =
    order.meta?.customer_phone ||
    order.meta?.phone ||
    order.meta?.customerPhone ||
    order.meta?.customer_contact ||
    fallback
  return typeof value === "string" ? value : fallback
}

function normalizeStatus(status: string | undefined) {
  return (status || "DRAFT").toUpperCase()
}

function OrdersContent() {
  const { user } = useAuth()
  const { subscribeToOrders } = useRealtime()
  const { subscribeToOrderEvents } = useBotWebSocket()
  const { t, dir, locale } = useI18n()

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [stats, setStats] = useState<OrderStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)
  const isRtl = dir === "rtl"

  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      const [ordersRes, statsRes] = await Promise.all([
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/orders/stats", { cache: "no-store" }),
      ])

      if (ordersRes.ok) {
        const payload = await ordersRes.json()
        if (payload.success && Array.isArray(payload.orders)) {
          setOrders(payload.orders)
        }
      }

      if (statsRes.ok) {
        const payload = await statsRes.json()
        if (payload.success && payload.stats) {
          setStats(payload.stats)
        }
      }
    } catch (error) {
      console.error("Failed to load orders", error)
      toast.error(t("orders.toasts.loadFailed"))
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (user) {
      void fetchOrders()
    }
  }, [user])

  useEffect(() => {
    // Prefer bot websocket order events; fallback to internal realtime if present
    const unsubscribeBot = subscribeToOrderEvents?.((payload: any) => {
      try {
        const order = payload?.order || payload
        if (!order?.id) return
        setOrders((prev) => {
          const next = [...prev]
          const idx = next.findIndex((o) => o.id === order.id)
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...order }
          } else {
            next.unshift(order)
          }
          return next
        })
        void fetchOrders(false)
        toast.success(t("orders.toasts.statusUpdated"))
      } catch (error) {
        console.error("Bot order handler failed", error)
      }
    })

    const unsubscribeInternal = subscribeToOrders((event) => {
      try {
        const incoming: any = event.order || event.payload || event
        if (!incoming?.id) {
          return
        }
        setOrders((prev) => {
          const next = [...prev]
          const idx = next.findIndex((order) => order.id === incoming.id)
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...incoming }
          } else {
            next.unshift(incoming)
          }
          return next
        })
        void fetchOrders(false)
        toast.success(t("orders.toasts.statusUpdated"))
      } catch (error) {
        console.error("Realtime orders handler failed", error)
      }
    })

    return () => {
      unsubscribeInternal()
      unsubscribeBot && unsubscribeBot()
    }
  }, [subscribeToOrders, subscribeToOrderEvents])

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const statusTarget = statusFilter.toUpperCase()

    return orders.filter((order) => {
      const name = deriveCustomerName(order, t("orders.table.walkIn")).toLowerCase()
      const phone = deriveCustomerPhone(order, t("orders.table.noPhone")).toLowerCase()
      const matchesQuery =
        !query ||
        order.id.toLowerCase().includes(query) ||
        name.includes(query) ||
        phone.includes(query)

      const matchesStatus = statusTarget === "ALL" || normalizeStatus(order.status) === statusTarget
      return matchesQuery && matchesStatus
    })
  }, [orders, searchQuery, statusFilter, t])

  const handleStatusUpdate = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingId(orderId)
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update order")
      }

      const payload = await response.json()
      if (payload.success && payload.order) {
        const updated = payload.order as OrderRecord
        setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)))
        toast.success(
          t("orders.toasts.statusChangeSuccess", { values: { id: updated.id.slice(0, 6) } }),
        )
      }
    } catch (error) {
      console.error("Order status update failed", error)
      toast.error(t("orders.toasts.updateFailed"))
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const statusOptions = Object.entries(STATUS_STYLES)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("orders.header.title")}</h1>
          <p className="text-muted-foreground">{t("orders.header.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("orders.actions.export")}
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" dir={dir}>
              <SelectValue placeholder={t("orders.filters.statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("orders.filters.allStatuses")}</SelectItem>
              {statusOptions.map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {t(meta.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("orders.metrics.todaysOrders.title")}
                </p>
                <p className="text-2xl font-bold">{stats?.todays_orders ?? 0}</p>
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
                  {t("orders.metrics.revenue.title")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency((stats?.total_revenue ?? 0) * 100, "SAR")}
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
                  {t("orders.metrics.avgValue.title")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency((stats?.avg_order_value ?? 0) * 100, "SAR")}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
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
                  {t("orders.metrics.completionRate.title")}
                </p>
                <p className="text-2xl font-bold">{stats?.completion_rate ?? 0}%</p>
              </div>
              <User2 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("orders.table.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("orders.table.subtitle")}</p>
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
                placeholder={t("orders.filters.searchPlaceholder")}
                className={cn("w-full", isRtl ? "pr-10 pl-3 text-right" : "pl-9")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.table.columns.order")}</TableHead>
                <TableHead>{t("orders.table.columns.customer")}</TableHead>
                <TableHead>{t("orders.table.columns.status")}</TableHead>
                <TableHead>{t("orders.table.columns.payment")}</TableHead>
                <TableHead>{t("orders.table.columns.total")}</TableHead>
                <TableHead>{t("orders.table.columns.placed")}</TableHead>
                <TableHead className={cn(isRtl ? "text-left" : "text-right")}>
                  {t("orders.table.columns.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const statusKey = normalizeStatus(order.status)
                const statusMeta = STATUS_STYLES[statusKey] ?? STATUS_STYLES.DRAFT
                const paymentStatusKey = normalizeStatus(order.meta?.payment_status)
                const paymentMeta = PAYMENT_STATUS_STYLES[paymentStatusKey] ?? PAYMENT_STATUS_STYLES.PENDING
                const customerName = deriveCustomerName(order, t("orders.table.walkIn"))
                const customerPhone = deriveCustomerPhone(order, t("orders.table.noPhone"))

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{customerName}</span>
                        <span className="text-xs text-muted-foreground">{customerPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMeta.badge}>{t(statusMeta.labelKey)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentMeta.badge}>{t(paymentMeta.labelKey)}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalCents, order.currency)}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleString(locale)}</TableCell>
                    <TableCell className={cn(isRtl ? "text-left" : "text-right")}>
                      <div className={cn("flex gap-2", isRtl ? "justify-start" : "justify-end")}>
                        <Select
                          onValueChange={(value) => handleStatusUpdate(order.id, value)}
                          disabled={updatingId === order.id}
                        >
                          <SelectTrigger className="w-36" dir={dir}>
                            <SelectValue placeholder={t("orders.table.updateStatusPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(([value, meta]) => (
                              <SelectItem key={value} value={value}>
                                {t(meta.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={t("orders.actions.viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t("orders.table.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-xl">
          {selectedOrder ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t("orders.dialog.title", { values: { id: selectedOrder.id.slice(0, 10) } })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User2 className="h-4 w-4" />
                    <span>{deriveCustomerName(selectedOrder, t("orders.table.walkIn"))}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{deriveCustomerPhone(selectedOrder, t("orders.table.noPhone"))}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(selectedOrder.createdAt).toLocaleString(locale)}</span>
                  </div>
                  {selectedOrder.meta?.delivery_address ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedOrder.meta.delivery_address}</span>
                    </div>
                  ) : null}
                  {selectedOrder.meta?.payment_link ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <a
                        href={selectedOrder.meta.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {t("orders.dialog.viewPaymentLink")}
                      </a>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">{t("orders.dialog.itemsTitle")}</h3>
                  <div className="space-y-2 rounded-lg border">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("orders.dialog.itemQuantity", { values: { qty: item.qty } })}
                          </p>
                        </div>
                        <span>{formatCurrency(item.totalCents, selectedOrder.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t("orders.dialog.total")}</span>
                  <span>{formatCurrency(selectedOrder.totalCents, selectedOrder.currency)}</span>
                </div>

                {selectedOrder.meta?.payment_status ? (
                  <div className="border-t pt-4">
                    <h3 className="mb-2 text-sm font-medium">{t("orders.dialog.payment.title")}</h3>
                    <div className="space-y-2 text-sm">
                      {(() => {
                        const detailStatusKey = normalizeStatus(selectedOrder.meta?.payment_status)
                        const detailStatusMeta =
                          PAYMENT_STATUS_STYLES[detailStatusKey] ?? PAYMENT_STATUS_STYLES.PENDING
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("orders.dialog.payment.status")}</span>
                            <Badge className={detailStatusMeta.badge}>{t(detailStatusMeta.labelKey)}</Badge>
                          </div>
                        )
                      })()}
                      {selectedOrder.meta.payment_method ? (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t("orders.dialog.payment.method")}</span>
                          <span>{selectedOrder.meta.payment_method}</span>
                        </div>
                      ) : null}
                      {selectedOrder.meta.payment_transaction_id ? (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t("orders.dialog.payment.transaction")}</span>
                          <span className="font-mono text-xs">
                            {selectedOrder.meta.payment_transaction_id}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {updatingId ? (
        <div
          className={cn(
            "fixed bottom-4 flex items-center gap-2 rounded-md border bg-background px-4 py-2 shadow-lg",
            isRtl ? "left-4" : "right-4",
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("orders.loading.updating")}</span>
        </div>
      ) : null}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <BotWebSocketProvider>
          <RealtimeProvider>
            <OrdersContent />
          </RealtimeProvider>
        </BotWebSocketProvider>
      </DashboardLayout>
    </AuthGuard>
  )
}
