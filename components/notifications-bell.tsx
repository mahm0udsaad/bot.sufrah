"use client"

import { useState } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"

const TYPE_STYLES = {
  order_created: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
  },
  conversation_started: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
  },
  welcome_broadcast: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-200 dark:border-indigo-800",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  default: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    border: "border-gray-200 dark:border-gray-800",
    icon: "text-gray-600 dark:text-gray-400",
  },
}

export function NotificationsBell() {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markMultipleAsRead,
    refetch,
  } = useNotifications(20, 30000, locale as 'en' | 'ar') // Poll every 30 seconds

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => n.status === "unread")
    if (unreadNotifications.length > 0) {
      await markMultipleAsRead(unreadNotifications.map((n) => n.id))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("notifications.bell.ariaLabel") || "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold">{t("notifications.title") || "Notifications"}</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? t("notifications.unreadCount", { values: { count: unreadCount } }) || `${unreadCount} unread`
                : t("notifications.allRead") || "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              {t("notifications.markAllRead") || "Mark all read"}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                {t("notifications.loading") || "Loading notifications..."}
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-red-600">
                {t("notifications.error") || "Failed to load notifications"}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {t("notifications.empty") || "No notifications yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const typeStyle = TYPE_STYLES[notification.type as keyof typeof TYPE_STYLES] || TYPE_STYLES.default

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors relative",
                      notification.status === "unread" && "bg-muted/30"
                    )}
                  >
                    {notification.status === "unread" && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                    )}

                    <div className={cn("ml-3", notification.status === "unread" && "ml-5")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium mb-1",
                              typeStyle.bg,
                              typeStyle.border,
                              "border"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", typeStyle.icon, "bg-current")} />
                            <span className={typeStyle.icon}>
                              {notification.type.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium mb-1">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {notification.status === "unread" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleMarkAsRead(notification.id)}
                            aria-label={t("notifications.markRead") || "Mark as read"}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false)
                // Navigate to notifications page if you have one
              }}
            >
              {t("notifications.viewAll") || "View all notifications"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

