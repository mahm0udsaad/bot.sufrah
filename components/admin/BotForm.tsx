"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Check, AlertCircle, Sparkles } from "lucide-react"
import type { Bot } from "./BotList"
import { listTwilioSenders, type AdminTwilioSender } from "@/lib/admin-bot-api"

interface BotFormProps {
  bot?: Bot
  onSubmit: (data: BotFormData) => Promise<void>
  onCancel: () => void
}

export interface BotFormData {
  name: string
  restaurantName: string
  whatsappNumber: string
  accountSid: string
  authToken: string
  subaccountSid?: string
  senderSid?: string
  wabaId?: string
  status?: "PENDING" | "ACTIVE" | "FAILED" | "VERIFYING"
  restaurantId?: string
  supportContact?: string
  paymentLink?: string
  maxMessagesPerMin?: number
  maxMessagesPerDay?: number
  isActive?: boolean
}

// معلومات البوتات الجاهزة للملء السريع
const PRESET_BOTS = {
  sufrah: {
    name: "Sufrah Bot",
    restaurantName: "Sufrah",
    whatsappNumber: "whatsapp:+966508034010",
    senderSid: "XE23c4f8b55966a1bfd101338f4c68b8cb",
    wabaId: "777730705047590",
    supportContact: "info@sufrah.sa",
    paymentLink: "https://pay.sufrah.sa",
  },
  ocean: {
    name: "Ocean Restaurant Bot",
    restaurantName: "مطعم شاورما وفلافل أوشن",
    whatsappNumber: "whatsapp:+966502045939",
    senderSid: "XE803ebc75db963fdfa0e813d6f4f001f6",
    wabaId: "777730705047590",
  },
}

export function BotForm({ bot, onSubmit, onCancel }: BotFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [senders, setSenders] = useState<AdminTwilioSender[]>([])
  const [sendersLoading, setSendersLoading] = useState(false)
  const [sendersError, setSendersError] = useState<string | null>(null)
  const [formData, setFormData] = useState<BotFormData>({
    name: bot?.name || "",
    restaurantName: bot?.restaurantName || "",
    whatsappNumber: bot?.whatsappNumber || "",
    accountSid: bot?.accountSid || "",
    authToken: "",
    subaccountSid: bot?.["subaccountSid"] || "",
    senderSid: bot?.senderSid || "",
    wabaId: bot?.wabaId || "",
    status: bot?.status || "ACTIVE",
    supportContact: bot?.supportContact || "",
    paymentLink: bot?.paymentLink || "",
    maxMessagesPerMin: bot?.maxMessagesPerMin || 60,
    maxMessagesPerDay: bot?.maxMessagesPerDay || 1000,
    isActive: bot?.isActive ?? true,
  })

  useEffect(() => {
    let cancelled = false
    const fetchSenders = async () => {
      try {
        setSendersLoading(true)
        setSendersError(null)
        const data = await listTwilioSenders('whatsapp')
        if (!cancelled) setSenders(data)
      } catch (e: any) {
        if (!cancelled) setSendersError(e?.message || 'تعذر جلب الأرقام من Twilio')
      } finally {
        if (!cancelled) setSendersLoading(false)
      }
    }
    fetchSenders()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSenderSelect = (sid: string) => {
    const s = senders.find((x) => x.sid === sid)
    if (!s) return
    const rawSenderId = s.sender_id || ""
    // Normalize whatsapp number: prefer full whatsapp:+E164
    let whatsappVal = rawSenderId
    if (whatsappVal && !whatsappVal.startsWith("whatsapp:")) {
      whatsappVal = whatsappVal.startsWith("+") ? `whatsapp:${whatsappVal}` : `whatsapp:+${whatsappVal}`
    }
    const wabaId = (s.configuration as any)?.waba_id || (s.configuration as any)?.wabaId || ""
    setFormData((prev) => ({
      ...prev,
      whatsappNumber: whatsappVal || prev.whatsappNumber,
      senderSid: s.sid || prev.senderSid,
      wabaId: wabaId || prev.wabaId,
    }))
  }

  const handleQuickFill = (preset: keyof typeof PRESET_BOTS) => {
    const data = PRESET_BOTS[preset]
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ البوت")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{bot ? "تعديل البوت" : "تسجيل بوت جديد"}</CardTitle>
        <CardDescription>
          {bot
            ? "تعديل معلومات البوت وإعداداته"
            : "إضافة رقم واتساب جديد مسجل في Twilio إلى النظام"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!bot && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                ملء سريع - بوتات جاهزة
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("sufrah")}
                  className="gap-2"
                >
                  🍽️ Sufrah
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("ocean")}
                  className="gap-2"
                >
                  🥙 Ocean
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                سيتم ملء المعلومات المعروفة، ستحتاج فقط إلى إضافة Account SID وAuth Token
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">المعلومات الأساسية</h3>

            <div className="space-y-2">
              <Label htmlFor="twilioSender">اختر رقم واتساب من Twilio</Label>
              <Select onValueChange={handleSenderSelect} disabled={sendersLoading || !!bot}>
                <SelectTrigger id="twilioSender">
                  <SelectValue placeholder={sendersLoading ? "جارِ التحميل..." : bot ? "التحديد متاح فقط عند الإضافة" : "اختر المرسل (Sender)"} />
                </SelectTrigger>
                <SelectContent>
                  {senders.map((s) => {
                    const label = `${s.sender_id || s.sid} ${s.status ? `(${s.status})` : ""}`
                    return (
                      <SelectItem key={s.sid} value={s.sid}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {sendersError && (
                <p className="text-xs text-red-500">{sendersError}</p>
              )}
              {!sendersError && !sendersLoading && senders.length === 0 && (
                <p className="text-xs text-muted-foreground">لا توجد مرسِلات متاحة على قناة واتساب في حساب Twilio</p>
              )}
              <p className="text-xs text-muted-foreground">سيتم تعبئة الحقول تلقائيًا: رقم الواتساب وSender SID وWABA ID</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  اسم البوت <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: Sufrah Bot"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantName">
                  اسم المطعم <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="restaurantName"
                  value={formData.restaurantName}
                  onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                  placeholder="مثال: Sufrah"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">
                رقم الواتساب <span className="text-red-500">*</span>
              </Label>
              <Input
                id="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="whatsapp:+966508034010"
                required
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                التنسيق: whatsapp:+966XXXXXXXXX أو +966XXXXXXXXX
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">إعدادات Twilio</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accountSid">
                  Account SID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountSid"
                  value={formData.accountSid}
                  onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
                  placeholder="AC..."
                  required
                  dir="ltr"
                  className="text-left font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">
                  Auth Token <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="authToken"
                  type="password"
                  value={formData.authToken}
                  onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                  placeholder="أدخل Auth Token"
                  required={!bot}
                  dir="ltr"
                  className="text-left font-mono"
                />
                {bot && (
                  <p className="text-xs text-muted-foreground">اتركه فارغاً إذا لم ترد تغييره</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="senderSid">Sender SID</Label>
                <Input
                  id="senderSid"
                  value={formData.senderSid}
                  onChange={(e) => setFormData({ ...formData, senderSid: e.target.value })}
                  placeholder="XE..."
                  dir="ltr"
                  className="text-left font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wabaId">WABA ID</Label>
                <Input
                  id="wabaId"
                  value={formData.wabaId}
                  onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                  placeholder="777730705047590"
                  dir="ltr"
                  className="text-left font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">الإعدادات</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                    <SelectItem value="ACTIVE">نشط</SelectItem>
                    <SelectItem value="VERIFYING">قيد التحقق</SelectItem>
                    <SelectItem value="FAILED">فاشل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive" className="flex items-center gap-2">
                  تفعيل البوت
                </Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isActive ? "مفعّل" : "معطّل"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxMessagesPerMin">الحد الأقصى/دقيقة</Label>
                <Input
                  id="maxMessagesPerMin"
                  type="number"
                  value={formData.maxMessagesPerMin}
                  onChange={(e) =>
                    setFormData({ ...formData, maxMessagesPerMin: parseInt(e.target.value) || 60 })
                  }
                  min="1"
                  max="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMessagesPerDay">الحد الأقصى/يوم</Label>
                <Input
                  id="maxMessagesPerDay"
                  type="number"
                  value={formData.maxMessagesPerDay}
                  onChange={(e) =>
                    setFormData({ ...formData, maxMessagesPerDay: parseInt(e.target.value) || 1000 })
                  }
                  min="1"
                  max="100000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">معلومات إضافية</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supportContact">جهة الاتصال للدعم</Label>
                <Input
                  id="supportContact"
                  value={formData.supportContact}
                  onChange={(e) => setFormData({ ...formData, supportContact: e.target.value })}
                  placeholder="info@sufrah.sa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentLink">رابط الدفع</Label>
                <Input
                  id="paymentLink"
                  value={formData.paymentLink}
                  onChange={(e) => setFormData({ ...formData, paymentLink: e.target.value })}
                  placeholder="https://pay.sufrah.sa"
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              <X className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="h-4 w-4 ml-2 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-2" />
                  {bot ? "تحديث" : "تسجيل"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
