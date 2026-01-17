"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MessageSquare, Package, Clock, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useI18n } from "@/hooks/use-i18n"
import type { DashboardOverview as DashboardOverviewData } from "@/lib/dashboard-api"
import Link from "next/link"
import { useProfile } from "@/hooks/use-dashboard-api"

interface DashboardOverviewProps {
  overview: DashboardOverviewData | null
  error?: string | null
  restaurantName?: string | null
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

export function DashboardOverview({ overview, error, restaurantName }: DashboardOverviewProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const { data: profile } = useProfile()
  const appsLink = profile?.appsLink || null

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
  const messagesUsed = overview?.quotaUsage?.used || 0
  const messagesLimit = overview?.quotaUsage?.limit || 5000
  const usagePercentage = overview?.quotaUsage?.percentUsed || 0
  const usagePercentageLabel = usagePercentage.toFixed(1)
  const messagesRemaining = overview?.quotaUsage?.remaining || 0
  const daysUntilReset = 12 // TODO: replace with value from API when available

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh()
    })
  }

  if (!overview && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>{t("dashboard.overview.error")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {overview?.restaurantName || restaurantName || t("dashboard.overview.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.overview.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {appsLink ? (
            <Link href={appsLink} target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button size="sm" variant="default">
                {t("common.openApp", { defaultValue: "Open ordering app" })}
              </Button>
            </Link>
          ) : null}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("dashboard.overview.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.activeChats.title")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!overview ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview.activeConversations || 0}</div>
                <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.activeChats.description")}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.ordersToday.title")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!overview ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview.recentActivity?.ordersLast24h || 0}</div>
                <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.ordersToday.description")}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.messagesToday.title")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!overview ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview.recentActivity?.messagesLast24h || 0}</div>
                <p className="text-xs text-muted-foreground">{t("dashboard.overview.stats.messagesToday.description")}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.overview.stats.slaBreaches.title")}</CardTitle>
            {overview?.slaBreaches ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            {!overview ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview.slaBreaches || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {overview.slaBreaches ? t("dashboard.overview.stats.slaBreaches.warning") : t("dashboard.overview.stats.slaBreaches.ok")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
              {!overview ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                t("dashboard.overview.usage.summary", {
                  values: {
                    used: messagesUsed.toLocaleString(),
                    limit: messagesLimit.toLocaleString(),
                  },
                })
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!overview ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("dashboard.overview.usage.currentCycle")}</span>
                  <span className="font-medium">{usagePercentageLabel}%</span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("dashboard.overview.usage.resets", { values: { days: daysUntilReset } })}</span>
                  <span>
                    {t("dashboard.overview.usage.remaining", {
                      values: { count: messagesRemaining.toLocaleString() },
                    })}
                  </span>
                </div>
              </div>
            )}
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
            {!overview ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.overview.windows.activeConversations")}</span>
                  <Badge variant="secondary">
                    {overview.activeConversations || 0} / {(overview.recentActivity?.conversationsLast24h || 0) + 5}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.overview.windows.pendingOrders")}</span>
                  <Badge variant="secondary">{overview.pendingOrders || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("dashboard.overview.windows.sla")}</span>
                  <Badge variant={overview.slaBreaches ? "destructive" : "secondary"}>
                    {overview.slaBreaches || 0} {t("dashboard.overview.windows.breaches")}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.overview.activity.title")}</CardTitle>
            <CardDescription>{t("dashboard.overview.activity.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fallbackUsageData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line type="monotone" dataKey="messages" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="orders" stroke="var(--primary-foreground)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.overview.templates.title")}</CardTitle>
            <CardDescription>{t("dashboard.overview.templates.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fallbackTemplateUsage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={80} />
                  <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="usage" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.overview.ratings.title")}</CardTitle>
          <CardDescription>{t("dashboard.overview.ratings.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.overview.ratings.average")}</p>
                <h3 className="text-3xl font-bold">{overview?.ratingTrend?.averageRating?.toFixed(1) || "4.6"}</h3>
              </div>
              <Badge variant="secondary">{overview?.ratingTrend?.trend || "up"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("dashboard.overview.ratings.total")}</p>
                <p className="text-lg font-semibold">{overview?.ratingTrend?.totalRatings || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("dashboard.overview.ratings.change")}</p>
                <p className="text-lg font-semibold">{overview?.ratingTrend?.changePercent || 0}%</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/10 p-4">
              <h4 className="text-sm font-medium">{t("dashboard.overview.ratings.highlights.title")}</h4>
              <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                <li>{t("dashboard.overview.ratings.highlights.item1")}</li>
                <li>{t("dashboard.overview.ratings.highlights.item2")}</li>
                <li>{t("dashboard.overview.ratings.highlights.item3")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
