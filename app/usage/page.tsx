"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Crown, Zap, Shield, TrendingUp, Calendar, AlertTriangle } from "lucide-react"

const usageData = [
  { date: "Jan 1", messages: 120 },
  { date: "Jan 2", messages: 180 },
  { date: "Jan 3", messages: 240 },
  { date: "Jan 4", messages: 190 },
  { date: "Jan 5", messages: 280 },
  { date: "Jan 6", messages: 320 },
  { date: "Jan 7", messages: 290 },
]

const plans = [
  {
    name: "Starter",
    price: "SAR 299",
    period: "/month",
    messages: "5,000",
    current: false,
    features: ["5K WhatsApp messages", "Basic templates", "Order tracking", "Email support"],
  },
  {
    name: "Professional",
    price: "SAR 599",
    period: "/month",
    messages: "10,000",
    current: true,
    features: ["10K WhatsApp messages", "Advanced templates", "Analytics", "Priority support", "Custom branding"],
  },
  {
    name: "Enterprise",
    price: "SAR 999",
    period: "/month",
    messages: "25,000",
    current: false,
    features: [
      "25K WhatsApp messages",
      "Unlimited templates",
      "Advanced analytics",
      "24/7 support",
      "API access",
      "Multi-location",
    ],
  },
]

export default function UsagePage() {
  const currentUsage = 6420
  const monthlyLimit = 10000
  const usagePercentage = (currentUsage / monthlyLimit) * 100

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usage & Plan</h1>
            <p className="text-muted-foreground">Monitor your message usage and manage your subscription</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>

        {/* Current Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Message Usage This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{currentUsage.toLocaleString()}</span>
                  <span className="text-muted-foreground">of {monthlyLimit.toLocaleString()} messages</span>
                </div>
                <Progress value={usagePercentage} className="h-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{Math.round(usagePercentage)}% used</span>
                  <span className="text-muted-foreground">
                    {(monthlyLimit - currentUsage).toLocaleString()} remaining
                  </span>
                </div>
                {usagePercentage > 80 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      You're approaching your monthly limit. Consider upgrading your plan.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">Professional</h3>
                  <p className="text-muted-foreground">AED 599/month</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Messages</span>
                    <span className="font-medium">10,000/month</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Next billing</span>
                    <span className="font-medium">Jan 15, 2024</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Usage Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="messages" stroke="#7A3CED" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        <div>
          <h2 className="text-xl font-bold mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.current ? "border-primary shadow-lg" : ""}`}>
                {plan.current && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">Current Plan</Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.messages} messages/month</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.current ? "outline" : "default"} disabled={plan.current}>
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
