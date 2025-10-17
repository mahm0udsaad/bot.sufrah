"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Eye, Phone, Clock, MapPin, Loader2, Package, DollarSign, User2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { RealtimeProvider, useRealtime } from "@/contexts/realtime-context"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { BotWebSocketProvider } from "@/contexts/bot-websocket-context"

const STATUS_STYLES: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Draft", badge: "bg-gray-100 text-gray-800" },
  CONFIRMED: { label: "Confirmed", badge: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "Preparing", badge: "bg-yellow-100 text-yellow-800" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", badge: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Delivered", badge: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", badge: "bg-red-100 text-red-800" },
}

const PAYMENT_STATUS_STYLES: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Pending", badge: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Paid", badge: "bg-green-100 text-green-800" },
FAILED: { label: "Failed", badge: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Refunded", badge: "bg-gray-100 text-gray-800" },
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format((amountCents || 0) / 100)
}

function deriveCustomerName(order: OrderRecord) {
  return (
    order.meta?.customer_name ||
    order.meta?.customerName ||
    order.meta?.name ||
    order.meta?.customer ||
    "Walk-in"
  )
}

function deriveCustomerPhone(order: OrderRecord) {
  const value =
    order.meta?.customer_phone ||
    order.meta?.phone ||
    order.meta?.customerPhone ||
    order.meta?.customer_contact ||
    "—"
  return typeof value === "string" ? value : "—"
}

function normalizeStatus(status: string | undefined) {
  return (status || "DRAFT").toUpperCase()
}

function OrdersContent() {
  const { user } = useAuth()
  const { subscribeToOrders } = useRealtime()
  const { subscribeToOrderEvents } = useBotWebSocket()

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [stats, setStats] = useState<OrderStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)

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
      toast.error("Unable to load orders feed")
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
        toast.success("Order status updated in real-time")
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
        toast.success("Order status updated in real-time")
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
      const name = deriveCustomerName(order).toLowerCase()
      const phone = deriveCustomerPhone(order).toLowerCase()
      const matchesQuery =
        !query ||
        order.id.toLowerCase().includes(query) ||
        name.includes(query) ||
        phone.includes(query)

      const matchesStatus = statusTarget === "ALL" || normalizeStatus(order.status) === statusTarget
      return matchesQuery && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

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
        toast.success(`Order ${updated.id.slice(0, 6)} status updated`)
      }
    } catch (error) {
      console.error("Order status update failed", error)
      toast.error("Unable to update order status")
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Track in-flight WhatsApp orders in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(STATUS_STYLES).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.label}
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
                <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
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
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency((stats?.total_revenue ?? 0) * 100, "SAR")}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency((stats?.avg_order_value ?? 0) * 100, "SAR")}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">Ø</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
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
            <CardTitle>Orders</CardTitle>
            <p className="text-sm text-muted-foreground">Filtered by WhatsApp conversation mapping</p>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or order ID"
                className="pl-9"
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
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const statusKey = normalizeStatus(order.status)
                const statusMeta = STATUS_STYLES[statusKey] ?? STATUS_STYLES.DRAFT
                const paymentStatusKey = normalizeStatus(order.meta?.payment_status)
                const paymentMeta = PAYMENT_STATUS_STYLES[paymentStatusKey] ?? PAYMENT_STATUS_STYLES.PENDING

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 10)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{deriveCustomerName(order)}</span>
                        <span className="text-xs text-muted-foreground">{deriveCustomerPhone(order)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentMeta.badge}>{paymentMeta.label}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalCents, order.currency)}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Select
                          onValueChange={(value) => handleStatusUpdate(order.id, value)}
                          disabled={updatingId === order.id}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_STYLES).map(([value, meta]) => (
                              <SelectItem key={value} value={value}>
                                {meta.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOrder(order)}
                          aria-label="View order details"
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
                    No orders match the current filters.
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
                <DialogTitle>Order {selectedOrder.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User2 className="h-4 w-4" />
                    <span>{deriveCustomerName(selectedOrder)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{deriveCustomerPhone(selectedOrder)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
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
                        View Payment Link
                      </a>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Items</h3>
                  <div className="space-y-2 rounded-lg border">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty {item.qty}</p>
                        </div>
                        <span>{formatCurrency(item.totalCents, selectedOrder.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total</span>
                  <span>{formatCurrency(selectedOrder.totalCents, selectedOrder.currency)}</span>
                </div>

                {/* Payment Information */}
                {selectedOrder.meta?.payment_status && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">Payment Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={
                          selectedOrder.meta.payment_status === "PAID" 
                            ? "bg-green-100 text-green-800"
                            : selectedOrder.meta.payment_status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }>
                          {selectedOrder.meta.payment_status}
                        </Badge>
                      </div>
                      {selectedOrder.meta.payment_method && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span>{selectedOrder.meta.payment_method}</span>
                        </div>
                      )}
                      {selectedOrder.meta.payment_transaction_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Transaction ID</span>
                          <span className="font-mono text-xs">{selectedOrder.meta.payment_transaction_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {updatingId ? (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md border bg-background px-4 py-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Updating order…</span>
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
