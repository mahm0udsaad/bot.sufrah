"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Package, MessageSquare, AlertTriangle, Info, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useI18n } from "@/hooks/use-i18n"
import { toast } from "sonner"

interface Notification {
  id: string
  type: "order" | "message" | "alert" | "info"
  title: string
  message: string
  isRead: boolean
  link?: string
  createdAt: string
}

const NOTIFICATION_ICONS = {
  order: Package,
  message: MessageSquare,
  alert: AlertTriangle,
  info: Info,
}

const NOTIFICATION_COLORS = {
  order: "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200",
  message: "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200",
  alert: "text-amber-600 bg-amber-100 dark:bg-amber-900 dark:text-amber-200",
  info: "text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200",
}

export function NotificationsSheet() {
  const router = useRouter()
  const { t, dir } = useI18n()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)

  const isRtl = dir === "rtl"
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const tenantId = user?.tenantId || user?.restaurant?.id

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!tenantId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?tenantId=${tenantId}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      if (data.success && data.data?.notifications) {
        setNotifications(data.data.notifications)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
      toast.error(t("notifications.error.fetch") || "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  // Mark notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    try {
      setMarkingRead(true)
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to mark as read")
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id) ? { ...n, isRead: true } : n
        )
      )
    } catch (error) {
      console.error("Failed to mark as read:", error)
      toast.error(t("notifications.error.markRead") || "Failed to mark as read")
    } finally {
      setMarkingRead(false)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
    if (unreadIds.length === 0) return
    await markAsRead(unreadIds)
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead([notification.id])
    }

    // Navigate if link provided
    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }

  // Fetch on open
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return isRtl ? "الآن" : "Now"
    if (diffMins < 60) return isRtl ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`
    if (diffHours < 24) return isRtl ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
    if (diffDays < 7) return isRtl ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
    return then.toLocaleDateString()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            {t("notifications.title") || "Notifications"}
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent side={isRtl ? "left" : "right"} className="w-full sm:w-96">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>
              {t("notifications.title") || "Notifications"}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={markingRead}
                className="h-8 text-xs"
              >
                {markingRead ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className={cn("h-3 w-3", isRtl ? "ml-1" : "mr-1")} />
                    {t("notifications.markAllRead") || "Mark all read"}
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("notifications.empty") || "No notifications yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type]
                const colorClass = NOTIFICATION_COLORS[notification.type]

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50",
                      !notification.isRead && "bg-muted/30 border-primary/20"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                          colorClass
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold truncate">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

