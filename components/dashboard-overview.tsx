"use client"

import { useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  MessageSquare, 
  Package, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  ArrowRight,
  Plus,
  Settings,
  Store,
  Zap,
  Bell
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts"
import { useI18n } from "@/hooks/use-i18n"
import type { DashboardOverview as DashboardOverviewData } from "@/lib/dashboard-api"
import Link from "next/link"
import { useProfile } from "@/hooks/use-dashboard-api"
import { motion } from "framer-motion"

interface DashboardOverviewProps {
  overview: DashboardOverviewData | null
  error?: string | null
  restaurantName?: string | null
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
}

export function DashboardOverview({ overview, error, restaurantName }: DashboardOverviewProps) {
  const { t, dir } = useI18n()
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const { data: profile } = useProfile()
  const appsLink = profile?.appsLink || null
  const isRtl = dir === "rtl"

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const quickActions = [
    { label: t("navigation.chats"), icon: MessageSquare, href: "/chats", color: "bg-blue-500" },
    { label: t("navigation.orders"), icon: Package, href: "/orders", color: "bg-orange-500" },
    { label: t("navigation.catalog"), icon: Store, href: "/catalog", color: "bg-green-500" },
    { label: t("navigation.campaigns"), icon: Zap, href: "/campaigns", color: "bg-purple-500" },
  ]

  return (
    <motion.div 
      className="space-y-8 pb-10"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("dashboard.overview.error")}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {overview?.restaurantName || restaurantName || t("dashboard.overview.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.overview.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {appsLink ? (
            <Link href={appsLink} target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button variant="default" className="shadow-lg shadow-primary/20">
                {t("common.openApp", { defaultValue: "Open ordering app" })}
              </Button>
            </Link>
          ) : null}
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="bg-background/50 backdrop-blur-sm">
            <RefreshCw className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"} ${isRefreshing ? "animate-spin" : ""}`} />
            {t("dashboard.overview.refresh")}
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: t("dashboard.overview.stats.activeChats.title"), value: overview?.activeConversations || 0, icon: MessageSquare, description: t("dashboard.overview.stats.activeChats.description"), href: "/chats", color: "text-blue-600" },
          { title: t("dashboard.overview.stats.ordersToday.title"), value: overview?.recentActivity?.ordersLast24h || 0, icon: Package, description: t("dashboard.overview.stats.ordersToday.description"), href: "/orders", color: "text-orange-600" },
          { title: t("dashboard.overview.stats.messagesToday.title"), value: overview?.recentActivity?.messagesLast24h || 0, icon: TrendingUp, description: t("dashboard.overview.stats.messagesToday.description"), color: "text-green-600" },
          { 
            title: t("dashboard.overview.stats.slaBreaches.title"), 
            value: overview?.slaBreaches || 0, 
            icon: overview?.slaBreaches ? AlertTriangle : CheckCircle, 
            description: overview?.slaBreaches ? t("dashboard.overview.stats.slaBreaches.warning") : t("dashboard.overview.stats.slaBreaches.ok"),
            color: overview?.slaBreaches ? "text-amber-500" : "text-emerald-500" 
          }
        ].map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="hover:shadow-md transition-shadow cursor-default overflow-hidden relative group">
              <div className={stat.href ? "cursor-pointer" : ""} onClick={() => stat.href && router.push(stat.href)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {!overview ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    </>
                  )}
                </CardContent>
                {stat.href && (
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Main Chart Area */}
        <motion.div className="lg:col-span-4 space-y-6" variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("dashboard.overview.activity.title")}</CardTitle>
                <CardDescription>{t("dashboard.overview.activity.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="flex items-center gap-1 font-normal">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {t("dashboard.overview.stats.messagesToday.title")}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 font-normal">
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                  {t("dashboard.overview.stats.ordersToday.title")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fallbackUsageData}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb923c" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis 
                      dataKey="day" 
                      stroke="var(--muted-foreground)" 
                      fontSize={12}
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)" 
                      fontSize={12}
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="var(--primary)" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMessages)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#fb923c" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrders)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Usage Quota Card */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t("dashboard.overview.usage.title")}</CardTitle>
                  <Link href="/usage">
                    <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10">
                      {t("dashboard.overview.usage.cta")}
                      <ArrowRight className={`h-3 w-3 ${isRtl ? "mr-1 rotate-180" : "ml-1"}`} />
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  {t("dashboard.overview.usage.summary", {
                    values: {
                      used: messagesUsed.toLocaleString(),
                      limit: messagesLimit.toLocaleString(),
                    },
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("dashboard.overview.usage.currentCycle")}</span>
                  <span className="font-bold">{usagePercentageLabel}%</span>
                </div>
                <Progress value={usagePercentage} className="h-2.5" />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{t("dashboard.overview.usage.resets", { values: { days: daysUntilReset } })}</span>
                  <span className="font-medium text-foreground">
                    {t("dashboard.overview.usage.remaining", {
                      values: { count: messagesRemaining.toLocaleString() },
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("common.quickActions", { defaultValue: "Quick Actions" })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, i) => (
                    <Link key={i} href={action.href}>
                      <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center hover:bg-accent hover:border-primary/50 transition-all border-dashed">
                        <div className={`p-2 rounded-full ${action.color} text-white`}>
                          <action.icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium">{action.label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Sidebar Area */}
        <motion.div className="lg:col-span-3 space-y-6" variants={item}>
          {/* Status Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-4 w-4 text-primary" />
                {t("dashboard.overview.windows.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: t("dashboard.overview.windows.activeConversations"), value: overview?.activeConversations || 0, total: (overview?.recentActivity?.conversationsLast24h || 0) + 5, color: "bg-blue-500" },
                { label: t("dashboard.overview.windows.pendingOrders"), value: overview?.pendingOrders || 0, color: "bg-orange-500" },
                { label: t("dashboard.overview.windows.sla"), value: overview?.slaBreaches || 0, unit: t("dashboard.overview.windows.breaches"), color: overview?.slaBreaches ? "bg-red-500" : "bg-emerald-500" }
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${row.color}`} />
                    <span className="text-sm font-medium">{row.label}</span>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    {row.value} {row.total ? `/ ${row.total}` : row.unit}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Template Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.overview.templates.title")}</CardTitle>
              <CardDescription>{t("dashboard.overview.templates.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-2">
                {fallbackTemplateUsage.slice(0, 4).map((template, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[150px]">{template.name}</span>
                      <span className="text-muted-foreground">{template.usage} {t("catalog.sync.items")}</span>
                    </div>
                    <Progress value={(template.usage / 50) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ratings & Feed */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{t("dashboard.overview.ratings.title")}</span>
                <Badge variant="outline" className="bg-background">
                  {overview?.ratingTrend?.averageRating?.toFixed(1) || "4.6"} ★
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.overview.ratings.average")}</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {overview?.ratingTrend?.averageRating?.toFixed(1) || "4.6"}
                  </h3>
                </div>
                <div className="text-right">
                   <div className={`inline-flex items-center gap-1 text-sm font-medium ${overview?.ratingTrend?.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <TrendingUp className={`h-4 w-4 ${overview?.ratingTrend?.trend !== 'up' && 'rotate-180'}`} />
                    {overview?.ratingTrend?.changePercent || 5}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview?.ratingTrend?.totalRatings || 128} {t("dashboard.overview.ratings.total")}
                  </p>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("dashboard.overview.ratings.highlights.title")}
                </p>
                <div className="space-y-3">
                  {[
                    t("dashboard.overview.ratings.highlights.item1"),
                    t("dashboard.overview.ratings.highlights.item2"),
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-muted-foreground leading-snug">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <Link href="/ratings">
                <Button variant="ghost" className="w-full mt-2 text-xs h-8">
                  {t("common.viewAll", { defaultValue: "View All Reviews" })}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
