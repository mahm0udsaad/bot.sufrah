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
import { Search, Download, RefreshCw, MessageSquare, Loader2, Star, TrendingUp, TrendingDown, Award, Users, ThumbsUp, ThumbsDown, Minus } from "lucide-react"
import { toast } from "sonner"
import { useRatings, useReviews, useRatingTimeline } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  )
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

  // Fetch ratings analytics
  const {
    data: ratingsData,
    loading: ratingsLoading,
    error: ratingsError,
  } = useRatings(days, locale as 'en' | 'ar')

  // Fetch reviews
  const {
    data: reviewsData,
    loading: reviewsLoading,
    error: reviewsError,
  } = useReviews({
    limit: 50,
    offset: 0,
    minRating,
    withComments,
    locale: locale as 'en' | 'ar',
  })

  // Fetch rating timeline
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

  // Filter reviews by search
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

  // Prepare pie chart data for NPS segments
  const npsSegmentsData = useMemo(() => {
    if (!ratingsData) return []
    
    return [
      { name: t("ratings.nps.promoters") || "Promoters", value: ratingsData.segments.promoters, color: "#10b981" },
      { name: t("ratings.nps.passives") || "Passives", value: ratingsData.segments.passives, color: "#f59e0b" },
      { name: t("ratings.nps.detractors") || "Detractors", value: ratingsData.segments.detractors, color: "#ef4444" },
    ]
  }, [ratingsData, t])

  // Prepare bar chart data for rating distribution
  const distributionData = useMemo(() => {
    if (!ratingsData) return []
    
    return Object.entries(ratingsData.distribution).reverse().map(([rating, count]) => ({
      rating: `${rating} ⭐`,
      count,
    }))
  }, [ratingsData])

  const loading = ratingsLoading && !ratingsData

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("ratings.header.title") || "Ratings & Reviews"}</h1>
          <p className="text-muted-foreground">{t("ratings.header.subtitle") || "Customer feedback and satisfaction metrics"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-32" dir={dir}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t("ratings.filters.last7Days") || "Last 7 days"}</SelectItem>
              <SelectItem value="30">{t("ratings.filters.last30Days") || "Last 30 days"}</SelectItem>
              <SelectItem value="90">{t("ratings.filters.last90Days") || "Last 90 days"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("ratings.actions.export") || "Export"}
          </Button>
        </div>
      </div>

      {/* NPS & Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* NPS Score Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t("ratings.metrics.nps.title") || "NPS Score"}
              </p>
              <div className="relative">
                <div className={cn(
                  "text-4xl font-bold",
                  npsScore >= 50 ? "text-green-600" :
                  npsScore >= 0 ? "text-yellow-600" : "text-red-600"
                )}>
                  {numberFormatter.format(npsScore)}
                </div>
                {ratingsData?.summary.trend === 'up' && <TrendingUp className="absolute -right-6 top-1 h-4 w-4 text-green-600" />}
                {ratingsData?.summary.trend === 'down' && <TrendingDown className="absolute -right-6 top-1 h-4 w-4 text-red-600" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {typeof changePercent === "number"
                  ? `${changePercent > 0 ? "+" : changePercent < 0 ? "-" : ""}${decimalFormatter.format(Math.abs(changePercent))}${percentSymbol} ${t("ratings.metrics.nps.vsLastPeriod") || "vs last period"}`
                  : t("ratings.metrics.nps.noChange") || "No change"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.total.title") || "Total Ratings"}</p>
                <p className="text-2xl font-bold">{numberFormatter.format(totalRatings)}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.average.title") || "Avg Rating"}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{decimalFormatter.format(averageRating)}</p>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.responseRate.title") || "Response Rate"}</p>
                <p className="text-2xl font-bold">{`${numberFormatter.format(Math.round(responseRate))}${percentSymbol}`}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.withComments.title") || "With Comments"}</p>
                <p className="text-2xl font-bold">{numberFormatter.format(commentsCount)}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NPS Segments & Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* NPS Segments Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ratings.nps.segmentsTitle") || "NPS Segments"}</CardTitle>
            <CardDescription>{t("ratings.nps.segmentsDescription") || "Customer satisfaction breakdown"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">{t("ratings.nps.promoters") || "Promoters"}</span>
                </div>
                <p className="text-2xl font-bold">{numberFormatter.format(promotersCount)}</p>
                <p className="text-xs text-muted-foreground">{`${numberFormatter.format(Math.round(promotersPercent))}${percentSymbol}`}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Minus className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">{t("ratings.nps.passives") || "Passives"}</span>
                </div>
                <p className="text-2xl font-bold">{numberFormatter.format(passivesCount)}</p>
                <p className="text-xs text-muted-foreground">{`${numberFormatter.format(Math.round(passivesPercent))}${percentSymbol}`}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">{t("ratings.nps.detractors") || "Detractors"}</span>
                </div>
                <p className="text-2xl font-bold">{numberFormatter.format(detractorsCount)}</p>
                <p className="text-xs text-muted-foreground">{`${numberFormatter.format(Math.round(detractorsPercent))}${percentSymbol}`}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={npsSegmentsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    t("ratings.nps.segmentLabel", {
                      segment: name,
                      percent: numberFormatter.format(Math.round(percent * 100)),
                      percentSymbol,
                    }) || `${name}: ${numberFormatter.format(Math.round(percent * 100))}${percentSymbol}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {npsSegmentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ratings.distribution.title") || "Rating Distribution"}</CardTitle>
            <CardDescription>{t("ratings.distribution.description") || "Breakdown by star rating"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = (ratingsData?.distribution as Record<string, number> | undefined)?.[String(star)] ?? 0
                const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0
                const roundedPercentage = Math.round(percentage)
                
                return (
                  <div key={star} className="flex items-center gap-4">
                    <div className="flex w-20 items-center justify-end gap-1">
                      <span className="text-sm font-medium">
                        {t("ratings.distribution.starLabel", { stars: numberFormatter.format(star) }) ||
                          numberFormatter.format(star)}
                      </span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-6 bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-24 text-sm text-muted-foreground text-right">
                      {t("ratings.distribution.entry", {
                        count: numberFormatter.format(count),
                        percentage: numberFormatter.format(roundedPercentage),
                        percentSymbol,
                      }) || `${numberFormatter.format(count)} (${numberFormatter.format(roundedPercentage)}${percentSymbol})`}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Timeline */}
      {timelineData && timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ratings.timeline.title") || "Rating Trend"}</CardTitle>
            <CardDescription>{t("ratings.timeline.description") || "Average rating over time"}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString(locale)}
                  formatter={(value: number) => [decimalFormatter.format(value), t("ratings.timeline.avgRating") || "Avg Rating"]}
                />
                <Line
                  type="monotone"
                  dataKey="averageRating"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Reviews Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("ratings.reviews.title") || "Recent Reviews"}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("ratings.reviews.subtitle") || "Customer feedback and comments"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  isRtl ? "right-3" : "left-3",
                )}
              />
              <Input
                dir={dir}
                placeholder={t("ratings.reviews.searchPlaceholder") || "Search reviews..."}
                className={cn("w-full", isRtl ? "pr-10 pl-3 text-right" : "pl-9")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={minRating.toString()} onValueChange={(value) => setMinRating(parseInt(value))}>
              <SelectTrigger className="w-32" dir={dir}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("ratings.filters.all") || "All ratings"}</SelectItem>
                <SelectItem value="5">
                  {t("ratings.filters.starExact", { count: numberFormatter.format(5) }) || `${numberFormatter.format(5)} ⭐`}
                </SelectItem>
                <SelectItem value="4">
                  {t("ratings.filters.starAtLeast", { count: numberFormatter.format(4) }) || `${numberFormatter.format(4)}+ ⭐`}
                </SelectItem>
                <SelectItem value="3">
                  {t("ratings.filters.starAtLeast", { count: numberFormatter.format(3) }) || `${numberFormatter.format(3)}+ ⭐`}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>{t("ratings.table.columns.customer") || "Customer"}</TableHead>
                  <TableHead>{t("ratings.table.columns.rating") || "Rating"}</TableHead>
                  <TableHead className="min-w-[300px]">{t("ratings.table.columns.comment") || "Comment"}</TableHead>
                  <TableHead>{t("ratings.table.columns.date") || "Date"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{review.customerName}</span>
                        <span className="text-xs text-muted-foreground">{review.createdAtRelative}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {t("ratings.table.ratingOutOfTen", {
                            rating: numberFormatter.format(review.rating),
                            max: numberFormatter.format(10),
                          }) || `${numberFormatter.format(review.rating)}/${numberFormatter.format(10)}`}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell>
                      {review.comment ? (
                        <p className="text-sm">{review.comment}</p>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">{t("ratings.table.noComment") || "No comment"}</span>
                      )}
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{new Date(review.createdAt).toLocaleDateString(locale)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

                {filteredReviews.length === 0 && !reviewsLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {searchQuery
                        ? t("ratings.table.noResults") || "No reviews found matching your search"
                        : t("ratings.table.empty") || "No reviews yet"}
                    </TableCell>
                  </TableRow>
                )}

                {reviewsLoading && (
                <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
                )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
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
