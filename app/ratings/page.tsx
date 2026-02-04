"use client"

import { useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  Download, 
  RefreshCw, 
  MessageSquare, 
  Loader2, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Users, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Calendar,
  Filter,
  ArrowUpRight,
  User,
  Quote
} from "lucide-react"
import { toast } from "sonner"
import { useRatings, useReviews, useRatingTimeline } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from "recharts"
import { motion, AnimatePresence } from "framer-motion"

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
          } transition-all duration-300`}
        />
      ))}
    </div>
  )
}

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

function RatingsContent() {
  const { t, dir, locale } = useI18n()
  const [days, setDays] = useState(30)
  const [minRating, setMinRating] = useState(1)
  const [withComments, setWithComments] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const isRtl = dir === "rtl"
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  )
  const percentSymbol = locale === "ar" ? "٪" : "%"

  const {
    data: ratingsData,
    loading: ratingsLoading,
    error: ratingsError,
  } = useRatings(days, locale as 'en' | 'ar')

  const {
    data: reviewsData,
    loading: reviewsLoading,
  } = useReviews({
    limit: 50,
    offset: 0,
    minRating,
    withComments,
    locale: locale as 'en' | 'ar',
  })

  const {
    data: timelineData,
    loading: timelineLoading,
  } = useRatingTimeline(days, locale as 'en' | 'ar')

  const npsScore = ratingsData?.summary.nps ?? 0
  const totalRatings = ratingsData?.summary.totalRatings ?? 0
  const averageRating = ratingsData?.summary.averageRating ?? 0
  const responseRate = ratingsData?.summary.responseRate ?? 0
  const commentsCount = ratingsData?.withComments ?? 0
  const changePercent = ratingsData?.summary.changePercent
  const promotersCount = ratingsData?.segments.promoters ?? 0
  const passivesCount = ratingsData?.segments.passives ?? 0
  const detractorsCount = ratingsData?.segments.detractors ?? 0
  const promotersPercent = ratingsData?.segments.promotersPercent ?? 0
  const passivesPercent = ratingsData?.segments.passivesPercent ?? 0
  const detractorsPercent = ratingsData?.segments.detractorsPercent ?? 0

  const filteredReviews = useMemo(() => {
    if (!reviewsData?.reviews) return []
    
    const query = searchQuery.trim().toLowerCase()
    if (!query) return reviewsData.reviews

    return reviewsData.reviews.filter((review) => {
      const customerName = review.customerName.toLowerCase()
      const comment = (review.comment || "").toLowerCase()
      return customerName.includes(query) || comment.includes(query)
    })
  }, [reviewsData, searchQuery])

  const npsSegmentsData = useMemo(() => {
    if (!ratingsData) return []
    return [
      { name: t("ratings.nps.promoters") || "Promoters", value: ratingsData.segments.promoters, color: "#10b981" },
      { name: t("ratings.nps.passives") || "Passives", value: ratingsData.segments.passives, color: "#f59e0b" },
      { name: t("ratings.nps.detractors") || "Detractors", value: ratingsData.segments.detractors, color: "#ef4444" },
    ]
  }, [ratingsData, t])

  const loading = ratingsLoading && !ratingsData

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Analyzing customer feedback...</p>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8 pb-10"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{t("ratings.header.title") || "Ratings & Reviews"}</h1>
          <p className="text-muted-foreground mt-1 text-lg">{t("ratings.header.subtitle") || "Deep insights into customer satisfaction"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-11 flex items-center bg-muted/50 rounded-xl border border-border/50 p-1">
            <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
              <SelectTrigger className="w-40 border-0 bg-transparent shadow-none focus:ring-0 font-bold" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl p-1">
                <SelectItem value="7" className="rounded-lg">{t("ratings.filters.last7Days") || "Last 7 days"}</SelectItem>
                <SelectItem value="30" className="rounded-lg">{t("ratings.filters.last30Days") || "Last 30 days"}</SelectItem>
                <SelectItem value="90" className="rounded-lg">{t("ratings.filters.last90Days") || "Last 90 days"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="bg-background shadow-sm border-border/60 rounded-xl h-11 px-5 font-bold">
            <Download className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("ratings.actions.export") || "Export"}
          </Button>
        </div>
      </div>

      {/* Modern Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <motion.div variants={itemAnim} className="md:col-span-2 lg:col-span-1">
          <Card className="h-full border-primary/20 bg-primary/5 shadow-lg shadow-primary/5">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center space-y-2">
              <p className="text-xs font-black text-primary/60 uppercase tracking-widest">
                {t("ratings.metrics.nps.title") || "NPS Score"}
              </p>
              <div className="relative">
                <div className={cn(
                  "text-5xl font-black tracking-tighter",
                  npsScore >= 50 ? "text-emerald-600" :
                  npsScore >= 0 ? "text-amber-600" : "text-red-600"
                )}>
                  {numberFormatter.format(npsScore)}
                </div>
                {ratingsData?.summary.trend === 'up' ? (
                  <div className="absolute -right-8 top-1 p-1 bg-emerald-100 rounded-full">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="absolute -right-8 top-1 p-1 bg-red-100 rounded-full">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground bg-background/50 px-2 py-1 rounded-full border border-primary/10">
                {typeof changePercent === "number"
                  ? `${changePercent > 0 ? "+" : ""}${decimalFormatter.format(changePercent)}${percentSymbol} vs last period`
                  : "Stable Period"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {[
          { label: "Total Ratings", value: totalRatings, icon: Users, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Avg Rating", value: decimalFormatter.format(averageRating), icon: Star, color: "text-yellow-600", bg: "bg-yellow-500/10", suffix: "/ 5.0" },
          { label: "Response Rate", value: Math.round(responseRate), icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-500/10", suffix: "%" },
          { label: "With Feedback", value: commentsCount, icon: Quote, color: "text-emerald-600", bg: "bg-emerald-500/10" }
        ].map((stat, i) => (
          <motion.div key={i} variants={itemAnim}>
            <Card className="h-full border-border/50 group hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300 mb-4", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black">{stat.value.toLocaleString()}</p>
                    {stat.suffix && <span className="text-xs text-muted-foreground font-black">{stat.suffix}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* NPS Segments Card */}
        <motion.div variants={itemAnim}>
          <Card className="border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-lg font-black">{t("ratings.nps.segmentsTitle") || "NPS Segments"}</CardTitle>
              <CardDescription className="font-medium">Customer sentiment breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                {[
                  { label: "Promoters", value: promotersCount, percent: promotersPercent, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: ThumbsUp },
                  { label: "Passives", value: passivesCount, percent: passivesPercent, color: "text-amber-600", bg: "bg-amber-500/10", icon: Minus },
                  { label: "Detractors", value: detractorsCount, percent: detractorsPercent, color: "text-red-600", bg: "bg-red-500/10", icon: ThumbsDown }
                ].map((seg, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className={cn("w-10 h-10 mx-auto rounded-xl flex items-center justify-center", seg.bg)}>
                      <seg.icon className={cn("h-5 w-5", seg.color)} />
                    </div>
                    <div>
                      <p className="text-xl font-black">{numberFormatter.format(seg.value)}</p>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", seg.color)}>{seg.label}</p>
                    </div>
                    <Badge variant="outline" className="font-bold bg-background">
                      {numberFormatter.format(Math.round(seg.percent))}{percentSymbol}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={npsSegmentsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {npsSegmentsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rating Distribution Card */}
        <motion.div variants={itemAnim}>
          <Card className="border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-lg font-black">{t("ratings.distribution.title") || "Rating Distribution"}</CardTitle>
              <CardDescription className="font-medium">Star ratings breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = (ratingsData?.distribution as Record<string, number> | undefined)?.[String(star)] ?? 0
                  const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0
                  
                  return (
                    <div key={star} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black">{star}</span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black">{numberFormatter.format(count)}</span>
                          <span className="text-xs font-bold text-muted-foreground/60 uppercase">Reviews</span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            star >= 4 ? "bg-emerald-500" : star >= 3 ? "bg-amber-400" : "bg-red-500"
                          )}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-8 p-4 rounded-2xl bg-muted/30 border border-dashed border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-black">Customer Satisfaction</p>
                  <p className="text-xs text-muted-foreground font-medium">Based on {totalRatings.toLocaleString()} verified reviews from the last period.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Timeline Trend Area Chart */}
      {timelineData && timelineData.length > 0 && (
        <motion.div variants={itemAnim}>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-lg font-black">Performance Trend</CardTitle>
              <CardDescription className="font-medium">Daily average rating tracking</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      fontWeight="bold"
                    />
                    <YAxis 
                      domain={[0, 5]} 
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      fontWeight="bold"
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString(locale, { dateStyle: 'long' })}
                      formatter={(value: number) => [decimalFormatter.format(value), "Average Rating"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="averageRating"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRating)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reviews Section */}
      <motion.div variants={itemAnim}>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border/50 bg-muted/10 p-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black">Customer Feedback</CardTitle>
              <CardDescription className="font-medium">Direct reviews from your customers</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", isRtl ? "right-4" : "left-4")} />
                <Input
                  dir={dir}
                  placeholder="Search reviews..."
                  className={cn("w-full h-11 bg-background rounded-xl border-border/60 pl-11 focus:ring-primary/20 transition-all font-medium")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="h-11 flex items-center bg-muted/50 rounded-xl border border-border/50 p-1">
                <Select value={minRating.toString()} onValueChange={(value) => setMinRating(parseInt(value))}>
                  <SelectTrigger className="w-40 border-0 bg-transparent shadow-none focus:ring-0 font-bold" dir={isRtl ? "rtl" : "ltr"}>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1">
                    <SelectItem value="1" className="rounded-lg">All ratings</SelectItem>
                    {[5, 4, 3, 2].map(r => (
                      <SelectItem key={r} value={r.toString()} className="rounded-lg">
                        <div className="flex items-center gap-1 font-bold">
                          {r} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-bold py-4">Customer</TableHead>
                    <TableHead className="font-bold py-4">Rating</TableHead>
                    <TableHead className="font-bold py-4 min-w-[350px]">Feedback Content</TableHead>
                    <TableHead className="font-bold py-4 text-right">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredReviews.map((review) => (
                      <motion.tr 
                        key={review.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-primary/5 transition-colors border-border/50"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/10">
                              {review.customerName?.charAt(0) || <User className="h-5 w-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-foreground">{review.customerName}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{review.createdAtRelative}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <StarRating rating={review.rating} />
                            <span className="text-[10px] font-black text-muted-foreground/60">
                              SCORE: {review.rating}/10
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {review.comment ? (
                            <div className="flex gap-3 max-w-xl">
                              <Quote className="h-4 w-4 text-primary/30 flex-shrink-0 mt-1" />
                              <p className="text-sm font-medium leading-relaxed italic text-foreground/80">{review.comment}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 font-bold uppercase tracking-widest italic">Rating Only (No Text)</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex flex-col text-sm font-bold">
                            <span>{new Date(review.createdAt).toLocaleDateString(locale, { dateStyle: 'medium' })}</span>
                            <span className="text-[10px] text-muted-foreground/60 uppercase">
                              {new Date(review.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>

                  {filteredReviews.length === 0 && !reviewsLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
                            <Star className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-foreground">
                              {searchQuery ? "No reviews found" : "No feedback yet"}
                            </p>
                            <p className="text-sm text-muted-foreground">Reviews will appear here once customers provide feedback.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default function RatingsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <RatingsContent />
      </DashboardLayout>
    </AuthGuard>
  )
}
