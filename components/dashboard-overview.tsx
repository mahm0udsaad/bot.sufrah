"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MessageSquare, Package, Clock, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/lib/auth"

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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [usageData, setUsageData] = useState<UsageData[]>([])
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data for demonstration - in production this would come from API
  const messagesUsed = 3214
  const messagesLimit = 5000
  const usagePercentage = (messagesUsed / messagesLimit) * 100
  const daysUntilReset = 12

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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your WhatsApp bot performance and manage your messaging quota</p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_conversations || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todays_orders || 0}</div>
            <p className="text-xs text-muted-foreground">New orders today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.messages_today || 0}</div>
            <p className="text-xs text-muted-foreground">Sent and received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_templates || 0}</div>
            <p className="text-xs text-muted-foreground">Approved templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage and Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Usage Overview
              <Button variant="outline" size="sm">
                Upgrade Plan
              </Button>
            </CardTitle>
            <CardDescription>
              {messagesUsed.toLocaleString()} / {messagesLimit.toLocaleString()} messages used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Current cycle usage</span>
                <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Resets in {daysUntilReset} days</span>
                <span>{messagesLimit - messagesUsed} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              24h Windows & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active conversations</span>
              <Badge variant="secondary">{stats?.active_conversations || 0} open</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Messages today</span>
              <Badge variant="outline">{stats?.messages_today || 0} sent</Badge>
            </div>
            {usagePercentage > 80 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Heads up!</p>
                  <p className="text-amber-700">You've used {usagePercentage.toFixed(1)}% of your message quota</p>
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
            <CardTitle>Daily Activity (7 days)</CardTitle>
            <CardDescription>Messages and orders over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={
                  usageData.length > 0
                    ? usageData
                    : [
                        { day: "Mon", messages: 420, orders: 12 },
                        { day: "Tue", messages: 380, orders: 8 },
                        { day: "Wed", messages: 520, orders: 15 },
                        { day: "Thu", messages: 290, orders: 6 },
                        { day: "Fri", messages: 650, orders: 18 },
                        { day: "Sat", messages: 480, orders: 14 },
                        { day: "Sun", messages: 380, orders: 10 },
                      ]
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} name="Messages" />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Usage</CardTitle>
            <CardDescription>Most used message templates this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  templateUsage.length > 0
                    ? templateUsage
                    : [
                        { name: "Welcome Message", usage: 42, category: "greeting" },
                        { name: "Order Confirmation", usage: 37, category: "order" },
                        { name: "Delivery Update", usage: 21, category: "delivery" },
                        { name: "Menu Request", usage: 15, category: "menu" },
                        { name: "Payment Link", usage: 8, category: "payment" },
                      ]
                }
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
            Orders Snapshot
          </CardTitle>
          <CardDescription>Current order status overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-blue-800">Pending</p>
                <p className="text-2xl font-bold text-blue-900">8</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <p className="text-sm font-medium text-amber-800">Preparing</p>
                <p className="text-2xl font-bold text-amber-900">12</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm font-medium text-purple-800">Ready</p>
                <p className="text-2xl font-bold text-purple-900">5</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="text-sm font-medium text-green-800">Delivered</p>
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
