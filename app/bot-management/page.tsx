"use client"

import { useEffect, useState } from "react"
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
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

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

const STATUS_CONFIG = {
  PENDING: { 
    label: "Pending Verification", 
    icon: Clock, 
    badge: "bg-yellow-100 text-yellow-800",
    description: "Waiting for sender verification"
  },
  VERIFYING: { 
    label: "Verifying", 
    icon: RefreshCw, 
    badge: "bg-blue-100 text-blue-800",
    description: "Verification in progress"
  },
  ACTIVE: { 
    label: "Active", 
    icon: CheckCircle2, 
    badge: "bg-green-100 text-green-800",
    description: "Bot is operational"
  },
  FAILED: { 
    label: "Failed", 
    icon: XCircle, 
    badge: "bg-red-100 text-red-800",
    description: "Verification or setup failed"
  },
}

function BotManagementContent() {
  const { user } = useAuth()
  const [bot, setBot] = useState<RestaurantBot | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

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
      toast.error("Unable to load bot management data")
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
        toast.success(data.bot.isActive ? "Bot activated successfully" : "Bot deactivated successfully")
      }
    } catch (error) {
      console.error("Failed to toggle bot:", error)
      toast.error("Unable to update bot activation status")
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
        toast.success("Rate limits updated successfully")
      }
    } catch (error) {
      console.error("Failed to update limits:", error)
      toast.error("Unable to update rate limits")
    } finally {
      setUpdating(false)
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
          No bot configuration found for this restaurant. Please complete onboarding first.
        </AlertDescription>
      </Alert>
    )
  }

  const statusConfig = STATUS_CONFIG[bot.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bot Management</h1>
        <p className="text-muted-foreground">Configure and monitor your WhatsApp bot</p>
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
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm text-muted-foreground">WhatsApp Number</Label>
              <p className="text-sm font-medium">{bot.whatsappNumber}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <p className="text-sm font-medium">{statusConfig.description}</p>
            </div>
            {bot.verifiedAt && (
              <div>
                <Label className="text-sm text-muted-foreground">Verified At</Label>
                <p className="text-sm font-medium">{new Date(bot.verifiedAt).toLocaleString()}</p>
              </div>
            )}
            {bot.wabaId && (
              <div>
                <Label className="text-sm text-muted-foreground">WhatsApp Business Account ID</Label>
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
              <Label className="text-sm font-medium">Bot Activation</Label>
              <p className="text-sm text-muted-foreground">
                {bot.isActive ? "Bot is currently active and responding to messages" : "Bot is currently inactive"}
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
            Rate Limits
          </CardTitle>
          <CardDescription>Control message sending limits to prevent throttling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="maxPerMin">Messages per Minute</Label>
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
                Current: {bot.maxMessagesPerMin} msg/min
              </p>
            </div>
            <div>
              <Label htmlFor="maxPerDay">Messages per Day</Label>
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
                Current: {bot.maxMessagesPerDay} msg/day
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Payment Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Support Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bot.supportContact ? (
              <div>
                <p className="text-sm font-medium">{bot.supportContact}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href={`tel:${bot.supportContact}`}>Call Support</a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No support contact configured</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bot.paymentLink ? (
              <div>
                <p className="text-sm font-medium truncate">{bot.paymentLink}</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href={bot.paymentLink} target="_blank" rel="noopener noreferrer">
                    Open Payment Link
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payment link configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Twilio Configuration (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Configuration</CardTitle>
          <CardDescription>Read-only view of Twilio sender configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <Label className="text-muted-foreground">Account SID</Label>
              <p className="font-mono text-xs mt-1">{bot.accountSid}</p>
            </div>
            {bot.subaccountSid && (
              <div>
                <Label className="text-muted-foreground">Subaccount SID</Label>
                <p className="font-mono text-xs mt-1">{bot.subaccountSid}</p>
              </div>
            )}
            {bot.senderSid && (
              <div>
                <Label className="text-muted-foreground">Sender SID</Label>
                <p className="font-mono text-xs mt-1">{bot.senderSid}</p>
              </div>
            )}
            {bot.verificationSid && (
              <div>
                <Label className="text-muted-foreground">Verification SID</Label>
                <p className="font-mono text-xs mt-1">{bot.verificationSid}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchBotData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
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

