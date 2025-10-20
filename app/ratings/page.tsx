"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Eye, Loader2, Star, TrendingUp, MessageSquare, Award } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { cn, normalizeCurrencyCode } from "@/lib/utils"
import { useI18n } from "@/hooks/use-i18n"

interface Rating {
  id: string
  orderReference: string | null
  orderNumber: number | null
  restaurantId: string
  conversationId: string
  customerPhone: string
  customerName: string | null
  rating: number
  ratingComment: string | null
  ratedAt: string
  ratingAskedAt: string | null
  orderType: string | null
  paymentMethod: string | null
  totalCents: number
  currency: string
  branchId: string | null
  branchName: string | null
  orderCreatedAt: string
}

interface RatingWithItems extends Rating {
  items: Array<{
    id: string
    name: string
    quantity: number
    unitCents: number
    totalCents: number
  }>
}

interface RatingStats {
  totalRatings: number
  averageRating: number
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

function formatCurrency(amountCents: number, currency: string) {
  const code = normalizeCurrencyCode(currency)
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format((amountCents || 0) / 100)
  } catch {
    const amount = ((amountCents || 0) / 100).toFixed(2)
    return `${amount} ${code}`
  }
}

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
  const { user } = useAuth()
  const { t, dir, locale } = useI18n()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [ratingFilter, setRatingFilter] = useState("ALL")
  const [selectedRating, setSelectedRating] = useState<RatingWithItems | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const isRtl = dir === "rtl"
  const ratingOptionsList = useMemo(
    () => [
      { value: "ALL", label: t("ratings.filters.options.all") },
      { value: "5", label: t("ratings.filters.options.five") },
      { value: "4", label: t("ratings.filters.options.four") },
      { value: "3", label: t("ratings.filters.options.three") },
      { value: "2", label: t("ratings.filters.options.two") },
      { value: "1", label: t("ratings.filters.options.one") },
    ],
    [t],
  )
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale)
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(locale)
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString(locale)

  const fetchRatings = async () => {
    try {
      setLoading(true)
      const [ratingsRes, statsRes] = await Promise.all([
        fetch("/api/db/ratings?limit=100", { cache: "no-store" }),
        fetch("/api/db/ratings/stats", { cache: "no-store" }),
      ])

      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json()
        setRatings(ratingsData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error("Failed to load ratings", error)
      toast.error(t("ratings.toasts.loadFailed"))
    } finally {
      setLoading(false)
    }
  }

  const fetchRatingDetail = async (ratingId: string) => {
    try {
      setLoadingDetail(true)
      const response = await fetch(`/api/db/ratings/${ratingId}`, { cache: "no-store" })

      if (response.ok) {
        const data = await response.json()
        setSelectedRating(data)
      } else {
        toast.error(t("ratings.toasts.detailFailed"))
      }
    } catch (error) {
      console.error("Failed to load rating detail", error)
      toast.error(t("ratings.toasts.detailFailed"))
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (user) {
      void fetchRatings()
    }
  }, [user])

  const filteredRatings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const ratingValue = ratingFilter === "ALL" ? null : parseInt(ratingFilter)

    return ratings.filter((rating) => {
      const customerName = (rating.customerName || "").toLowerCase()
      const customerPhone = rating.customerPhone.toLowerCase()
      const comment = (rating.ratingComment || "").toLowerCase()
      const matchesQuery =
        !query ||
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        comment.includes(query) ||
        rating.id.toLowerCase().includes(query)

      const matchesRating = ratingValue === null || rating.rating === ratingValue

      return matchesQuery && matchesRating
    })
  }, [ratings, searchQuery, ratingFilter])

  const positiveRatingsPercentage = useMemo(() => {
    if (!stats || stats.totalRatings === 0) return 0
    const positiveCount = (stats.distribution[4] || 0) + (stats.distribution[5] || 0)
    return Math.round((positiveCount / stats.totalRatings) * 100)
  }, [stats])

  const negativeRatingsCount = useMemo(() => {
    if (!stats) return 0
    return (stats.distribution[1] || 0) + (stats.distribution[2] || 0) + (stats.distribution[3] || 0)
  }, [stats])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("ratings.header.title")}</h1>
          <p className="text-muted-foreground">{t("ratings.header.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("ratings.actions.export")}
          </Button>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-40" dir={dir}>
              <SelectValue placeholder={t("ratings.filters.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {ratingOptionsList.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.total.title")}</p>
                <p className="text-2xl font-bold">{stats?.totalRatings ?? 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.average.title")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-bold">{stats?.averageRating.toFixed(2) ?? "0.00"}</p>
                  <StarRating rating={Math.round(stats?.averageRating ?? 0)} size="sm" />
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.positive.title")}</p>
                <p className="text-2xl font-bold">{positiveRatingsPercentage}%</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("ratings.metrics.positive.hint")}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("ratings.metrics.negative.title")}</p>
                <p className="text-2xl font-bold">{negativeRatingsCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("ratings.metrics.negative.hint")}</p>
              </div>
              <Award className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution Chart */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ratings.distribution.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star as keyof typeof stats.distribution] || 0
                const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-4">
                    <div className="flex w-24 items-center gap-1">
                      <span className="w-4 text-sm font-medium">{star}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-6 bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-24 text-sm text-muted-foreground text-right">
                      {t("ratings.distribution.entry", {
                        values: { count, percentage: percentage.toFixed(0) },
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("ratings.table.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("ratings.table.subtitle")}</p>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto">
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  isRtl ? "right-3" : "left-3",
                )}
              />
              <Input
                dir={dir}
                placeholder={t("ratings.table.searchPlaceholder")}
                className={cn("w-full", isRtl ? "pr-10 pl-3 text-right" : "pl-9")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ratings.table.columns.customer")}</TableHead>
                <TableHead>{t("ratings.table.columns.rating")}</TableHead>
                <TableHead>{t("ratings.table.columns.comment")}</TableHead>
                <TableHead>{t("ratings.table.columns.orderType")}</TableHead>
                <TableHead>{t("ratings.table.columns.total")}</TableHead>
                <TableHead>{t("ratings.table.columns.date")}</TableHead>
                <TableHead className={cn(isRtl ? "text-left" : "text-right")}>
                  {t("ratings.table.columns.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRatings.map((rating) => (
                <TableRow key={rating.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {rating.customerName || t("ratings.table.guest")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {rating.customerPhone
                          ? t("ratings.table.phoneMasked", {
                              values: { lastDigits: rating.customerPhone.slice(-4) },
                            })
                          : t("ratings.table.noValueShort")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StarRating rating={rating.rating} />
                      <span className="text-xs text-muted-foreground">
                        {t("ratings.table.ratingOutOf", { values: { rating: rating.rating } })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {rating.ratingComment ? (
                        <p className="text-sm truncate">{rating.ratingComment}</p>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("ratings.table.noComment")}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rating.orderType || t("ratings.table.noValueShort")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(rating.totalCents, rating.currency)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{formatDate(rating.ratedAt)}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(rating.ratedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn(isRtl ? "text-left" : "text-right")}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchRatingDetail(rating.id)}
                      aria-label={t("ratings.actions.viewDetails")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filteredRatings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t("ratings.table.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rating Detail Modal */}
      <Dialog open={!!selectedRating} onOpenChange={() => setSelectedRating(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedRating ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("ratings.dialog.title")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Rating Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">
                          {t("ratings.dialog.summary.customerRating")}
                        </p>
                        <StarRating rating={selectedRating.rating} size="lg" />
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold">{selectedRating.rating}</p>
                        <p className="text-sm text-muted-foreground">{t("ratings.dialog.summary.outOf")}</p>
                      </div>
                    </div>
                    {selectedRating.ratingComment && (
                      <div className="border-t pt-4">
                        <p className="mb-2 text-sm font-medium">
                          {t("ratings.dialog.summary.commentTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground italic">"{selectedRating.ratingComment}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-sm font-medium">{t("ratings.dialog.customer.name")}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRating.customerName || t("ratings.table.guest")}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">{t("ratings.dialog.customer.phone")}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRating.customerPhone || t("ratings.table.noValueShort")}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">{t("ratings.dialog.customer.orderType")}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRating.orderType || t("ratings.table.noValueShort")}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">{t("ratings.dialog.customer.paymentMethod")}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRating.paymentMethod || t("ratings.table.noValueShort")}
                    </p>
                  </div>
                  {selectedRating.branchName && (
                    <div>
                      <p className="mb-1 text-sm font-medium">{t("ratings.dialog.customer.branch")}</p>
                      <p className="text-sm text-muted-foreground">{selectedRating.branchName}</p>
                    </div>
                  )}
                </div>

                {/* Order Timeline */}
                <div>
                  <p className="mb-3 text-sm font-medium">{t("ratings.dialog.timeline.title")}</p>
                  <div className="space-y-2 border-l-2 border-gray-200 pl-4">
                    <div>
                      <p className="text-xs font-medium">{t("ratings.dialog.timeline.placed")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(selectedRating.orderCreatedAt)}</p>
                    </div>
                    {selectedRating.ratingAskedAt && (
                      <div>
                        <p className="text-xs font-medium">{t("ratings.dialog.timeline.requested")}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(selectedRating.ratingAskedAt)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium">{t("ratings.dialog.timeline.submitted")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(selectedRating.ratedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {selectedRating.items && selectedRating.items.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-medium">{t("ratings.dialog.items.title")}</p>
                    <div className="space-y-2 rounded-lg border">
                      {selectedRating.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("ratings.dialog.items.quantity", { values: { qty: item.quantity } })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              {formatCurrency(item.totalCents, selectedRating.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("ratings.dialog.items.unitPrice", {
                                values: { price: formatCurrency(item.unitCents, selectedRating.currency) },
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="font-medium">{t("ratings.dialog.total")}</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(selectedRating.totalCents, selectedRating.currency)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
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
