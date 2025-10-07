"use client"

import { useState } from "react"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Bot, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function BotToggle() {
  const { botEnabled, toggleBot } = useBotWebSocket()
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true)
    try {
      await toggleBot(enabled)
      toast.success(enabled ? "تم تشغيل البوت" : "تم إيقاف البوت")
    } catch (err) {
      console.error("Failed to toggle bot:", err)
      toast.error("فشل تغيير حالة البوت")
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Card className="p-4" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className={botEnabled ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
          </div>
          <div>
            <Label htmlFor="bot-toggle" className="text-base font-semibold cursor-pointer">
              حالة البوت
            </Label>
            <p className="text-sm text-muted-foreground">
              {botEnabled ? "البوت يعمل حالياً" : "البوت متوقف"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="bot-toggle"
            checked={botEnabled}
            onCheckedChange={handleToggle}
            disabled={isToggling}
          />
        </div>
      </div>
    </Card>
  )
}

