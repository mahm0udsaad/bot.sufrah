"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Calendar, 
  RefreshCw, 
  Clock, 
  Award, 
  Users,
  Zap,
  ArrowUpRight,
  ChevronRight,
  Info,
  ShieldCheck
} from "lucide-react"
import { useRestaurantUsageDetails } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemAnim = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
}

export default function UsagePage() {
  const { t, dir, locale } = useI18n()
  const { data: usage, loading, error, refetch } = useRestaurantUsageDetails('en')
  const [refreshing, setRefreshing] = useState(false)
  const isRtl = dir === "rtl"

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-96 items-center justify-center flex-col gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">{t("usage.loading")}</p>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-96 items-center justify-center">
            <Card className="max-w-md border-destructive/20 bg-destructive/5">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-destructive text-xl font-black">{t("usage.error.title")}</CardTitle>
                <CardDescription className="font-medium">{error}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <Button onClick={handleRefresh} disabled={refreshing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-8 font-bold">
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t("usage.actions.retry")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  const currentUsage = usage?.quota?.used || 0
  const monthlyLimit = usage?.quota?.limit || 1000
  const effectiveLimit = usage?.quota?.effectiveLimit || monthlyLimit
  const monthlyRemaining = usage?.quota?.remaining || 0
  const adjustedBy = usage?.quota?.adjustedBy || 0
  const usagePercentage = usage?.quota?.usagePercent || 0
  const isNearingQuota = usage?.quota?.isNearingQuota || false
  const isUnlimited = monthlyLimit === -1
  
  const activeSessionsCount = usage?.activeSessionsCount || 0
  const adjustments = usage?.adjustments || []
  const dailyBreakdown = usage?.dailyBreakdown || []
  const recentSessions = usage?.recentSessions || []

  return (
    <AuthGuard>
    <DashboardLayout>
      <motion.div 
        className="space-y-8 pb-10"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">{t("usage.title")}</h1>
              <p className="text-muted-foreground mt-1 text-lg">{t("usage.subtitle")}</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="bg-background shadow-sm border-border/60 rounded-xl h-11 px-6 font-bold">
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            )}
            {t("usage.actions.refresh")}
          </Button>
        </div>

        {/* Current Usage Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div variants={itemAnim} className="lg:col-span-8">
            <Card className="h-full border-border/50 shadow-sm overflow-hidden group">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                    <Activity className="h-5 w-5 text-primary" />
                    {t("usage.cards.volume.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t("usage.cards.volume.used")}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black tracking-tighter text-primary">{currentUsage.toLocaleString()}</span>
                          {!isUnlimited && (
                            <span className="text-lg font-bold text-muted-foreground/60">
                              / {effectiveLimit.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(
                          "px-4 py-1 rounded-full font-black text-sm border-2",
                          usagePercentage > 90 ? "bg-red-500/10 text-red-600 border-red-200" :
                          usagePercentage > 70 ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                          "bg-primary/10 text-primary border-primary/20"
                        )}>
                          {t("usage.cards.volume.consumed", { percent: Math.round(usagePercentage) })}
                        </Badge>
                      </div>
                  </div>
                  
                  {!isUnlimited && (
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-muted rounded-full overflow-hidden p-1 shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${usagePercentage}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full shadow-lg",
                            usagePercentage > 90 ? "bg-gradient-to-r from-red-500 to-red-600" :
                            usagePercentage > 70 ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                            "bg-gradient-to-r from-primary to-indigo-600"
                          )}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tighter">
                        <span className="text-muted-foreground">{t("usage.cards.volume.cycleProgress")}</span>
                        <span className="text-foreground">{t("usage.cards.volume.remaining", { count: monthlyRemaining.toLocaleString() })}</span>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isNearingQuota && !isUnlimited && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-amber-900">{t("usage.cards.volume.approaching")}</p>
                          <p className="text-xs text-amber-800 font-medium opacity-80">
                            {t("usage.cards.volume.approachingDesc", { percent: Math.round(usagePercentage) })}
                          </p>
                        </div>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg h-9">
                          {t("usage.actions.upgrade")}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isUnlimited && (
                    <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-emerald-900">{t("usage.cards.volume.unlimited")}</p>
                        <p className="text-xs text-emerald-800 font-medium opacity-80">{t("usage.cards.volume.unlimitedDesc")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemAnim} className="lg:col-span-4">
            <Card className="h-full border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                    <Zap className="h-5 w-5 text-amber-500" />
                    {t("usage.cards.quota.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {[
                    { label: t("usage.cards.quota.planLimit"), value: isUnlimited ? t("usage.cards.quota.unlimited") : monthlyLimit.toLocaleString(), icon: Calendar, color: "text-blue-500" },
                    { label: t("usage.cards.quota.topups"), value: adjustedBy > 0 ? `+${adjustedBy.toLocaleString()}` : "0", icon: ArrowUpRight, color: adjustedBy > 0 ? "text-emerald-500" : "text-muted-foreground" },
                    { label: t("usage.cards.quota.effectiveLimit"), value: isUnlimited ? t("usage.cards.quota.unlimited") : effectiveLimit.toLocaleString(), icon: Award, color: "text-primary", highlight: true },
                    { label: t("usage.cards.quota.activeSessions"), value: activeSessionsCount, icon: Users, color: "text-purple-500" }
                  ].map((row, i) => (
                    <div key={i} className={cn(
                      "flex items-center justify-between p-4 rounded-xl transition-all",
                      row.highlight ? "bg-primary/5 border border-primary/20 shadow-sm shadow-primary/5" : "hover:bg-muted/30"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border/40")}>
                          <row.icon className={cn("h-4 w-4", row.color)} />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">{row.label}</span>
                      </div>
                      <span className={cn("font-black text-base", row.highlight ? "text-primary" : "text-foreground")}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: History & Tables */}
          <div className="lg:col-span-8 space-y-8">
            {/* Daily Breakdown */}
            {dailyBreakdown.length > 0 && (
              <motion.div variants={itemAnim}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      {t("usage.cards.daily.title")}
                    </CardTitle>
                    <CardDescription className="font-medium">{t("usage.cards.daily.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="font-black py-4 text-start">{t("usage.cards.daily.date")}</TableHead>
                            <TableHead className="text-right font-black py-4">{t("usage.cards.daily.conversations")}</TableHead>
                            <TableHead className="text-right font-black py-4">{t("usage.cards.daily.volume")}</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyBreakdown.map((day) => (
                            <TableRow key={day.date} className="group hover:bg-primary/5 transition-colors border-border/50">
                              <TableCell className="font-bold py-4">
                                {new Date(day.date).toLocaleDateString(locale, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className="text-right py-4">
                                {day.conversationsStarted > 0 ? (
                                  <Badge className="font-black bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                                    {day.conversationsStarted}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/30 font-black">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-4 font-mono font-bold text-muted-foreground">
                                {day.messages > 0 ? day.messages.toLocaleString() : '0'}
                              </TableCell>
                              <TableCell className="py-4">
                                <ChevronRight className={cn("h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-all", isRtl && "rotate-180")} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <motion.div variants={itemAnim}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                      <Clock className="h-5 w-5 text-blue-600" />
                      {t("usage.cards.sessions.title")}
                    </CardTitle>
                    <CardDescription className="font-medium">{t("usage.cards.sessions.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="font-black py-4 text-start">{t("usage.cards.sessions.customer")}</TableHead>
                            <TableHead className="font-black py-4 text-start">{t("usage.cards.sessions.start")}</TableHead>
                            <TableHead className="font-black py-4 text-start">{t("usage.cards.sessions.lastActivity")}</TableHead>
                            <TableHead className="text-right font-black py-4">{t("usage.cards.sessions.messages")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentSessions.map((session) => (
                            <TableRow key={session.id} className="group hover:bg-primary/5 transition-colors border-border/50">
                              <TableCell className="font-mono text-sm py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-black group-hover:bg-primary group-hover:text-white transition-all">
                                    ID
                                  </div>
                                  <span className="font-bold group-hover:text-primary transition-colors">{session.customerPhone}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-bold text-muted-foreground py-4">
                                {new Date(session.startedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-muted-foreground py-4">
                                {new Date(session.lastMessageAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                              </TableCell>
                              <TableCell className="text-right py-4">
                                <Badge variant="outline" className="font-black h-7 bg-background">
                                  {session.messageCount}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right: Top-ups & Info */}
          <div className="lg:col-span-4 space-y-8">
            {/* Top-ups History */}
            {adjustments.length > 0 && (
              <motion.div variants={itemAnim}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
                    <CardTitle className="flex items-center gap-2 text-lg font-black text-emerald-900">
                      <Award className="h-5 w-5 text-emerald-600" />
                      {t("usage.cards.history.title")}
                    </CardTitle>
                    <CardDescription className="text-emerald-800/70 font-bold uppercase tracking-widest text-[10px]">{t("usage.cards.history.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {adjustments.map((adjustment) => (
                        <div key={adjustment.id} className="flex flex-col gap-1 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl group hover:border-emerald-500/30 transition-all">
                          <div className="flex items-center justify-between">
                            <p className="font-black text-emerald-900 text-lg">+{adjustment.amount.toLocaleString()}</p>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              {new Date(adjustment.createdAt).toLocaleDateString(locale)}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-800 font-bold opacity-70 italic line-clamp-2">“{adjustment.reason}”</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Information Card */}
            <motion.div variants={itemAnim}>
              <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Info className="w-32 h-32 text-primary" />
                </div>
                <CardContent className="p-8 relative z-10">
                  <div className="flex flex-col gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                      <Info className="h-7 w-7 text-primary" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-primary leading-tight">
                        {t("usage.cards.info.title")}
                      </h3>
                      <div className="space-y-4 text-sm font-medium text-primary/80 leading-relaxed">
                        <p>
                          {t("usage.cards.info.desc1")} <span className="font-black text-primary underline decoration-primary/30">{t("usage.cards.info.desc1Highlight")}</span>{t("usage.cards.info.desc1End")}
                        </p>
                        <p>
                          {t("usage.cards.info.desc2")}
                        </p>
                        {adjustedBy > 0 && (
                          <div className="p-4 bg-background/50 rounded-xl border border-primary/10">
                            <p className="font-black text-primary">
                              {t("usage.cards.info.proTip", { count: adjustedBy.toLocaleString() })}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button className="w-full bg-primary text-primary-foreground font-black rounded-xl h-11 shadow-lg shadow-primary/20">
                        {t("usage.cards.info.button")}
                        <ArrowUpRight className={cn("h-4 w-4", isRtl ? "mr-2" : "ml-2")} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Activity Status Card */}
            {usage?.firstActivity && usage?.lastActivity && (
              <motion.div variants={itemAnim}>
                <Card className="border-border/50 shadow-sm overflow-hidden bg-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t("usage.cards.context.title")}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-8">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">{t("usage.cards.context.launchDate")}</p>
                        <p className="text-lg font-black text-foreground">
                          {new Date(usage.firstActivity).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border/50" />
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">{t("usage.cards.context.lastActivity")}</p>
                        <p className="text-lg font-black text-foreground">
                          {new Date(usage.lastActivity).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
    </AuthGuard>
  )
}
