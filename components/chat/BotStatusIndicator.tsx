"use client"

import { useEffect, useState } from "react"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Zap, ZapOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface BotStatusIndicatorProps {
  className?: string
  variant?: "default" | "compact"
}

export function BotStatusIndicator({ className, variant = "default" }: BotStatusIndicatorProps) {
  const { botEnabled, status: connectionStatus, subscribeToStatusUpdates } = useBotWebSocket()
  const [localBotEnabled, setLocalBotEnabled] = useState(botEnabled)

  useEffect(() => {
    setLocalBotEnabled(botEnabled)
  }, [botEnabled])

  useEffect(() => {
    const unsubscribe = subscribeToStatusUpdates((status) => {
      setLocalBotEnabled(status.enabled)
    })
    return unsubscribe
  }, [subscribeToStatusUpdates])

  const isConnected = connectionStatus === "connected"

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)} dir="rtl">
        <div className="relative">
          <Bot className={cn("h-5 w-5", localBotEnabled ? "text-primary" : "text-muted-foreground")} />
          {isConnected && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                localBotEnabled ? "bg-green-500" : "bg-orange-500"
              )}
            >
              <span
                className={cn(
                  "absolute inset-0 rounded-full animate-ping",
                  localBotEnabled ? "bg-green-500" : "bg-orange-500"
                )}
              />
            </span>
          )}
        </div>
        <Badge variant={localBotEnabled ? "default" : "secondary"} className="gap-1">
          {localBotEnabled ? (
            <>
              <Zap className="h-3 w-3" />
              <span>البوت نشط</span>
            </>
          ) : (
            <>
              <ZapOff className="h-3 w-3" />
              <span>البوت متوقف</span>
            </>
          )}
        </Badge>
      </div>
    )
  }

  return (
    <Card className={cn("", className)} dir="rtl">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {/* Bot Icon with Status */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                localBotEnabled ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Bot className={cn("h-8 w-8", localBotEnabled ? "text-primary" : "text-muted-foreground")} />
            </div>
            {isConnected && (
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background",
                  localBotEnabled ? "bg-green-500" : "bg-orange-500"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-75",
                    localBotEnabled ? "bg-green-500" : "bg-orange-500"
                  )}
                />
              </span>
            )}
          </div>

          {/* Status Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">البوت الذكي</h3>
              <Badge variant={localBotEnabled ? "default" : "secondary"} className="gap-1">
                {localBotEnabled ? (
                  <>
                    <Zap className="h-3 w-3" />
                    <span>نشط</span>
                  </>
                ) : (
                  <>
                    <ZapOff className="h-3 w-3" />
                    <span>متوقف</span>
                  </>
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {localBotEnabled
                ? "يستجيب البوت تلقائياً لرسائل العملاء"
                : "البوت متوقف حالياً - استجابة يدوية فقط"}
            </p>
            {!isConnected && (
              <p className="text-xs text-destructive mt-1">⚠️ غير متصل بخدمة البوت</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

