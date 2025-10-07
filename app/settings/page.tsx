"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Store, MessageSquare, Bell, Shield, Users, Loader2 } from "lucide-react"
import Link from "next/link"

type RestaurantBotState = {
  id: string
  restaurantId: string
  subaccountSid: string
  authToken: string
  whatsappNumber: string | null
  senderSid: string | null
  verificationSid: string | null
  status: string
  verifiedAt: string | null
  errorMessage: string | null
  createdAt: string
}

export default function SettingsPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [bot, setBot] = useState<RestaurantBotState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadInitialState = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const profileRes = await fetch("/api/restaurant/profile", { cache: "no-store" })

        if (!profileRes.ok) {
          throw new Error("Failed to load restaurant profile")
        }

        const profile = await profileRes.json()
        if (cancelled) {
          return
        }

        setRestaurantId(profile.id)

        const botRes = await fetch(`/api/onboarding/whatsapp?restaurantId=${profile.id}`, { cache: "no-store" })

        if (!botRes.ok) {
          throw new Error("Failed to load WhatsApp bot status")
        }

        const botPayload = await botRes.json()

        if (!cancelled) {
          setBot(botPayload.bot ?? null)
        }
      } catch (err) {
        console.error("Failed to load WhatsApp onboarding state", err)

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load WhatsApp onboarding state")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialState()

    return () => {
      cancelled = true
    }
  }, [])

  const renderStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
          Checking…
        </Badge>
      )
    }

    if (!bot) {
      return (
        <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700">
          Not Connected
        </Badge>
      )
    }

    const status = typeof bot.status === "string" ? bot.status.toUpperCase() : "PENDING"

    switch (status) {
      case "ACTIVE":
        return <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Active</Badge>
      case "VERIFYING":
        return <Badge variant="outline" className="bg-sky-50 border-sky-200 text-sky-700">Verifying</Badge>
      case "FAILED":
        return <Badge variant="outline" className="bg-red-50 border-red-200 text-red-600">Failed</Badge>
      default:
        return <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-600">Pending</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your restaurant and WhatsApp bot configuration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Restaurant Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Restaurant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restaurant-name">Restaurant Name</Label>
                  <Input id="restaurant-name" defaultValue="Sufrah" />
                </div>
                <div>
                  <Label htmlFor="cuisine-type">Cuisine Type</Label>
                  <Select defaultValue="middle-eastern">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="middle-eastern">Middle Eastern</SelectItem>
                      <SelectItem value="arabic">Arabic</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  defaultValue="Authentic Middle Eastern cuisine with fresh ingredients and traditional recipes."
                  className="min-h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+971 4 123 4567" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="info@sufrah.ae" />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue="Dubai Marina, Block 5, Shop 12, Dubai, UAE" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opening-hours">Opening Hours</Label>
                  <Input id="opening-hours" defaultValue="10:00 AM - 11:00 PM" />
                </div>
                <div>
                  <Label htmlFor="delivery-time">Avg. Delivery Time</Label>
                  <Input id="delivery-time" defaultValue="30-45 minutes" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">WhatsApp Bot Status</p>
                    <p className="text-xs text-muted-foreground">Provisioned through Twilio subaccounts</p>
                  </div>
                  {renderStatusBadge()}
                </div>

                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                {isLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : bot ? (
                  <div className="space-y-3 rounded-lg border border-muted bg-muted/40 px-4 py-3">
                    <div className="grid gap-1 text-sm text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground">WhatsApp number:</span> {bot.whatsappNumber || "—"}
                      </span>
                      <span>
                        <span className="font-medium text-foreground">Sender SID:</span> {bot.senderSid || "—"}
                      </span>
                      <span>
                        <span className="font-medium text-foreground">Subaccount SID:</span> {bot.subaccountSid}
                      </span>
                      {bot.verifiedAt ? (
                        <span>
                          <span className="font-medium text-foreground">Verified:</span> {new Date(bot.verifiedAt).toLocaleString()}
                        </span>
                      ) : null}
                      {bot.errorMessage ? (
                        <span className="text-red-600">Last error: {bot.errorMessage}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Link href="/onboarding" className="inline-flex items-center gap-2 text-primary hover:underline">
                        Update WhatsApp bot setup
                      </Link>
                      <span>Re-run the onboarding flow to register a new number or complete OTP verification.</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>No WhatsApp bot is configured yet.</p>
                    <Link href="/onboarding" className="inline-flex items-center gap-2 text-primary hover:underline">
                      Go to WhatsApp onboarding
                    </Link>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Auto-Reply Settings</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Welcome Message</p>
                      <p className="text-xs text-muted-foreground">Send greeting to new customers</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Order Confirmations</p>
                      <p className="text-xs text-muted-foreground">Auto-confirm orders</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Delivery Updates</p>
                      <p className="text-xs text-muted-foreground">Send status updates</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">New Orders</p>
                    <p className="text-xs text-muted-foreground">Get notified of new orders</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Message Quota Alerts</p>
                    <p className="text-xs text-muted-foreground">Alert when reaching 80% usage</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Template Status Updates</p>
                    <p className="text-xs text-muted-foreground">Template approval notifications</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Daily Reports</p>
                    <p className="text-xs text-muted-foreground">Daily summary emails</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">24-Hour Window Enforcement</p>
                    <p className="text-xs text-muted-foreground">Prevent messages outside window</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Anti-Ban Protection</p>
                    <p className="text-xs text-muted-foreground">Rate limiting and compliance checks</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Message Logging</p>
                    <p className="text-xs text-muted-foreground">Keep conversation history</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select defaultValue="90">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Team Members</h3>
                  <p className="text-sm text-muted-foreground">Manage who can access the dashboard</p>
                </div>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">AH</span>
                    </div>
                    <div>
                      <p className="font-medium">Ahmed Hassan</p>
                      <p className="text-sm text-muted-foreground">ahmed@sufrah.ae</p>
                    </div>
                  </div>
                  <Badge>Owner</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">SA</span>
                    </div>
                    <div>
                      <p className="font-medium">Sarah Ali</p>
                      <p className="text-sm text-muted-foreground">sarah@sufrah.ae</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Manager</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
