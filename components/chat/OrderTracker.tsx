"use client"

import { useState, useEffect } from "react"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Package,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChefHat,
  Receipt,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface OrderItem {
  id: string
  name: string
  qty: number
  unitCents?: number
  totalCents: number
}

interface Order {
  id: string
  orderReference?: string | null
  status: string
  orderType?: string | null
  paymentMethod?: string | null
  totalCents: number
  currency: string
  createdAt?: string
  updatedAt?: string
  meta?: Record<string, any>
  items: OrderItem[]
}

interface OrderTrackerProps {
  conversationId?: string | null
  className?: string
}

const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; icon: any; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "مسودة", icon: ShoppingCart, variant: "secondary" },
  CONFIRMED: { label: "تم التأكيد", icon: CheckCircle2, variant: "default" },
  PREPARING: { label: "قيد التحضير", icon: ChefHat, variant: "outline" },
  OUT_FOR_DELIVERY: { label: "في الطريق", icon: Truck, variant: "default" },
  DELIVERED: { label: "تم التوصيل", icon: Package, variant: "default" },
  CANCELLED: { label: "ملغي", icon: XCircle, variant: "destructive" },
}

export function OrderTracker({ conversationId, className }: OrderTrackerProps) {
  const { subscribeToOrderEvents } = useBotWebSocket()
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToOrderEvents((payload) => {
      const order = payload.order
      
      // Filter by conversation if specified
      // Note: order.meta may contain conversationId
      if (conversationId && order.meta?.conversationId !== conversationId) {
        return
      }

      setOrders((prev) => {
        const index = prev.findIndex((o) => o.id === order.id)
        if (index >= 0) {
          // Update existing order
          const updated = [...prev]
          updated[index] = { ...updated[index], ...order }
          return updated.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt || 0).getTime() - 
            new Date(a.updatedAt || a.createdAt || 0).getTime()
          )
        } else {
          // Add new order
          return [order, ...prev]
        }
      })
    })

    return unsubscribe
  }, [subscribeToOrderEvents, conversationId])

  const formatPrice = (cents: number, currency: string = "SAR") => {
    const amount = (cents / 100).toFixed(2)
    return `${amount} ${currency === "SAR" ? "ر.س" : currency}`
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return ""
    try {
      return format(new Date(dateString), "dd MMM yyyy • HH:mm", { locale: ar })
    } catch {
      return dateString
    }
  }

  const getStatusConfig = (status: string) => {
    return ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.DRAFT
  }

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  if (orders.length === 0) {
    return (
      <Card className={cn("", className)} dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <span>الطلبات</span>
          </CardTitle>
          <CardDescription>تتبع طلبات العملاء في الوقت الفعلي</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد طلبات حالياً</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)} dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          <span>الطلبات</span>
          <Badge variant="secondary" className="mr-auto">
            {orders.length}
          </Badge>
        </CardTitle>
        <CardDescription>تتبع طلبات العملاء في الوقت الفعلي</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] -mx-6 px-6">
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status)
              const StatusIcon = statusConfig.icon
              const isExpanded = expandedOrderId === order.id

              return (
                <Card key={order.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="w-full text-right p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          <StatusIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">
                              طلب رقم {order.orderReference || order.id.slice(-6)}
                            </h4>
                            <Badge variant={statusConfig.variant} className="text-xs">
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} منتج • {formatPrice(order.totalCents, order.currency)}
                          </p>
                          {order.updatedAt && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(order.updatedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight
                        className={cn(
                          "h-4 w-4 flex-shrink-0 transition-transform mt-1",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <>
                      <Separator />
                      <div className="p-4 space-y-4 bg-muted/30">
                        {/* Order Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {order.orderType && (
                            <div>
                              <p className="text-muted-foreground">نوع الطلب</p>
                              <p className="font-medium">{order.orderType}</p>
                            </div>
                          )}
                          {order.paymentMethod && (
                            <div>
                              <p className="text-muted-foreground">طريقة الدفع</p>
                              <p className="font-medium">{order.paymentMethod}</p>
                            </div>
                          )}
                        </div>

                        {/* Order Items */}
                        <div>
                          <h5 className="font-semibold text-sm mb-2">المنتجات</h5>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm bg-background rounded-lg p-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="rounded-full px-2">
                                    {item.qty}×
                                  </Badge>
                                  <span>{item.name}</span>
                                </div>
                                <span className="font-medium">
                                  {formatPrice(item.totalCents, order.currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total */}
                        <Separator />
                        <div className="flex items-center justify-between font-semibold">
                          <span>الإجمالي</span>
                          <span className="text-lg">
                            {formatPrice(order.totalCents, order.currency)}
                          </span>
                        </div>

                        {/* Meta Info */}
                        {order.meta && Object.keys(order.meta).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              معلومات إضافية
                            </summary>
                            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                              {JSON.stringify(order.meta, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

