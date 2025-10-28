"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Phone, 
  CreditCard, 
  MessageSquare,
  Loader2,
  RefreshCw,
  Radio,
  Send
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/hooks/use-i18n"

interface RestaurantBot {
  id: string
  restaurantId: string | null
  name: string
  restaurantName: string
  whatsappNumber: string
  accountSid: string
  subaccountSid: string | null
  wabaId: string | null
  senderSid: string | null
  verificationSid: string | null
  status: "PENDING" | "ACTIVE" | "FAILED" | "VERIFYING"
  verifiedAt: string | null
  errorMessage: string | null
  supportContact: string | null
  paymentLink: string | null
  isActive: boolean
  maxMessagesPerMin: number
  maxMessagesPerDay: number
  createdAt: string
  updatedAt: string
}

const STATUS_META = {
  PENDING: {
    labelKey: "botManagement.status.pending",
    descriptionKey: "botManagement.statusDescriptions.pending",
    icon: Clock,
    badge: "bg-yellow-100 text-yellow-800",
  },
  VERIFYING: {
    labelKey: "botManagement.status.verifying",
    descriptionKey: "botManagement.statusDescriptions.verifying",
    icon: RefreshCw,
    badge: "bg-blue-100 text-blue-800",
  },
  ACTIVE: {
    labelKey: "botManagement.status.active",
    descriptionKey: "botManagement.statusDescriptions.active",
    icon: CheckCircle2,
    badge: "bg-green-100 text-green-800",
  },
  FAILED: {
    labelKey: "botManagement.status.failed",
    descriptionKey: "botManagement.statusDescriptions.failed",
    icon: XCircle,
    badge: "bg-red-100 text-red-800",
  },
}

function BotManagementContent() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [bot, setBot] = useState<RestaurantBot | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)

  const fetchBotData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/bot-management", { cache: "no-store" })
      
      if (!response.ok) {
        throw new Error("Failed to fetch bot data")
      }

      const data = await response.json()
      if (data.success && data.bot) {
        setBot(data.bot)
      }
    } catch (error) {
      console.error("Failed to load bot data:", error)
      toast.error(t("botManagement.toasts.loadFailed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      void fetchBotData()
    }
  }, [user])

  const handleToggleActivation = async () => {
    if (!bot) return

    try {
      setUpdating(true)
      const response = await fetch("/api/bot-management/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !bot.isActive }),
      })

      if (!response.ok) {
        throw new Error("Failed to toggle bot activation")
      }

      const data = await response.json()
      if (data.success && data.bot) {
        setBot(data.bot)
        toast.success(
          data.bot.isActive ? t("botManagement.toasts.activated") : t("botManagement.toasts.deactivated"),
        )
      }
    } catch (error) {
      console.error("Failed to toggle bot:", error)
      toast.error(t("botManagement.toasts.activationFailed"))
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateLimits = async (maxMessagesPerMin: number, maxMessagesPerDay: number) => {
    if (!bot) return

    try {
      setUpdating(true)
      const response = await fetch("/api/bot-management/limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxMessagesPerMin, maxMessagesPerDay }),
      })

      if (!response.ok) {
        throw new Error("Failed to update limits")
      }

      const data = await response.json()
      if (data.success && data.bot) {
        setBot(data.bot)
        toast.success(t("botManagement.toasts.limitsUpdated"))
      }
    } catch (error) {
      console.error("Failed to update limits:", error)
      toast.error(t("botManagement.toasts.limitsFailed"))
    } finally {
      setUpdating(false)
    }
  }

  const handleWelcomeBroadcast = async (force: boolean = false) => {
    if (!bot) return

    try {
      setBroadcasting(true)
      const response = await fetch("/api/notifications/welcome-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })

      if (!response.ok) {
        throw new Error("Failed to trigger welcome broadcast")
      }

      const data = await response.json()
      if (data.success && data.data) {
        const { delivered, skipped, failed } = data.data
        toast.success(
          t("botManagement.welcomeBroadcast.success", {
            values: { delivered, skipped, failed }
          }) || `Broadcast sent: ${delivered} delivered, ${skipped} skipped, ${failed} failed`
        )
      }
    } catch (error) {
      console.error("Failed to trigger welcome broadcast:", error)
      toast.error(t("botManagement.welcomeBroadcast.failed") || "Failed to trigger welcome broadcast")
    } finally {
      setBroadcasting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!bot) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t("botManagement.empty.noBot")}
        </AlertDescription>
        <div className="mt-3">
          <Button asChild>
            <Link href="/onboarding">{t("botManagement.empty.onboardCta")}</Link>
          </Button>
        </div>
      </Alert>
    )
  }

  const statusConfig = STATUS_META[bot.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("botManagement.header.title")}</h1>
        <p className="text-muted-foreground">{t("botManagement.header.subtitle")}</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{bot.name}</CardTitle>
                <CardDescription>{bot.restaurantName}</CardDescription>
              </div>
            </div>
            <Badge className={statusConfig.badge}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {t(statusConfig.labelKey)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm text-muted-foreground">{t("botManagement.fields.whatsappNumber")}</Label>
              <p className="text-sm font-medium">{bot.whatsappNumber}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">{t("botManagement.fields.status")}</Label>
              <p className="text-sm font-medium">{t(statusConfig.descriptionKey)}</p>
            </div>
            {bot.verifiedAt && (
              <div>
                <Label className="text-sm text-muted-foreground">{t("botManagement.fields.verifiedAt")}</Label>
                <p className="text-sm font-medium">{new Date(bot.verifiedAt).toLocaleString()}</p>
              </div>
            )}
            {bot.wabaId && (
              <div>
                <Label className="text-sm text-muted-foreground">{t("botManagement.fields.wabaId")}</Label>
                <p className="text-sm font-medium font-mono text-xs">{bot.wabaId}</p>
              </div>
            )}
          </div>

          {bot.errorMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{bot.errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Activation Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label className="text-sm font-medium">{t("botManagement.activation.title")}</Label>
              <p className="text-sm text-muted-foreground">
                {bot.isActive
                  ? t("botManagement.activation.activeDescription")
                  : t("botManagement.activation.inactiveDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch
                checked={bot.isActive}
                onCheckedChange={handleToggleActivation}
                disabled={updating || bot.status !== "ACTIVE"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("botManagement.rateLimits.title")}
          </CardTitle>
          <CardDescription>{t("botManagement.rateLimits.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="maxPerMin">{t("botManagement.rateLimits.perMinuteLabel")}</Label>
              <Input
                id="maxPerMin"
                type="number"
                defaultValue={bot.maxMessagesPerMin}
                onBlur={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (value !== bot.maxMessagesPerMin && value > 0) {
                    handleUpdateLimits(value, bot.maxMessagesPerDay)
                  }
                }}
                min={1}
                max={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("botManagement.rateLimits.currentPerMin", { values: { count: bot.maxMessagesPerMin } })}
              </p>
            </div>
            <div>
              <Label htmlFor="maxPerDay">{t("botManagement.rateLimits.perDayLabel")}</Label>
              <Input
                id="maxPerDay"
                type="number"
                defaultValue={bot.maxMessagesPerDay}
                onBlur={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (value !== bot.maxMessagesPerDay && value > 0) {
                    handleUpdateLimits(bot.maxMessagesPerMin, value)
                  }
                }}
                min={1}
                max={100000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("botManagement.rateLimits.currentPerDay", { values: { count: bot.maxMessagesPerDay } })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Broadcast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            {t("botManagement.welcomeBroadcast.title") || "Welcome Broadcast"}
          </CardTitle>
          <CardDescription>
            {t("botManagement.welcomeBroadcast.description") || "Send a welcome message to all customers who have interacted with your bot"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("botManagement.welcomeBroadcast.warning") || "This will send a welcome message to customers. Use with caution."}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleWelcomeBroadcast(false)}
              disabled={broadcasting || updating || bot.status !== "ACTIVE"}
              variant="default"
              className="flex-1"
            >
              {broadcasting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("botManagement.welcomeBroadcast.sending") || "Sending..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("botManagement.welcomeBroadcast.send") || "Send Welcome Message"}
                </>
              )}
            </Button>
            
            <Button
              onClick={() => handleWelcomeBroadcast(true)}
              disabled={broadcasting || updating || bot.status !== "ACTIVE"}
              variant="outline"
              className="flex-1"
            >
              {broadcasting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("botManagement.welcomeBroadcast.sending") || "Sending..."}
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 mr-2" />
                  {t("botManagement.welcomeBroadcast.sendForce") || "Force Send to All"}
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              • {t("botManagement.welcomeBroadcast.hint1") || "Regular send: Only sends to customers who haven't received a welcome message"}
            </p>
            <p>
              • {t("botManagement.welcomeBroadcast.hint2") || "Force send: Sends to all customers regardless of previous messages"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Payment Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t("botManagement.support.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bot.supportContact ? (
              <div>
                <p className="text-sm font-medium">{bot.supportContact}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href={`tel:${bot.supportContact}`}>{t("botManagement.support.callSupport")}</a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("botManagement.support.empty")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("botManagement.payment.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bot.paymentLink ? (
              <div>
                <p className="text-sm font-medium truncate">{bot.paymentLink}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href={bot.paymentLink} target="_blank" rel="noopener noreferrer">
                    {t("botManagement.payment.open")}
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("botManagement.payment.empty")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchBotData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("botManagement.actions.refresh")}
        </Button>
      </div>
    </div>
  )
}

export default function BotManagementPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <BotManagementContent />
      </DashboardLayout>
    </AuthGuard>
  )
}

