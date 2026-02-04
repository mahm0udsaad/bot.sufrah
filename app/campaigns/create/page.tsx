"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Loader2,
  Plus,
  XCircle,
  Trash2,
  CalendarClock,
  Users,
  FileText,
  Image as ImageIcon,
  Send,
  MessageSquare,
} from "lucide-react"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WhatsAppTemplatePreview, type TemplatePreviewData } from "@/components/campaigns/WhatsAppTemplatePreview"

// ─── Types ───────────────────────────────────────────────

interface Template {
  id: string
  name: string
  category: string
  body_text: string
  footer_text: string | null
  language: string | null
  status: string | null
  twilio_content_sid: string | null
  variables: string[]
}

interface Contact {
  customerWa: string
  customerName: string | null
}

const TEMPLATE_TYPES = [
  { value: "twilio/text", labelAr: "نص", labelEn: "Text" },
  { value: "twilio/media", labelAr: "وسائط (صورة/فيديو)", labelEn: "Media (Image/Video)" },
  { value: "twilio/call-to-action", labelAr: "دعوة لإجراء", labelEn: "Call to Action" },
  { value: "twilio/quick-reply", labelAr: "رد سريع", labelEn: "Quick Reply" },
  { value: "twilio/card", labelAr: "بطاقة", labelEn: "Card" },
  { value: "twilio/carousel", labelAr: "عرض دوّار", labelEn: "Carousel" },
  { value: "twilio/catalog", labelAr: "كتالوج", labelEn: "Catalog" },
] as const

type TwilioTemplateType = (typeof TEMPLATE_TYPES)[number]["value"]

interface ActionButton {
  type: string
  title: string
  id?: string
  url?: string
  phone?: string
  code?: string
}

interface CarouselCard {
  title: string
  body: string
  media: string
  actions: ActionButton[]
}

// ─── Helper ──────────────────────────────────────────────

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ─── Main Page ───────────────────────────────────────────

export default function CreateCampaignPage() {
  const { t, dir } = useI18n()
  const isRtl = dir === "rtl"
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [templates, setTemplates] = useState<Template[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  // ── Campaign fields ──
  const [campaignName, setCampaignName] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [recipientMode, setRecipientMode] = useState<"all" | "select" | "manual">("all")
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [manualPhones, setManualPhones] = useState<string[]>([])
  const [phoneInput, setPhoneInput] = useState("")
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now")
  const [scheduledAt, setScheduledAt] = useState("")

  // ── Template builder fields (if using existing template) ──
  const [useExistingTemplate, setUseExistingTemplate] = useState(true)

  // ── New template fields ──
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateCategory, setNewTemplateCategory] = useState("MARKETING")
  const [newTemplateBody, setNewTemplateBody] = useState("")
  const [newTemplateFooter, setNewTemplateFooter] = useState("")
  const [newTemplateLanguage, setNewTemplateLanguage] = useState(dir === "rtl" ? "ar" : "en")
  const [templateType, setTemplateType] = useState<TwilioTemplateType>("twilio/text")

  // Type-specific fields
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaInput, setMediaInput] = useState("")
  const [actions, setActions] = useState<ActionButton[]>([])
  const [cardTitle, setCardTitle] = useState("")
  const [cardSubtitle, setCardSubtitle] = useState("")
  const [cards, setCards] = useState<CarouselCard[]>([
    { title: "", body: "", media: "", actions: [{ type: "QUICK_REPLY", title: "" }] },
  ])
  const [catalogId, setCatalogId] = useState("")
  const [catalogTitle, setCatalogTitle] = useState("")
  const [catalogItems, setCatalogItems] = useState<{ id: string; section_title: string }[]>([
    { id: "", section_title: "" },
  ])

  // ── Fetch data ──
  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFetch<{ templates: Template[] }>("/api/dashboard/templates?limit=200").then((d) =>
        setTemplates(d.templates || [])
      ),
      apiFetch<{ contacts: Contact[] }>("/api/campaigns/contacts").then((d) => setContacts(d.contacts)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED")

  // ── Recipients ──
  const toggleContact = (phone: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone)
      else next.add(phone)
      return next
    })
  }

  const addManualPhone = () => {
    const cleaned = phoneInput.trim()
    if (cleaned && /^\+[1-9]\d{1,14}$/.test(cleaned) && !manualPhones.includes(cleaned)) {
      setManualPhones((prev) => [...prev, cleaned])
      setPhoneInput("")
    }
  }

  // ── Media helpers ──
  const addMedia = () => {
    const u = mediaInput.trim()
    if (u && !mediaUrls.includes(u)) {
      setMediaUrls((prev) => [...prev, u])
      setMediaInput("")
    }
  }

  // ── Action helpers ──
  const addAction = () => {
    setActions((prev) => [...prev, { type: "URL", title: "" }])
  }

  const updateAction = (idx: number, field: string, value: string) => {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))
  }

  const removeAction = (idx: number) => {
    setActions((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Carousel card helpers ──
  const addCard = () => {
    setCards((prev) => [
      ...prev,
      { title: "", body: "", media: "", actions: [{ type: "QUICK_REPLY", title: "" }] },
    ])
  }

  const updateCard = (idx: number, field: string, value: any) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const removeCard = (idx: number) => {
    setCards((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateCardAction = (cardIdx: number, actionIdx: number, field: string, value: string) => {
    setCards((prev) =>
      prev.map((c, ci) =>
        ci === cardIdx
          ? {
              ...c,
              actions: c.actions.map((a, ai) =>
                ai === actionIdx ? { ...a, [field]: value } : a
              ),
            }
          : c
      )
    )
  }

  // ── Submit ──
  const handleSubmit = async () => {
    if (!campaignName) {
      toast.error(t("campaigns.errors.requiredFields"))
      return
    }

    let recipients: { phone: string; customerName?: string }[] = []
    if (recipientMode === "all") {
      recipients = contacts.map((c) => ({ phone: c.customerWa, customerName: c.customerName || undefined }))
    } else if (recipientMode === "select") {
      recipients = contacts
        .filter((c) => selectedContacts.has(c.customerWa))
        .map((c) => ({ phone: c.customerWa, customerName: c.customerName || undefined }))
    } else {
      recipients = manualPhones.map((p) => ({ phone: p }))
    }

    if (recipients.length === 0) {
      toast.error(t("campaigns.errors.noRecipients"))
      return
    }

    setSubmitting(true)
    try {
      // Step 1: Create template if needed
      let finalTemplateId = templateId

      if (!useExistingTemplate) {
        if (!newTemplateName || !newTemplateBody) {
          toast.error(t("campaigns.errors.requiredFields"))
          setSubmitting(false)
          return
        }

        // Validate actions for call-to-action type
        if (templateType === "twilio/call-to-action" && actions.filter((a) => a.title).length === 0) {
          toast.error(isRtl ? "يجب إضافة زر واحد على الأقل (رابط، هاتف، أو كود)" : "Please add at least one action button (URL, Phone, or Code)")
          setSubmitting(false)
          return
        }

        // Create template
        const createRes = await apiFetch<{ template: { id: string } }>("/api/dashboard/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newTemplateName,
            category: newTemplateCategory,
            language: newTemplateLanguage,
            body_text: newTemplateBody,
            footer_text: newTemplateFooter || undefined,
            variables: extractVariables(newTemplateBody),
          }),
        })

        finalTemplateId = createRes.template.id

        // Submit for approval with type-specific data
        const submitBody: Record<string, any> = { templateType }

        if (templateType === "twilio/media") {
          submitBody.mediaUrls = mediaUrls
        }

        if (templateType === "twilio/call-to-action" || templateType === "twilio/quick-reply") {
          submitBody.actions = actions
        }

        if (templateType === "twilio/card") {
          submitBody.title = cardTitle || undefined
          submitBody.subtitle = cardSubtitle || undefined
          submitBody.mediaUrls = mediaUrls.length > 0 ? mediaUrls : undefined
          submitBody.actions = actions.length > 0 ? actions : undefined
        }

        if (templateType === "twilio/carousel") {
          submitBody.cards = cards.filter((c) => c.body || c.media)
        }

        if (templateType === "twilio/catalog") {
          submitBody.catalogId = catalogId
          submitBody.title = catalogTitle || undefined
          submitBody.catalogItems = catalogItems.filter((i) => i.id)
        }

        await apiFetch(`/api/campaigns/templates/${finalTemplateId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitBody),
        })
      }

      if (!finalTemplateId) {
        toast.error(t("campaigns.errors.noApprovedTemplate"))
        setSubmitting(false)
        return
      }

      // Step 2: Create campaign
      await apiFetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          templateId: finalTemplateId,
          recipients,
          scheduledAt: scheduleMode === "later" && scheduledAt ? scheduledAt : undefined,
        }),
      })

      if (!useExistingTemplate) {
        toast.info(t("campaigns.toasts.createdPendingApproval"), { duration: 8000 })
      } else {
        toast.success(t("campaigns.toasts.created"))
      }
      router.push("/campaigns")
    } catch (err: any) {
      toast.error(err.message || t("campaigns.toasts.createFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map((match) => match.slice(2, -2).trim()) : []
  }

  const typeLabel = (v: string) => {
    const found = TEMPLATE_TYPES.find((tt) => tt.value === v)
    return found ? (isRtl ? found.labelAr : found.labelEn) : v
  }

  // Get current template for preview
  const getCurrentTemplatePreview = (): TemplatePreviewData | null => {
    if (useExistingTemplate && templateId) {
      const template = templates.find((t) => t.id === templateId)
      if (template) {
        return {
          body: template.body_text,
          footer: template.footer_text,
          type: "twilio/text",
          mediaUrls: [],
          actions: [],
          cards: [],
        }
      }
    } else if (!useExistingTemplate && newTemplateBody) {
      return {
        body: newTemplateBody,
        footer: newTemplateFooter,
        type: templateType,
        mediaUrls,
        actions,
        cards,
        cardTitle,
        cardSubtitle,
        catalogId,
        catalogTitle,
        catalogItems,
      }
    }
    return null
  }

  const templatePreview = getCurrentTemplatePreview()

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
              <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("campaigns.create.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? "أنشئ حملة تسويقية جديدة باستخدام قالب معتمد أو إنشاء قالب جديد"
                  : "Create a new marketing campaign using an approved template or create a new one"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Campaign name */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {isRtl ? "تفاصيل الحملة" : "Campaign Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t("campaigns.create.name")}</Label>
                    <Input
                      dir={dir}
                      placeholder={t("campaigns.create.namePlaceholder")}
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {isRtl ? "القالب" : "Template"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={useExistingTemplate ? "default" : "outline"}
                      onClick={() => setUseExistingTemplate(true)}
                    >
                      {isRtl ? "استخدام قالب معتمد" : "Use Approved Template"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!useExistingTemplate ? "default" : "outline"}
                      onClick={() => setUseExistingTemplate(false)}
                    >
                      {isRtl ? "إنشاء قالب جديد" : "Create New Template"}
                    </Button>
                  </div>

                  {useExistingTemplate ? (
                    <div>
                      <Label>{t("campaigns.create.template")}</Label>
                      {approvedTemplates.length === 0 ? (
                        <p className="text-sm text-destructive mt-1">
                          {t("campaigns.errors.noApprovedTemplate")}
                        </p>
                      ) : (
                        <Select value={templateId} onValueChange={setTemplateId}>
                          <SelectTrigger dir={dir}>
                            <SelectValue placeholder={t("campaigns.create.templatePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {approvedTemplates.map((tmpl) => (
                              <SelectItem key={tmpl.id} value={tmpl.id}>
                                {tmpl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>{isRtl ? "اسم القالب" : "Template Name"}</Label>
                        <Input
                          dir={dir}
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder={isRtl ? "مثال: رسالة ترحيب" : "e.g., Welcome Message"}
                        />
                      </div>

                      <div>
                        <Label>{isRtl ? "نوع القالب" : "Template Type"}</Label>
                        <Select value={templateType} onValueChange={(v) => setTemplateType(v as TwilioTemplateType)}>
                          <SelectTrigger dir={dir}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_TYPES.map((tt) => (
                              <SelectItem key={tt.value} value={tt.value}>
                                {isRtl ? tt.labelAr : tt.labelEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{isRtl ? "الفئة" : "Category"}</Label>
                        <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                          <SelectTrigger dir={dir}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MARKETING">{isRtl ? "تسويق" : "Marketing"}</SelectItem>
                            <SelectItem value="UTILITY">{isRtl ? "خدمي" : "Utility"}</SelectItem>
                            <SelectItem value="AUTHENTICATION">{isRtl ? "مصادقة" : "Authentication"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{isRtl ? "نص الرسالة" : "Message Body"}</Label>
                        <Textarea
                          dir={dir}
                          value={newTemplateBody}
                          onChange={(e) => setNewTemplateBody(e.target.value)}
                          placeholder={isRtl ? "أدخل نص الرسالة..." : "Enter message text..."}
                          className="min-h-24"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {isRtl ? "استخدم {{1}}, {{2}} للمتغيرات" : "Use {{1}}, {{2}} for variables"}
                        </p>
                      </div>

                      <div>
                        <Label>{isRtl ? "تذييل (اختياري)" : "Footer (optional)"}</Label>
                        <Input
                          dir={dir}
                          value={newTemplateFooter}
                          onChange={(e) => setNewTemplateFooter(e.target.value)}
                          placeholder={isRtl ? "نص التذييل" : "Footer text"}
                        />
                      </div>

                      <Separator />

                      {/* Type-specific fields */}
                      {(templateType === "twilio/media" || templateType === "twilio/card") && (
                        <div className="space-y-2">
                          <Label>{isRtl ? "روابط الوسائط" : "Media URLs"}</Label>
                          <div className="flex gap-2">
                            <Input
                              dir="ltr"
                              placeholder="https://example.com/image.jpg"
                              value={mediaInput}
                              onChange={(e) => setMediaInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedia())}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={addMedia}>
                              {isRtl ? "إضافة" : "Add"}
                            </Button>
                          </div>
                          {mediaUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mediaUrls.map((u, i) => (
                                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                                  <span className="max-w-[200px] truncate">{u}</span>
                                  <button
                                    onClick={() => setMediaUrls((p) => p.filter((_, j) => j !== i))}
                                    className="hover:text-destructive"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {templateType === "twilio/call-to-action" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>{isRtl ? "أزرار الإجراء" : "Action Buttons"}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addAction}>
                              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "زر" : "Button"}
                            </Button>
                          </div>
                          {actions.map((action, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Select value={action.type} onValueChange={(v) => updateAction(idx, "type", v)}>
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="URL">URL</SelectItem>
                                  <SelectItem value="PHONE">{isRtl ? "هاتف" : "Phone"}</SelectItem>
                                  <SelectItem value="COPY_CODE">{isRtl ? "كود" : "Code"}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                dir={dir}
                                placeholder={isRtl ? "عنوان" : "Title"}
                                value={action.title}
                                maxLength={20}
                                onChange={(e) => updateAction(idx, "title", e.target.value)}
                              />
                              {action.type === "URL" && (
                                <Input
                                  dir="ltr"
                                  placeholder="URL"
                                  value={action.url || ""}
                                  onChange={(e) => updateAction(idx, "url", e.target.value)}
                                />
                              )}
                              {action.type === "PHONE" && (
                                <Input
                                  dir="ltr"
                                  placeholder="+966..."
                                  value={action.phone || ""}
                                  onChange={(e) => updateAction(idx, "phone", e.target.value)}
                                />
                              )}
                              {action.type === "COPY_CODE" && (
                                <Input
                                  dir="ltr"
                                  placeholder="CODE"
                                  value={action.code || ""}
                                  onChange={(e) => updateAction(idx, "code", e.target.value)}
                                />
                              )}
                              <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {templateType === "twilio/quick-reply" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>{isRtl ? "أزرار الرد السريع" : "Quick Reply Buttons"}</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setActions((p) => [...p, { type: "QUICK_REPLY", title: "" }])}
                              disabled={actions.length >= 10}
                            >
                              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "زر" : "Button"}
                            </Button>
                          </div>
                          {actions.map((action, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                dir={dir}
                                placeholder={isRtl ? `زر ${idx + 1}` : `Button ${idx + 1}`}
                                value={action.title}
                                maxLength={20}
                                onChange={(e) => updateAction(idx, "title", e.target.value)}
                              />
                              <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {templateType === "twilio/card" && (
                        <div className="space-y-3">
                          <Input
                            dir={dir}
                            placeholder={isRtl ? "عنوان البطاقة" : "Card title"}
                            value={cardTitle}
                            onChange={(e) => setCardTitle(e.target.value)}
                          />
                          <Input
                            dir={dir}
                            placeholder={isRtl ? "العنوان الفرعي" : "Subtitle"}
                            value={cardSubtitle}
                            onChange={(e) => setCardSubtitle(e.target.value)}
                          />
                          <div className="flex items-center justify-between">
                            <Label>{isRtl ? "أزرار" : "Buttons"}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addAction}>
                              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "زر" : "Button"}
                            </Button>
                          </div>
                          {actions.map((action, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Select value={action.type} onValueChange={(v) => updateAction(idx, "type", v)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="QUICK_REPLY">{isRtl ? "رد سريع" : "Quick"}</SelectItem>
                                  <SelectItem value="URL">URL</SelectItem>
                                  <SelectItem value="PHONE_NUMBER">{isRtl ? "هاتف" : "Phone"}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                dir={dir}
                                placeholder={isRtl ? "عنوان" : "Title"}
                                value={action.title}
                                maxLength={20}
                                onChange={(e) => updateAction(idx, "title", e.target.value)}
                              />
                              {action.type === "URL" && (
                                <Input
                                  dir="ltr"
                                  placeholder="URL"
                                  className="flex-1"
                                  value={action.url || ""}
                                  onChange={(e) => updateAction(idx, "url", e.target.value)}
                                />
                              )}
                              <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {templateType === "twilio/carousel" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>{isRtl ? "بطاقات" : "Cards"}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addCard}>
                              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "بطاقة" : "Card"}
                            </Button>
                          </div>
                          {cards.map((card, ci) => (
                            <Card key={ci}>
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{isRtl ? `بطاقة ${ci + 1}` : `Card ${ci + 1}`}</p>
                                  {cards.length > 1 && (
                                    <Button variant="ghost" size="sm" onClick={() => removeCard(ci)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <Input
                                  dir={dir}
                                  placeholder={isRtl ? "عنوان" : "Title"}
                                  value={card.title}
                                  onChange={(e) => updateCard(ci, "title", e.target.value)}
                                />
                                <Input
                                  dir={dir}
                                  placeholder={isRtl ? "نص" : "Body"}
                                  value={card.body}
                                  maxLength={160}
                                  onChange={(e) => updateCard(ci, "body", e.target.value)}
                                />
                                <Input
                                  dir="ltr"
                                  placeholder={isRtl ? "صورة" : "Image URL"}
                                  value={card.media}
                                  onChange={(e) => updateCard(ci, "media", e.target.value)}
                                />
                                {card.actions.map((a, ai) => (
                                  <div key={ai} className="flex gap-2 items-center">
                                    <Select value={a.type} onValueChange={(v) => updateCardAction(ci, ai, "type", v)}>
                                      <SelectTrigger className="w-28">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="QUICK_REPLY">{isRtl ? "رد" : "Quick"}</SelectItem>
                                        <SelectItem value="URL">URL</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      dir={dir}
                                      placeholder={isRtl ? "عنوان" : "Title"}
                                      value={a.title}
                                      maxLength={25}
                                      onChange={(e) => updateCardAction(ci, ai, "title", e.target.value)}
                                    />
                                    {a.type === "URL" && (
                                      <Input
                                        dir="ltr"
                                        placeholder="URL"
                                        value={a.url || ""}
                                        onChange={(e) => updateCardAction(ci, ai, "url", e.target.value)}
                                      />
                                    )}
                                  </div>
                                ))}
                                {card.actions.length < 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateCard(ci, "actions", [...card.actions, { type: "QUICK_REPLY", title: "" }])
                                    }
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> {isRtl ? "زر" : "Button"}
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {templateType === "twilio/catalog" && (
                        <div className="space-y-3">
                          <Input
                            dir="ltr"
                            placeholder={isRtl ? "معرّف الكتالوج" : "Catalog ID"}
                            value={catalogId}
                            onChange={(e) => setCatalogId(e.target.value)}
                          />
                          <Input
                            dir={dir}
                            placeholder={isRtl ? "عنوان الكتالوج" : "Catalog title"}
                            value={catalogTitle}
                            onChange={(e) => setCatalogTitle(e.target.value)}
                            maxLength={60}
                          />
                          <div className="flex items-center justify-between">
                            <Label>{isRtl ? "عناصر" : "Items"}</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCatalogItems((p) => [...p, { id: "", section_title: "" }])}
                            >
                              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "عنصر" : "Item"}
                            </Button>
                          </div>
                          {catalogItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                dir="ltr"
                                placeholder={isRtl ? "معرّف المنتج" : "Product ID"}
                                value={item.id}
                                onChange={(e) =>
                                  setCatalogItems((p) => p.map((it, i) => (i === idx ? { ...it, id: e.target.value } : it)))
                                }
                              />
                              <Input
                                dir={dir}
                                placeholder={isRtl ? "قسم" : "Section"}
                                value={item.section_title}
                                onChange={(e) =>
                                  setCatalogItems((p) =>
                                    p.map((it, i) => (i === idx ? { ...it, section_title: e.target.value } : it))
                                  )
                                }
                              />
                              <Button variant="ghost" size="sm" onClick={() => setCatalogItems((p) => p.filter((_, i) => i !== idx))}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("campaigns.create.recipients")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {(["all", "select", "manual"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={recipientMode === mode ? "default" : "outline"}
                        onClick={() => setRecipientMode(mode)}
                      >
                        {mode === "all" && t("campaigns.create.allCustomers")}
                        {mode === "select" && t("campaigns.create.selectCustomers")}
                        {mode === "manual" && t("campaigns.create.addNewNumbers")}
                      </Button>
                    ))}
                  </div>

                  {recipientMode === "all" && (
                    <p className="text-sm text-muted-foreground">
                      {t("campaigns.contacts.total").replace("{count}", String(contacts.length))}
                    </p>
                  )}

                  {recipientMode === "select" && (
                    <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
                      {contacts.map((c) => (
                        <label
                          key={c.customerWa}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedContacts.has(c.customerWa)}
                            onCheckedChange={() => toggleContact(c.customerWa)}
                          />
                          <span className="text-sm font-mono">{c.customerWa}</span>
                          {c.customerName && <span className="text-sm text-muted-foreground">({c.customerName})</span>}
                        </label>
                      ))}
                    </div>
                  )}

                  {recipientMode === "manual" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          dir="ltr"
                          placeholder={t("campaigns.create.phonePlaceholder")}
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addManualPhone())}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addManualPhone}>
                          {t("campaigns.create.addPhone")}
                        </Button>
                      </div>
                      {manualPhones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {manualPhones.map((p) => (
                            <Badge key={p} variant="secondary" className="gap-1">
                              {p}
                              <button
                                onClick={() => setManualPhones((prev) => prev.filter((x) => x !== p))}
                                className="hover:text-destructive"
                              >
                                <XCircle className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    {t("campaigns.create.schedule")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={scheduleMode === "now" ? "default" : "outline"}
                      onClick={() => setScheduleMode("now")}
                    >
                      {t("campaigns.create.sendNow")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={scheduleMode === "later" ? "default" : "outline"}
                      onClick={() => setScheduleMode("later")}
                    >
                      {t("campaigns.create.scheduleFor")}
                    </Button>
                  </div>
                  {scheduleMode === "later" && (
                    <div>
                      <Label>{t("campaigns.create.scheduledAt")}</Label>
                      <Input
                        type="datetime-local"
                        dir="ltr"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                {/* WhatsApp Message Preview */}
                {templatePreview ? (
                  <>
                    <WhatsAppTemplatePreview data={templatePreview} isRtl={isRtl} />

                    {/* Compact Summary Below Preview */}
                    <div className="space-y-2 bg-muted/50 rounded-lg p-3 border">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{isRtl ? "الاسم" : "Campaign Name"}</p>
                        <p className="text-sm font-semibold truncate">{campaignName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{isRtl ? "المستلمين" : "Recipients"}</p>
                        <p className="text-sm font-semibold">
                          {recipientMode === "all"
                            ? `${contacts.length} ${isRtl ? "عميل" : "customers"}`
                            : recipientMode === "select"
                            ? `${selectedContacts.size} ${isRtl ? "محدد" : "selected"}`
                            : `${manualPhones.length} ${isRtl ? "رقم" : "numbers"}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{isRtl ? "الجدولة" : "Schedule"}</p>
                        <p className="text-sm font-semibold">
                          {scheduleMode === "now"
                            ? isRtl
                              ? "فوري"
                              : "Now"
                            : scheduledAt
                            ? new Date(scheduledAt).toLocaleDateString(isRtl ? "ar-SA" : "en-US")
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        {isRtl
                          ? "أكمل تفاصيل القالب لرؤية المعاينة"
                          : "Complete template details to see preview"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting || !templatePreview}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isRtl ? "جاري الإنشاء..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("campaigns.create.submit")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
