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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format((amountCents || 0) / 100)
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
  const [ratings, setRatings] = useState<Rating[]>([])
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [ratingFilter, setRatingFilter] = useState("ALL")
  const [selectedRating, setSelectedRating] = useState<RatingWithItems | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

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
      toast.error("Unable to load ratings")
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
        toast.error("Unable to load rating details")
      }
    } catch (error) {
      console.error("Failed to load rating detail", error)
      toast.error("Unable to load rating details")
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
          <h1 className="text-2xl font-bold text-foreground">Customer Ratings</h1>
          <p className="text-muted-foreground">View and analyze customer feedback</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
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
                <p className="text-sm font-medium text-muted-foreground">Total Ratings</p>
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
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
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
                <p className="text-sm font-medium text-muted-foreground">Positive Ratings</p>
                <p className="text-2xl font-bold">{positiveRatingsPercentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">4-5 stars</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Ratings</p>
                <p className="text-2xl font-bold">{negativeRatingsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">1-3 stars</p>
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
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star as keyof typeof stats.distribution] || 0
                const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-24">
                      <span className="text-sm font-medium w-4">{star}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {count} ({percentage.toFixed(0)}%)
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
            <CardTitle>Recent Ratings</CardTitle>
            <p className="text-sm text-muted-foreground">Customer feedback and reviews</p>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or comment"
                className="pl-9"
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
                <TableHead>Customer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRatings.map((rating) => (
                <TableRow key={rating.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{rating.customerName || "Guest"}</span>
                      <span className="text-xs text-muted-foreground">
                        {rating.customerPhone ? `***${rating.customerPhone.slice(-4)}` : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StarRating rating={rating.rating} />
                      <span className="text-xs text-muted-foreground">{rating.rating}/5</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {rating.ratingComment ? (
                        <p className="text-sm truncate">{rating.ratingComment}</p>
                      ) : (
                        <span className="text-sm text-muted-foreground">No comment</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rating.orderType || "—"}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(rating.totalCents, rating.currency)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{new Date(rating.ratedAt).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rating.ratedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchRatingDetail(rating.id)}
                      aria-label="View rating details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filteredRatings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No ratings match the current filters.
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
                <DialogTitle>Rating Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Rating Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Customer Rating</p>
                        <StarRating rating={selectedRating.rating} size="lg" />
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold">{selectedRating.rating}</p>
                        <p className="text-sm text-muted-foreground">out of 5</p>
                      </div>
                    </div>
                    {selectedRating.ratingComment && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">Customer Comment</p>
                        <p className="text-sm text-muted-foreground italic">"{selectedRating.ratingComment}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Customer Name</p>
                    <p className="text-sm text-muted-foreground">{selectedRating.customerName || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{selectedRating.customerPhone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Order Type</p>
                    <p className="text-sm text-muted-foreground">{selectedRating.orderType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Payment Method</p>
                    <p className="text-sm text-muted-foreground">{selectedRating.paymentMethod || "—"}</p>
                  </div>
                  {selectedRating.branchName && (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-1">Branch</p>
                        <p className="text-sm text-muted-foreground">{selectedRating.branchName}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Order Timeline */}
                <div>
                  <p className="text-sm font-medium mb-3">Timeline</p>
                  <div className="space-y-2 border-l-2 border-gray-200 pl-4">
                    <div>
                      <p className="text-xs font-medium">Order Placed</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedRating.orderCreatedAt).toLocaleString()}
                      </p>
                    </div>
                    {selectedRating.ratingAskedAt && (
                      <div>
                        <p className="text-xs font-medium">Rating Requested</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedRating.ratingAskedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium">Rating Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedRating.ratedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {selectedRating.items && selectedRating.items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3">Order Items</p>
                    <div className="space-y-2 rounded-lg border">
                      {selectedRating.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              {formatCurrency(item.totalCents, selectedRating.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.unitCents, selectedRating.currency)} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="font-medium">Total Amount</span>
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

