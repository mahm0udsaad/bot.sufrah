"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MessageSquare, Package, Clock, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/hooks/use-i18n"

interface DashboardStats {
  active_conversations: number
  todays_orders: number
  messages_today: number
  active_templates: number
}

interface UsageData {
  day: string
  messages: number
  orders: number
}

interface TemplateUsage {
  name: string
  usage: number
  category: string
}

export function DashboardOverview() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [usageData, setUsageData] = useState<UsageData[]>([])
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([])
  const [loading, setLoading] = useState(true)
  const fallbackUsageData = useMemo(
    () => [
      { day: t("dashboard.overview.activity.days.mon"), messages: 420, orders: 12 },
      { day: t("dashboard.overview.activity.days.tue"), messages: 380, orders: 8 },
      { day: t("dashboard.overview.activity.days.wed"), messages: 520, orders: 15 },
      { day: t("dashboard.overview.activity.days.thu"), messages: 290, orders: 6 },
      { day: t("dashboard.overview.activity.days.fri"), messages: 650, orders: 18 },
      { day: t("dashboard.overview.activity.days.sat"), messages: 480, orders: 14 },
      { day: t("dashboard.overview.activity.days.sun"), messages: 380, orders: 10 },
    ],
    [t],
  )
  const fallbackTemplateUsage = useMemo(
    () => [
      { name: t("dashboard.overview.templates.fallback.welcome"), usage: 42, category: "greeting" },
      { name: t("dashboard.overview.templates.fallback.confirmation"), usage: 37, category: "order" },
      { name: t("dashboard.overview.templates.fallback.delivery"), usage: 21, category: "delivery" },
      { name: t("dashboard.overview.templates.fallback.menu"), usage: 15, category: "menu" },
      { name: t("dashboard.overview.templates.fallback.payment"), usage: 8, category: "payment" },
    ],
    [t],
  )
  const translateDayLabel = (label: string) => {
    const normalized = label?.toLowerCase()
    if (normalized.startsWith("mon")) return t("dashboard.overview.activity.days.mon")
    if (normalized.startsWith("tue")) return t("dashboard.overview.activity.days.tue")
    if (normalized.startsWith("wed")) return t("dashboard.overview.activity.days.wed")
    if (normalized.startsWith("thu")) return t("dashboard.overview.activity.days.thu")
    if (normalized.startsWith("fri")) return t("dashboard.overview.activity.days.fri")
    if (normalized.startsWith("sat")) return t("dashboard.overview.activity.days.sat")
    if (normalized.startsWith("sun")) return t("dashboard.overview.activity.days.sun")
    return label
  }
  const resolvedUsageData = useMemo(
    () =>
      usageData.length > 0
        ? usageData.map((item) => ({ ...item, day: translateDayLabel(item.day) }))
        : fallbackUsageData,
    [usageData, fallbackUsageData, t],
  )
  const resolvedTemplateUsage = useMemo(
    () => (templateUsage.length > 0 ? templateUsage : fallbackTemplateUsage),
    [templateUsage, fallbackTemplateUsage],
  )

  // Mock data for demonstration - in production this would come from API
  const messagesUsed = 3214
  const messagesLimit = 5000
  const usagePercentage = (messagesUsed / messagesLimit) * 100
  const daysUntilReset = 12
  const usagePercentageLabel = usagePercentage.toFixed(1)
  const messagesRemaining = messagesLimit - messagesUsed

  useEffect(() => {
    if (!user) return

    const loadDashboardData = async () => {
      try {
        // Load dashboard stats
        const statsResponse = await fetch("/api/dashboard/stats")
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        // Load usage analytics
        const usageResponse = await fetch("/api/dashboard/usage")
        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          setUsageData(usageData)
        }

        // Load template analytics
        const templateResponse = await fetch("/api/dashboard/templates")
        if (templateResponse.ok) {
          const templateData = await templateResponse.json()
          setTemplateUsage(templateData)
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("dashboard.overview.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.overview.subtitle")}</p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.activeChats.title")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_conversations || 0}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.activeChats.description")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.ordersToday.title")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todays_orders || 0}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.ordersToday.description")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.messagesToday.title")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.messages_today || 0}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.messagesToday.description")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.activeTemplates.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_templates || 0}</div>
            <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.activeTemplates.description")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage and Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t("dashboard.overview.usage.title")}
              <Button variant="outline" size="sm">
                {t("dashboard.overview.usage.cta")}
              </Button>
            </CardTitle>
            <CardDescription>
              {t("dashboard.overview.usage.summary", {
                values: {
                  used: messagesUsed.toLocaleString(),
                  limit: messagesLimit.toLocaleString(),
                },
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{t("dashboard.overview.usage.currentCycle")}</span>
                <span className="font-medium">{usagePercentageLabel}%</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t("dashboard.overview.usage.resets", { values: { days: daysUntilReset } })}
                </span>
                <span>
                  {t("dashboard.overview.usage.remaining", {
                    values: { count: messagesRemaining.toLocaleString() },
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("dashboard.overview.windows.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("dashboard.overview.windows.activeConversations")}</span>
              <Badge variant="secondary">
                {t("dashboard.overview.windows.openConversations", {
                  values: { count: stats?.active_conversations || 0 },
                })}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("dashboard.overview.windows.messagesToday")}</span>
              <Badge variant="outline">
                {t("dashboard.overview.windows.messagesCount", {
                  values: { count: stats?.messages_today || 0 },
                })}
              </Badge>
            </div>
            {usagePercentage > 80 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">{t("dashboard.overview.windows.alert.title")}</p>
                  <p className="text-amber-700">
                    {t("dashboard.overview.windows.alert.body", {
                      values: { percentage: usagePercentageLabel },
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.overview.activity.title")}</CardTitle>
            <CardDescription>{t("dashboard.overview.activity.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={resolvedUsageData}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name={t("dashboard.overview.activity.legend.messages")}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name={t("dashboard.overview.activity.legend.orders")}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.overview.templates.title")}</CardTitle>
            <CardDescription>{t("dashboard.overview.templates.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={resolvedTemplateUsage}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="usage" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Orders Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("dashboard.overview.ordersSnapshot.title")}
          </CardTitle>
          <CardDescription>{t("dashboard.overview.ordersSnapshot.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-blue-800">{t("dashboard.overview.ordersSnapshot.pending")}</p>
                <p className="text-2xl font-bold text-blue-900">8</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <p className="text-sm font-medium text-amber-800">{t("dashboard.overview.ordersSnapshot.preparing")}</p>
                <p className="text-2xl font-bold text-amber-900">12</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm font-medium text-purple-800">{t("dashboard.overview.ordersSnapshot.ready")}</p>
                <p className="text-2xl font-bold text-purple-900">5</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="text-sm font-medium text-green-800">{t("dashboard.overview.ordersSnapshot.delivered")}</p>
                <p className="text-2xl font-bold text-green-900">22</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
