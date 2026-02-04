"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  Shield,
  Lock,
  DollarSign,
  MessageSquare,
  Building2,
  Eye,
  RefreshCw,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface TwilioCategory {
  count: number
  price: number
  description: string
}

interface RestaurantBilling {
  restaurantId: string
  name: string
  inbound: number
  outbound: number
  campaignSent: number
  totalMessages: number
  allocatedCost: number
  sharePercent: number
}

interface BillingData {
  month: string
  source: string
  twilio: {
    totalCost: number
    totalMessages: number
    categories: Record<string, TwilioCategory>
  }
  restaurants: RestaurantBilling[]
  totals: {
    restaurants: number
    dbMessages: number
    twilioMessages: number
    cost: number
  }
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long" })
    options.push({ value, label })
  }
  return options
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatCategoryName(category: string): string {
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AdminBillingPage() {
  const { user } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [verifying, setVerifying] = useState(false)

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(false)

  const monthOptions = generateMonthOptions()

  const fetchBilling = useCallback(async (month: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/billing?month=${month}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
      } else {
        toast.error(json.error || "Failed to load billing data")
      }
    } catch {
      toast.error("Failed to load billing data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchBilling(selectedMonth)
    }
  }, [isAuthenticated, selectedMonth, fetchBilling])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    try {
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.success) {
        setIsAuthenticated(true)
      } else {
        toast.error(json.error || "Incorrect password")
        setPassword("")
      }
    } catch {
      toast.error("Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  const isAdmin = true

  if (!isAdmin) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access this page</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (!isAuthenticated) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Billing Dashboard</CardTitle>
                <CardDescription>
                  Enter admin password to view billing data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      disabled={verifying}
                      autoFocus
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={verifying || !password}>
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                WhatsApp Billing
              </h1>
              <p className="text-muted-foreground">
                Actual costs from Twilio Usage Records API
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchBilling(selectedMonth)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {loading && !data ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Twilio Cost
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(data.twilio.totalCost)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Messages (DB)
                        </p>
                        <p className="text-2xl font-bold">
                          {data.totals.dbMessages.toLocaleString()}
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Active Restaurants
                        </p>
                        <p className="text-2xl font-bold">{data.totals.restaurants}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Twilio Billing Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Twilio WhatsApp Billing Breakdown
                    <Badge variant="secondary">Source: Twilio API</Badge>
                  </CardTitle>
                  <CardDescription>
                    Actual charges from Twilio for {data.month}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(data.twilio.categories).length === 0 ? (
                    <p className="text-muted-foreground text-sm">No WhatsApp charges this month</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Cost (USD)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(data.twilio.categories)
                            .sort(([, a], [, b]) => b.price - a.price)
                            .map(([cat, info]) => (
                              <TableRow key={cat}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">
                                      {info.description}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {cat}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {info.count.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(info.price)}
                                </TableCell>
                              </TableRow>
                            ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">—</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(data.twilio.totalCost)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Per-Restaurant Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Per-Restaurant Cost Allocation
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>How costs are allocated</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm text-muted-foreground">
                          <p>
                            The total Twilio cost ({formatCurrency(data.twilio.totalCost)}) is
                            allocated proportionally based on each restaurant's share of total
                            messages.
                          </p>
                          <p>
                            Message counts come from the database (conversation messages +
                            campaign sends). A restaurant with 30% of total messages gets 30%
                            of the total Twilio bill.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                  <CardDescription>
                    {data.month} — {data.restaurants.length} restaurant
                    {data.restaurants.length !== 1 ? "s" : ""} with activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {data.restaurants.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No messaging activity for this month</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Restaurant</TableHead>
                            <TableHead className="text-right">Inbound</TableHead>
                            <TableHead className="text-right">Outbound</TableHead>
                            <TableHead className="text-right">Campaigns</TableHead>
                            <TableHead className="text-right">Total Msgs</TableHead>
                            <TableHead className="text-right">Share</TableHead>
                            <TableHead className="text-right">Cost (USD)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.restaurants.map((r) => (
                            <TableRow key={r.restaurantId}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{r.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {r.restaurantId.slice(0, 8)}...
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {r.inbound.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {r.outbound.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {r.campaignSent.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {r.totalMessages.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {r.sharePercent.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(r.allocatedCost)}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Grand Total Row */}
                          <TableRow className="font-bold bg-muted/50 border-t-2">
                            <TableCell>Grand Total</TableCell>
                            <TableCell className="text-right">
                              {data.restaurants
                                .reduce((s, r) => s + r.inbound, 0)
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {data.restaurants
                                .reduce((s, r) => s + r.outbound, 0)
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {data.restaurants
                                .reduce((s, r) => s + r.campaignSent, 0)
                                .toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {data.totals.dbMessages.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">100%</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(data.twilio.totalCost)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
