"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertTriangle, TrendingUp, Activity, Calendar, RefreshCw, Clock, Award, Users } from "lucide-react"
import { useRestaurantUsageDetails } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"

export default function UsagePage() {
  const { t, dir } = useI18n()
  const { data: usage, loading, error, refetch } = useRestaurantUsageDetails('en')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Usage</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Extract quota data
  const currentUsage = usage?.quota?.used || 0
  const monthlyLimit = usage?.quota?.limit || 1000
  const effectiveLimit = usage?.quota?.effectiveLimit || monthlyLimit
  const monthlyRemaining = usage?.quota?.remaining || 0
  const adjustedBy = usage?.quota?.adjustedBy || 0
  const usagePercentage = usage?.quota?.usagePercent || 0
  const isNearingQuota = usage?.quota?.isNearingQuota || false
  const isUnlimited = monthlyLimit === -1
  
  // Other data
  const activeSessionsCount = usage?.activeSessionsCount || 0
  const adjustments = usage?.adjustments || []
  const dailyBreakdown = usage?.dailyBreakdown || []
  const recentSessions = usage?.recentSessions || []

  return (
    <AuthGuard>
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-bold text-foreground">Usage & Quota</h1>
              <p className="text-muted-foreground">Monitor your conversation usage and allowance</p>
          </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
          </Button>
        </div>

        {/* Current Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Conversations This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{currentUsage.toLocaleString()}</span>
                    {!isUnlimited && (
                      <span className="text-muted-foreground">
                        of {effectiveLimit.toLocaleString()} conversations
                      </span>
                    )}
                </div>
                  
                  {!isUnlimited && (
                    <>
                      <Progress 
                        value={usagePercentage} 
                        className={`h-3 ${isNearingQuota ? 'bg-amber-100' : ''}`}
                      />
                <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {Math.round(usagePercentage)}% used
                        </span>
                  <span className="text-muted-foreground">
                          {monthlyRemaining.toLocaleString()} remaining
                  </span>
                </div>
                    </>
                  )}

                  {isNearingQuota && !isUnlimited && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-800">
                        You're approaching your monthly limit ({Math.round(usagePercentage)}% used). 
                        Consider contacting support for additional allowance.
                      </span>
                    </div>
                  )}

                  {isUnlimited && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800">
                        Unlimited plan - no monthly conversation limits.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Allowance Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Plan Limit</span>
                      <span className="font-medium">
                        {isUnlimited ? 'Unlimited' : monthlyLimit.toLocaleString()}
                      </span>
                </div>
                    
                    {adjustedBy > 0 && (
                      <>
                  <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Top-ups</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            +{adjustedBy.toLocaleString()}
                          </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Effective Limit</span>
                          <span className="font-medium text-green-600">
                            {effectiveLimit.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Active Sessions</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{activeSessionsCount}</span>
                      </div>
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Top-ups History */}
          {adjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  Top-ups This Month
            </CardTitle>
                <CardDescription>Additional allowances granted</CardDescription>
          </CardHeader>
          <CardContent>
                <div className="space-y-2">
                  {adjustments.map((adjustment) => (
                    <div key={adjustment.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-green-900">+{adjustment.amount.toLocaleString()} conversations</p>
                        <p className="text-sm text-green-700">{adjustment.reason}</p>
                      </div>
                      <span className="text-xs text-green-600">
                        {new Date(adjustment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
          )}

          {/* Daily Breakdown */}
          {dailyBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Daily Breakdown (Current Month)
                </CardTitle>
                <CardDescription>Conversations started per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Conversations</TableHead>
                        <TableHead className="text-right">Messages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyBreakdown.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">
                            {new Date(day.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.conversationsStarted > 0 ? (
                              <Badge variant="secondary">{day.conversationsStarted}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {day.messages > 0 ? day.messages : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Recent Conversation Sessions
                </CardTitle>
                <CardDescription>Last 20 active 24-hour sessions</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Last Message</TableHead>
                        <TableHead className="text-right">Messages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-mono text-sm">
                            {session.customerPhone}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(session.startedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(session.lastMessageAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{session.messageCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Status */}
          {usage?.firstActivity && usage?.lastActivity && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Your restaurant's conversation history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">First Activity</p>
                    <p className="font-medium">
                      {new Date(usage.firstActivity).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                    <p className="font-medium">
                      {new Date(usage.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                </CardContent>
              </Card>
          )}

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    About Usage Tracking
                  </h3>
                  <p className="text-sm text-blue-800">
                    Usage is tracked based on unique 24-hour conversation sessions. A conversation is counted 
                    when a customer interacts with your bot within a 24-hour window. Multiple messages within 
                    the same 24-hour period count as a single conversation.
                  </p>
                  {adjustedBy > 0 && (
                    <p className="text-sm text-blue-800 mt-2">
                      Your current allowance includes <strong>+{adjustedBy.toLocaleString()}</strong> conversations 
                      from top-ups this month.
                    </p>
                  )}
                </div>
          </div>
            </CardContent>
          </Card>
      </div>
    </DashboardLayout>
    </AuthGuard>
  )
}
