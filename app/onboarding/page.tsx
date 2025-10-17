"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Zap } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { WhatsAppSetupForm } from "@/components/onboarding/WhatsAppSetupForm"
import { OTPVerification } from "@/components/onboarding/OTPVerification"

interface RestaurantProfile {
  id: string
  name: string
  phone?: string | null
  address?: string | null
  description?: string | null
  whatsappNumber?: string | null
  externalMerchantId?: string | null
}

interface RestaurantBot {
  id: string
  restaurantId: string
  subaccountSid: string
  authToken?: string
  whatsappNumber?: string | null
  senderSid?: string | null
  verificationSid?: string | null
  wabaId?: string | null
  status: string
  createdAt: string
  verifiedAt?: string | null
  errorMessage?: string | null
}

type BotStatus = "ACTIVE" | "PENDING" | "VERIFYING" | "FAILED"

const statusMeta: Record<BotStatus, { badge: string; label: string }> = {
  ACTIVE: { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Active" },
  VERIFYING: { badge: "bg-sky-50 text-sky-700 border border-sky-200", label: "Verifying" },
  PENDING: { badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "Pending" },
  FAILED: { badge: "bg-red-50 text-red-600 border border-red-200", label: "Failed" },
}

function resolveStatus(status?: string | null): BotStatus {
  const normalized = (status || "PENDING").toUpperCase()
  if (normalized === "ACTIVE" || normalized === "FAILED" || normalized === "VERIFYING") {
    return normalized as BotStatus
  }
  return "PENDING"
}

export default function OnboardingPage() {
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null)
  const [bot, setBot] = useState<RestaurantBot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isShared, setIsShared] = useState<boolean>(false)
  const [availableBots, setAvailableBots] = useState<any[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>("")
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const restaurantRes = await fetch("/api/restaurant/profile", { cache: "no-store" })

        if (!restaurantRes.ok) {
          throw new Error("Unable to load restaurant profile")
        }

        const restaurantPayload: RestaurantProfile = await restaurantRes.json()
        if (cancelled) {
          return
        }

        setRestaurant(restaurantPayload)

        if (restaurantPayload?.id && !cancelled) {
          const botResponse = await fetch(`/api/onboarding/whatsapp?restaurantId=${restaurantPayload.id}`, {
            cache: "no-store",
          })

          if (!cancelled && botResponse.ok) {
            const payload = await botResponse.json()
            if (payload.success) {
              setBot(payload.bot ?? null)
              setIsShared(Boolean(payload.isShared))
            }
          }

          // Load available shared senders for dropdown
          try {
            const sendersRes = await fetch(`/api/onboarding/shared-senders`, { cache: "no-store" })
            if (sendersRes.ok) {
              const list = await sendersRes.json()
              setAvailableBots(Array.isArray(list) ? list : [])
            }
          } catch {
            // ignore; dropdown will just be empty
          }
        }
      } catch (err) {
        console.error("Onboarding load failed", err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load onboarding data")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    // Poll while verifying or creating
    const poll = setInterval(async () => {
      if (!cancelled && restaurant?.id) {
        try {
          const botResponse = await fetch(`/api/onboarding/whatsapp?restaurantId=${restaurant.id}`, { 
            cache: "no-store" 
          })
          if (botResponse.ok) {
            const payload = await botResponse.json()
            if (payload.success && payload.bot) {
              setBot(payload.bot)
              setIsShared(Boolean(payload.isShared))

              // If status changed from CREATING to VERIFYING with verificationSid, stop polling
              if (payload.bot.status === "VERIFYING" && payload.bot.verificationSid) {
                clearInterval(poll)
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }, 3000) // Poll every 3 seconds for faster response

    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [restaurant?.id])

  const resolvedStatus = resolveStatus(bot?.status)
  // Display with leading plus for readability
  const displayNumber = bot?.whatsappNumber ? (bot.whatsappNumber.startsWith("+") ? bot.whatsappNumber : `+${bot.whatsappNumber}`) : "Not connected"

  const content = isLoading ? (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 w-full lg:col-span-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">WhatsApp Bot Onboarding</h1>
        <p className="text-muted-foreground">Connect your WhatsApp Business number to start receiving orders.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Restaurant overview</CardTitle>
              <p className="text-sm text-muted-foreground">Synced automatically from Sufrah</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Brand name</p>
                <p className="text-sm font-medium text-foreground">{restaurant?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground">{restaurant?.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Address</p>
                <p className="text-sm font-medium text-foreground">{restaurant?.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">External Merchant ID</p>
                <p className="text-sm font-medium text-foreground">{restaurant?.externalMerchantId ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">WhatsApp bot status</CardTitle>
              <p className="text-sm text-muted-foreground">Secure connection via Twilio</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Connection</span>
              <Badge className={statusMeta[resolvedStatus].badge}>{statusMeta[resolvedStatus].label}</Badge>
            </div>

            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex flex-col gap-1">
                <span>
                  <span className="font-semibold text-foreground">WhatsApp number:</span> {displayNumber}
                </span>
                <span>
                  <span className="font-semibold text-foreground">WABA ID:</span> {bot?.wabaId || "—"}
                </span>
                <span>
                  <span className="font-semibold text-foreground">Sender SID:</span> {bot?.senderSid || "—"}
                </span>
                {bot?.verificationSid ? (
                  <span>
                    <span className="font-semibold text-foreground">Verification SID:</span> {bot.verificationSid}
                  </span>
                ) : null}
                {bot?.verifiedAt ? (
                  <span>
                    <span className="font-semibold text-foreground">Connected:</span>{" "}
                    {new Date(bot.verifiedAt).toLocaleString()}
                  </span>
                ) : null}
                {bot?.errorMessage ? (
                  <span className="text-red-600">Last error: {bot.errorMessage}</span>
                ) : null}
              </div>
            </div>

            <Separator />

            {restaurant?.id ? (
              // Show OTP input when we have verification SID
              resolvedStatus === "VERIFYING" && bot?.senderSid && bot?.verificationSid ? (
                <OTPVerification
                  senderSid={bot.senderSid}
                  onVerified={(nextBot) => {
                    setBot(nextBot as RestaurantBot)
                    setError(null)
                  }}
                />
              ) : // VERIFYING without verificationSid means still waiting for SMS
              resolvedStatus === "VERIFYING" && !bot?.verificationSid ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                    ⏳ Preparing SMS verification...
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sender created successfully. Waiting for verification to be ready. This should complete within 45 seconds.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("Cancel the current verification and start over?")) {
                        try {
                          await fetch(`/api/onboarding/whatsapp/cancel`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ restaurantId: restaurant.id }),
                          })
                          window.location.reload()
                        } catch (err) {
                          console.error(err)
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
                  >
                    Cancel and Start Over
                  </button>
                </div>
              ) : // PENDING with senderSid means sender is ready, proceed to verification
              resolvedStatus === "PENDING" && bot?.senderSid ? (
                <OTPVerification
                  senderSid={bot.senderSid}
                  onVerified={(nextBot) => {
                    setBot(nextBot as RestaurantBot)
                    setError(null)
                  }}
                />
              ) : resolvedStatus === "ACTIVE" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    ✓ Your WhatsApp bot is live and ready to receive orders!
                  </div>
                  {isShared ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null)
                          const response = await fetch("/api/onboarding/whatsapp/delink", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ restaurantId: restaurant.id }),
                          })
                          const data = await response.json()
                          if (!response.ok || !data.success) {
                            throw new Error(data.error || "Failed to delink shared number")
                          }
                          setBot(data.bot as RestaurantBot)
                          setIsShared(false)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Delink failed")
                        }
                      }}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
                    >
                      Delink Shared Number
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const testMsg = `Hello! This is a test message from Sufrah Dashboard. Your WhatsApp bot (${bot?.whatsappNumber}) is working correctly.`
                        alert(`Test feature coming soon!\n\n${testMsg}`)
                      } catch (err) {
                        console.error(err)
                      }
                    }}
                    className="w-full rounded-lg border border-primary bg-background px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    Test WhatsApp Connection
                  </button>
                  <p className="text-xs text-muted-foreground">
                    To connect a different number, please contact support or use your Twilio console.
                  </p>
                </div>
              ) : resolvedStatus === "FAILED" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {bot?.errorMessage || "Connection failed. Please try again."}
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="font-medium text-emerald-900">✨ Quick Start (No waiting)</p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Use our shared WhatsApp Business number <strong>+966508034010</strong>. Switch instantly even if
                      verification failed.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null)
                          const response = await fetch("/api/onboarding/whatsapp/use-existing", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ restaurantId: restaurant.id }),
                          })
                          const data = await response.json()
                          if (!response.ok || !data.success) {
                            throw new Error(data.error || "Failed to activate")
                          }
                          setBot(data.bot as RestaurantBot)
                          window.location.reload()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Activation failed")
                        }
                      }}
                      className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      ✓ Use Shared Number (Instant Setup)
                    </button>
                  </div>
                  <WhatsAppSetupForm
                    restaurantId={restaurant.id}
                    initialPhone={bot?.whatsappNumber || restaurant.whatsappNumber}
                    onStarted={(nextBot) => {
                      setBot(nextBot as RestaurantBot)
                      setError(null)
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="font-medium text-emerald-900">✨ ربط مرسل واتساب مشترك</p>
                    <div className="mt-3 grid gap-2">
                      <label className="text-xs text-muted-foreground">اختر مرسل واتساب</label>
                      <Select value={selectedBotId} onValueChange={setSelectedBotId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBots.length === 0 ? (
                            <SelectItem value="__none" disabled>لا توجد أرقام متاحة الآن</SelectItem>
                          ) : (
                            availableBots.map((b: any) => (
                              <SelectItem key={b.id} value={b.id} disabled={Boolean(b.restaurantId)}>
                                {(b.restaurantName || b.name) + " — " + (b.whatsappNumber || "")}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={async () => {
                          if (!selectedBotId || selectedBotId === "__none") return
                          try {
                            setError(null)
                            setLinking(true)
                            const res = await fetch("/api/onboarding/link-sender", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ botId: selectedBotId, restaurantId: restaurant.id }),
                            })
                            setLinking(false)
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}))
                              alert(
                                err?.error ||
                                  "فشل الربط. إذا كان الرقم مربوطاً بمطعم آخر، يرجى فكه أولاً ثم إعادة المحاولة."
                              )
                              return
                            }
                            const data = await res.json()
                            setBot(data.bot as RestaurantBot)
                            setIsShared(true)
                          } catch (e) {
                            setLinking(false)
                            setError("حدث خطأ أثناء الربط")
                          }
                        }}
                        disabled={!selectedBotId || selectedBotId === "__none" || linking}
                        className="mt-2"
                      >
                        {linking ? "جاري الربط…" : "ربط"}
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">أو</span>
                    </div>
                  </div>

                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-sm">استخدم رقمك الخاص</summary>
                    <div className="mt-3 space-y-3 rounded border border-border bg-muted/30 p-3">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-700">
                        ⚠️ <strong>ملاحظة:</strong> يجب اعتماد الرقم عبر Twilio/Meta وقد تستغرق العملية من 1-2 أسبوع.
                      </div>
                      <WhatsAppSetupForm
                        restaurantId={restaurant.id}
                        initialPhone={bot?.whatsappNumber || restaurant.whatsappNumber}
                        onStarted={(nextBot) => {
                          setBot(nextBot as RestaurantBot)
                          setError(null)
                        }}
                      />
                    </div>
                  </details>
                </div>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <AuthGuard>
      <DashboardLayout>{content}</DashboardLayout>
    </AuthGuard>
  )
}