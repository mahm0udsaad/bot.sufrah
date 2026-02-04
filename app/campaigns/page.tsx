"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Plus,
  Send,
  XCircle,
  Trash2,
  Loader2,
  RefreshCw,
  Megaphone,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ArrowLeft,
  Phone,
  CalendarClock,
} from "lucide-react"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  status: string
  templateId: string
  scheduledAt: string | null
  sentAt: string | null
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  createdAt: string
  template: Template
  recipients?: Recipient[]
  _count?: { recipients: number }
}

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

interface Recipient {
  id: string
  phone: string
  customerName: string | null
  status: string
  waSid: string | null
  errorMessage: string | null
  sentAt: string | null
}

interface Contact {
  customerWa: string
  customerName: string | null
}

// ─── API Helpers ─────────────────────────────────────────

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ─── Status Badge ────────────────────────────────────────

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  WAITING_APPROVAL: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  SENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusIcons: Record<string, any> = {
  DRAFT: AlertCircle,
  WAITING_APPROVAL: Clock,
  SCHEDULED: CalendarClock,
  SENDING: Loader2,
  SENT: CheckCircle2,
  CANCELLED: XCircle,
  FAILED: XCircle,
}

// ─── Main Page ───────────────────────────────────────────

export default function CampaignsPage() {
  const { t, dir } = useI18n()
  const isRtl = dir === "rtl"

  const [activeTab, setActiveTab] = useState("campaigns")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Pagination state
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [totalCampaigns, setTotalCampaigns] = useState(0)

  const effectiveLimit = useMemo(() => Math.min(Math.max(limit, 1), 200), [limit])
  const safeOffset = useMemo(() => Math.max(offset, 0), [offset])

  // ── Data fetching ──
  const fetchCampaigns = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: effectiveLimit.toString(),
        offset: safeOffset.toString(),
      })
      const data = await apiFetch<{
        campaigns: Campaign[];
        pagination: { total: number; hasMore: boolean }
      }>(`/api/campaigns?${params}`)
      setCampaigns(data.campaigns)
      setTotalCampaigns(data.pagination.total)
    } catch {
      toast.error(t("campaigns.toasts.createFailed"))
    }
  }, [t, effectiveLimit, safeOffset])

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiFetch<{ templates: Template[] }>("/api/dashboard/templates?limit=200")
      setTemplates(data.templates || [])
    } catch {
      // silent
    }
  }, [])

  const fetchContacts = useCallback(async () => {
    try {
      const data = await apiFetch<{ contacts: Contact[] }>("/api/campaigns/contacts")
      setContacts(data.contacts)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCampaigns(), fetchTemplates(), fetchContacts()]).finally(() =>
      setLoading(false)
    )
  }, [fetchCampaigns, fetchTemplates, fetchContacts])

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === "APPROVED"),
    [templates]
  )

  // ── Campaign detail view ──
  if (selectedCampaign) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <CampaignDetail
            campaign={selectedCampaign}
            onBack={() => {
              setSelectedCampaign(null)
              fetchCampaigns()
            }}
            t={t}
            dir={dir}
            isRtl={isRtl}
          />
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t("campaigns.title")}
              </h1>
              <p className="text-muted-foreground">{t("campaigns.subtitle")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setLoading(true)
              Promise.all([fetchCampaigns(), fetchTemplates(), fetchContacts()]).finally(() => setLoading(false))
            }}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin", isRtl ? "ml-2" : "mr-2")} />
              {t("campaigns.actions.refresh")}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir}>
            <TabsList>
              <TabsTrigger value="campaigns">{t("campaigns.tabs.campaigns")}</TabsTrigger>
              <TabsTrigger value="templates">{t("campaigns.tabs.templates")}</TabsTrigger>
              <TabsTrigger value="contacts">{t("campaigns.tabs.contacts")}</TabsTrigger>
            </TabsList>

            {/* ─── Tab 1: Campaigns ─── */}
            <TabsContent value="campaigns" className="space-y-4 mt-4">
              <CampaignsTab
                campaigns={campaigns}
                approvedTemplates={approvedTemplates}
                contacts={contacts}
                loading={loading}
                onRefresh={fetchCampaigns}
                onViewDetails={async (c) => {
                  try {
                    const data = await apiFetch<{ campaign: Campaign }>(`/api/campaigns/${c.id}`)
                    setSelectedCampaign(data.campaign)
                  } catch {
                    toast.error("Failed to load campaign details")
                  }
                }}
                t={t}
                dir={dir}
                isRtl={isRtl}
                limit={limit}
                offset={offset}
                totalCampaigns={totalCampaigns}
                setLimit={setLimit}
                setOffset={setOffset}
              />
            </TabsContent>

            {/* ─── Tab 2: Templates ─── */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <TemplatesApprovalTab
                templates={templates}
                onRefresh={fetchTemplates}
                t={t}
                dir={dir}
                isRtl={isRtl}
              />
            </TabsContent>

            {/* ─── Tab 3: Contacts ─── */}
            <TabsContent value="contacts" className="space-y-4 mt-4">
              <ContactsTab contacts={contacts} t={t} dir={dir} isRtl={isRtl} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

// ─── Campaigns Tab ───────────────────────────────────────

function CampaignsTab({
  campaigns,
  approvedTemplates,
  contacts,
  loading,
  onRefresh,
  onViewDetails,
  t,
  dir,
  isRtl,
  limit,
  offset,
  totalCampaigns,
  setLimit,
  setOffset,
}: {
  campaigns: Campaign[]
  approvedTemplates: Template[]
  contacts: Contact[]
  loading: boolean
  onRefresh: () => void
  onViewDetails: (c: Campaign) => void
  t: (key: string, opts?: any) => string
  dir: string
  isRtl: boolean
  limit: number
  offset: number
  totalCampaigns: number
  setLimit: (limit: number) => void
  setOffset: (offset: number) => void
}) {
  const effectiveLimit = Math.min(Math.max(limit, 1), 200)
  const safeOffset = Math.max(offset, 0)
  const handleSend = async (campaign: Campaign) => {
    if (!confirm(t("campaigns.actions.confirmSend"))) return
    try {
      await apiFetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" })
      toast.success(t("campaigns.toasts.sent"))
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || t("campaigns.toasts.sendFailed"))
    }
  }

  const handleResend = async (campaign: Campaign) => {
    if (!confirm(t("campaigns.actions.confirmResend"))) return
    try {
      await apiFetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" })
      toast.success(t("campaigns.toasts.sent"))
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || t("campaigns.toasts.sendFailed"))
    }
  }

  const handleCancel = async (campaign: Campaign) => {
    if (!confirm(t("campaigns.actions.confirmCancel"))) return
    try {
      await apiFetch(`/api/campaigns/${campaign.id}/cancel`, { method: "POST" })
      toast.success(t("campaigns.toasts.cancelled"))
      onRefresh()
    } catch {
      toast.error(t("campaigns.toasts.sendFailed"))
    }
  }

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(t("campaigns.actions.confirmDelete"))) return
    try {
      await apiFetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" })
      toast.success(t("campaigns.toasts.deleted"))
      onRefresh()
    } catch {
      toast.error(t("campaigns.toasts.createFailed"))
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Link href="/campaigns/create">
          <Button>
            <Plus className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
            {t("campaigns.actions.create")}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="font-medium text-foreground">{t("campaigns.empty.title")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("campaigns.empty.message")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("campaigns.table.name")}</TableHead>
                <TableHead>{t("campaigns.table.template")}</TableHead>
                <TableHead>{t("campaigns.table.status")}</TableHead>
                <TableHead>{t("campaigns.table.recipients")}</TableHead>
                <TableHead>{t("campaigns.table.scheduled")}</TableHead>
                <TableHead>{t("campaigns.table.created")}</TableHead>
                <TableHead className="text-right">{t("campaigns.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const StatusIcon = statusIcons[campaign.status] || AlertCircle
                return (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.template?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[campaign.status] || ""}>
                        <StatusIcon className={cn("h-3 w-3", isRtl ? "ml-1" : "mr-1", campaign.status === "SENDING" && "animate-spin")} />
                        {t(`campaigns.status.${campaign.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.totalRecipients}</TableCell>
                    <TableCell>
                      {campaign.scheduledAt
                        ? new Date(campaign.scheduledAt).toLocaleString(dir === "rtl" ? "ar-SA" : "en-US")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(campaign.createdAt).toLocaleDateString(dir === "rtl" ? "ar-SA" : "en-US")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => onViewDetails(campaign)}>
                          {t("campaigns.actions.viewDetails")}
                        </Button>
                        {campaign.status === "DRAFT" && (
                          <>
                            <Button variant="default" size="sm" onClick={() => handleSend(campaign)}>
                              <Send className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(campaign)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {campaign.status === "WAITING_APPROVAL" && (
                          <Button variant="outline" size="sm" disabled title={t("campaigns.status.waitingApprovalHint")}>
                            <Clock className="h-3 w-3" />
                            <span className={isRtl ? "mr-1" : "ml-1"}>{t("campaigns.status.WAITING_APPROVAL")}</span>
                          </Button>
                        )}
                        {["SENT", "FAILED", "CANCELLED"].includes(campaign.status) && (
                          <Button variant="outline" size="sm" onClick={() => handleResend(campaign)}>
                            <RefreshCw className="h-3 w-3" />
                            <span className={isRtl ? "mr-1" : "ml-1"}>{t("campaigns.actions.resend")}</span>
                          </Button>
                        )}
                        {["SCHEDULED", "SENDING"].includes(campaign.status) && (
                          <Button variant="destructive" size="sm" onClick={() => handleCancel(campaign)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalCampaigns > effectiveLimit && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">
              {t("campaigns.pagination.pageSize")}:
            </Label>
            <Select
              value={effectiveLimit.toString()}
              onValueChange={(v) => {
                setLimit(parseInt(v))
                setOffset(0) // Reset to first page
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {t("campaigns.pagination.showing", {
                from: safeOffset + 1,
                to: Math.min(safeOffset + effectiveLimit, totalCampaigns),
                total: totalCampaigns
              })}
            </span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    const newOffset = Math.max(0, safeOffset - effectiveLimit)
                    setOffset(newOffset)
                  }}
                  className={cn(
                    safeOffset === 0 && "pointer-events-none opacity-50",
                    "cursor-pointer"
                  )}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-sm px-4">
                  {t("campaigns.pagination.page", {
                    current: Math.floor(safeOffset / effectiveLimit) + 1,
                    total: Math.ceil(totalCampaigns / effectiveLimit)
                  })}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    const newOffset = safeOffset + effectiveLimit
                    if (newOffset < totalCampaigns) {
                      setOffset(newOffset)
                    }
                  }}
                  className={cn(
                    safeOffset + effectiveLimit >= totalCampaigns &&
                      "pointer-events-none opacity-50",
                    "cursor-pointer"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}

// ─── Campaign Detail ─────────────────────────────────────

function CampaignDetail({
  campaign,
  onBack,
  t,
  dir,
  isRtl,
}: {
  campaign: Campaign
  onBack: () => void
  t: (key: string) => string
  dir: string
  isRtl: boolean
}) {
  const StatusIcon = statusIcons[campaign.status] || AlertCircle
  const recipients = campaign.recipients || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <Badge className={statusColors[campaign.status] || ""}>
            <StatusIcon className={cn("h-3 w-3", isRtl ? "ml-1" : "mr-1")} />
            {t(`campaigns.status.${campaign.status}`)}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("campaigns.stats.total")}</p>
            <p className="text-2xl font-bold">{campaign.totalRecipients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("campaigns.stats.sent")}</p>
            <p className="text-2xl font-bold text-blue-600">{campaign.sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("campaigns.stats.delivered")}</p>
            <p className="text-2xl font-bold text-green-600">{campaign.deliveredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("campaigns.stats.failed")}</p>
            <p className="text-2xl font-bold text-red-600">{campaign.failedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {campaign.totalRecipients > 0 && (
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(campaign.deliveredCount / campaign.totalRecipients) * 100}%` }}
            />
            <div
              className="bg-blue-500 h-full"
              style={{ width: `${((campaign.sentCount - campaign.deliveredCount - campaign.failedCount) / campaign.totalRecipients) * 100}%` }}
            />
            <div
              className="bg-red-500 h-full"
              style={{ width: `${(campaign.failedCount / campaign.totalRecipients) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Recipients list */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Phone className="h-4 w-4 inline" /> {t("campaigns.contacts.phone")}</TableHead>
              <TableHead>{t("campaigns.contacts.name")}</TableHead>
              <TableHead>{t("campaigns.table.status")}</TableHead>
              <TableHead>{t("campaigns.stats.sent")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                <TableCell>{r.customerName || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`campaigns.recipientStatus.${r.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.sentAt ? new Date(r.sentAt).toLocaleString(dir === "rtl" ? "ar-SA" : "en-US") : "—"}
                  {r.errorMessage && (
                    <p className="text-xs text-destructive mt-0.5">{r.errorMessage}</p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Template Type Labels ────────────────────────────────

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

interface SubmitAction {
  type: string
  title: string
  id?: string
  url?: string
  phone?: string
  code?: string
}

interface SubmitCard {
  title: string
  body: string
  media: string
  actions: SubmitAction[]
}

// ─── Templates Approval Tab ──────────────────────────────

function TemplatesApprovalTab({
  templates,
  onRefresh,
  t,
  dir,
  isRtl,
}: {
  templates: Template[]
  onRefresh: () => void
  t: (key: string) => string
  dir: string
  isRtl: boolean
}) {
  const [checking, setChecking] = useState<string | null>(null)
  const [submitDialog, setSubmitDialog] = useState<Template | null>(null)

  const handleCheckStatus = async (template: Template) => {
    setChecking(template.id)
    try {
      const data = await apiFetch<{ status: string; rejectionReason?: string }>(
        `/api/campaigns/templates/${template.id}/status`
      )
      if (data.status === "APPROVED") {
        toast.success(t("campaigns.toasts.templateApproved"))
      } else if (data.status === "REJECTED") {
        toast.error(`${t("campaigns.toasts.templateRejected")}: ${data.rejectionReason || ""}`)
      } else {
        toast.info(t("campaigns.templateApproval.pending"))
      }
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChecking(null)
    }
  }

  const templateStatusColor: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("templates.table.name") || "Name"}</TableHead>
              <TableHead>{t("templates.table.category") || "Category"}</TableHead>
              <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
              <TableHead>{t("templates.table.status") || "Status"}</TableHead>
              <TableHead>{t("templates.table.language") || "Language"}</TableHead>
              <TableHead className="text-right">{t("templates.table.actions") || "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tmpl) => (
              <TableRow key={tmpl.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{tmpl.body_text}</p>
                  </div>
                </TableCell>
                <TableCell>{tmpl.category}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {TEMPLATE_TYPES.find((tt) => tt.value === tmpl.twilio_content_sid)?.[isRtl ? "labelAr" : "labelEn"] || (isRtl ? "نص" : "Text")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={templateStatusColor[tmpl.status || "draft"] || ""}>
                    {tmpl.status || "draft"}
                  </Badge>
                </TableCell>
                <TableCell className="uppercase">{tmpl.language || "ar"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {(!tmpl.status || tmpl.status === "draft" || tmpl.status === "REJECTED") && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setSubmitDialog(tmpl)}
                      >
                        {t("campaigns.templateApproval.submit")}
                      </Button>
                    )}
                    {tmpl.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={checking === tmpl.id}
                        onClick={() => handleCheckStatus(tmpl)}
                      >
                        {checking === tmpl.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          t("campaigns.templateApproval.checkStatus")
                        )}
                      </Button>
                    )}
                    {tmpl.status === "APPROVED" && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("campaigns.templateApproval.approved")}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("templates.empty.title")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Submit Dialog with Template Type Builder */}
      <Dialog open={!!submitDialog} onOpenChange={(open) => !open && setSubmitDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "إرسال القالب للموافقة" : "Submit Template for Approval"}
              {submitDialog && ` — ${submitDialog.name}`}
            </DialogTitle>
          </DialogHeader>
          {submitDialog && (
            <TemplateSubmitForm
              template={submitDialog}
              onSubmitted={() => {
                setSubmitDialog(null)
                onRefresh()
              }}
              t={t}
              dir={dir}
              isRtl={isRtl}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Template Submit Form (Type-specific builder) ────────

function TemplateSubmitForm({
  template,
  onSubmitted,
  t,
  dir,
  isRtl,
}: {
  template: Template
  onSubmitted: () => void
  t: (key: string) => string
  dir: string
  isRtl: boolean
}) {
  const [templateType, setTemplateType] = useState<TwilioTemplateType>("twilio/text")
  const [submitting, setSubmitting] = useState(false)

  // Media fields
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaInput, setMediaInput] = useState("")

  // Actions (call-to-action, quick-reply, card)
  const [actions, setActions] = useState<SubmitAction[]>([])

  // Card fields
  const [cardTitle, setCardTitle] = useState("")
  const [cardSubtitle, setCardSubtitle] = useState("")

  // Carousel
  const [cards, setCards] = useState<SubmitCard[]>([
    { title: "", body: "", media: "", actions: [{ type: "QUICK_REPLY", title: "" }] },
  ])

  // Catalog
  const [catalogId, setCatalogId] = useState("")
  const [catalogTitle, setCatalogTitle] = useState("")
  const [catalogItems, setCatalogItems] = useState<{ id: string; section_title: string }[]>([
    { id: "", section_title: "" },
  ])

  const addMedia = () => {
    const u = mediaInput.trim()
    if (u && !mediaUrls.includes(u)) {
      setMediaUrls((prev) => [...prev, u])
      setMediaInput("")
    }
  }

  const addAction = () => {
    setActions((prev) => [...prev, { type: "URL", title: "" }])
  }

  const updateAction = (idx: number, field: string, value: string) => {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))
  }

  const removeAction = (idx: number) => {
    setActions((prev) => prev.filter((_, i) => i !== idx))
  }

  // Carousel card helpers
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

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body: Record<string, any> = { templateType }

      if (templateType === "twilio/media") {
        body.mediaUrls = mediaUrls
      }

      if (templateType === "twilio/call-to-action" || templateType === "twilio/quick-reply") {
        body.actions = actions
      }

      if (templateType === "twilio/card") {
        body.title = cardTitle || undefined
        body.subtitle = cardSubtitle || undefined
        body.mediaUrls = mediaUrls.length > 0 ? mediaUrls : undefined
        body.actions = actions.length > 0 ? actions : undefined
      }

      if (templateType === "twilio/carousel") {
        body.cards = cards.filter((c) => c.body || c.media)
      }

      if (templateType === "twilio/catalog") {
        body.catalogId = catalogId
        body.title = catalogTitle || undefined
        body.catalogItems = catalogItems.filter((i) => i.id)
      }

      await apiFetch(`/api/campaigns/templates/${template.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      toast.success(t("campaigns.toasts.templateSubmitted"))
      onSubmitted()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const typeLabel = (v: string) => {
    const found = TEMPLATE_TYPES.find((tt) => tt.value === v)
    return found ? (isRtl ? found.labelAr : found.labelEn) : v
  }

  return (
    <div className="space-y-5">
      {/* Template preview */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">{isRtl ? "محتوى القالب" : "Template Body"}</p>
          <p className="text-sm whitespace-pre-wrap" dir={dir}>{template.body_text}</p>
          {template.footer_text && (
            <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{template.footer_text}</p>
          )}
        </CardContent>
      </Card>

      {/* Type selector */}
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
        <p className="text-xs text-muted-foreground mt-1">
          {isRtl
            ? "اختر نوع القالب المناسب للرسالة التي تريد إرسالها عبر واتساب"
            : "Choose the template type that matches the WhatsApp message you want to send"}
        </p>
      </div>

      {/* ── Type-specific fields ── */}

      {/* MEDIA */}
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
                  <button onClick={() => setMediaUrls((p) => p.filter((_, j) => j !== i))} className="hover:text-destructive">
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CALL-TO-ACTION */}
      {templateType === "twilio/call-to-action" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{isRtl ? "أزرار الإجراء" : "Action Buttons"}</Label>
            <Button type="button" variant="outline" size="sm" onClick={addAction}>
              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "زر" : "Button"}
            </Button>
          </div>
          {actions.map((action, idx) => (
            <Card key={idx}>
              <CardContent className="p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Select value={action.type} onValueChange={(v) => updateAction(idx, "type", v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URL">URL</SelectItem>
                      <SelectItem value="PHONE">{isRtl ? "هاتف" : "Phone"}</SelectItem>
                      <SelectItem value="COPY_CODE">{isRtl ? "نسخ كود" : "Copy Code"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    dir={dir}
                    placeholder={isRtl ? "عنوان الزر (حد 20 حرف)" : "Button title (max 20 chars)"}
                    value={action.title}
                    maxLength={20}
                    onChange={(e) => updateAction(idx, "title", e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {action.type === "URL" && (
                  <Input dir="ltr" placeholder="https://example.com" value={action.url || ""} onChange={(e) => updateAction(idx, "url", e.target.value)} />
                )}
                {action.type === "PHONE" && (
                  <Input dir="ltr" placeholder="+966500000000" value={action.phone || ""} onChange={(e) => updateAction(idx, "phone", e.target.value)} />
                )}
                {action.type === "COPY_CODE" && (
                  <Input dir="ltr" placeholder="DISCOUNT20" value={action.code || ""} onChange={(e) => updateAction(idx, "code", e.target.value)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QUICK REPLY */}
      {templateType === "twilio/quick-reply" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{isRtl ? "أزرار الرد السريع" : "Quick Reply Buttons"}</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setActions((p) => [...p, { type: "QUICK_REPLY", title: "" }])} disabled={actions.length >= 10}>
              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "زر" : "Button"}
            </Button>
          </div>
          {actions.map((action, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                dir={dir}
                placeholder={isRtl ? `زر ${idx + 1} (حد 20 حرف)` : `Button ${idx + 1} (max 20 chars)`}
                value={action.title}
                maxLength={20}
                onChange={(e) => updateAction(idx, "title", e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{isRtl ? "حد أقصى 10 أزرار، 20 حرف لكل زر" : "Max 10 buttons, 20 chars each"}</p>
        </div>
      )}

      {/* CARD */}
      {templateType === "twilio/card" && (
        <div className="space-y-3">
          <div>
            <Label>{isRtl ? "عنوان البطاقة" : "Card Title"}</Label>
            <Input dir={dir} value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder={isRtl ? "عنوان البطاقة" : "Card title"} />
          </div>
          <div>
            <Label>{isRtl ? "العنوان الفرعي" : "Subtitle"}</Label>
            <Input dir={dir} value={cardSubtitle} onChange={(e) => setCardSubtitle(e.target.value)} placeholder={isRtl ? "العنوان الفرعي (اختياري)" : "Subtitle (optional)"} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{isRtl ? "أزرار البطاقة" : "Card Buttons"}</Label>
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
                  <SelectItem value="QUICK_REPLY">{isRtl ? "رد سريع" : "Quick Reply"}</SelectItem>
                  <SelectItem value="URL">URL</SelectItem>
                  <SelectItem value="PHONE_NUMBER">{isRtl ? "هاتف" : "Phone"}</SelectItem>
                </SelectContent>
              </Select>
              <Input dir={dir} placeholder={isRtl ? "عنوان الزر" : "Button title"} value={action.title} maxLength={20} onChange={(e) => updateAction(idx, "title", e.target.value)} />
              {action.type === "URL" && (
                <Input dir="ltr" placeholder="URL" className="flex-1" value={action.url || ""} onChange={(e) => updateAction(idx, "url", e.target.value)} />
              )}
              <Button variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* CAROUSEL */}
      {templateType === "twilio/carousel" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{isRtl ? "بطاقات العرض الدوّار" : "Carousel Cards"}</Label>
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
                <Input dir={dir} placeholder={isRtl ? "عنوان" : "Title"} value={card.title} onChange={(e) => updateCard(ci, "title", e.target.value)} />
                <Input dir={dir} placeholder={isRtl ? "نص البطاقة (حد 160 حرف)" : "Card body (max 160 chars)"} value={card.body} maxLength={160} onChange={(e) => updateCard(ci, "body", e.target.value)} />
                <Input dir="ltr" placeholder={isRtl ? "رابط الصورة" : "Image URL"} value={card.media} onChange={(e) => updateCard(ci, "media", e.target.value)} />
                <p className="text-xs text-muted-foreground">{isRtl ? "أزرار (1-2 لكل بطاقة):" : "Buttons (1-2 per card):"}</p>
                {card.actions.map((a, ai) => (
                  <div key={ai} className="flex gap-2 items-center">
                    <Select value={a.type} onValueChange={(v) => updateCardAction(ci, ai, "type", v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">{isRtl ? "رد سريع" : "Quick Reply"}</SelectItem>
                        <SelectItem value="URL">URL</SelectItem>
                        <SelectItem value="PHONE_NUMBER">{isRtl ? "هاتف" : "Phone"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input dir={dir} placeholder={isRtl ? "عنوان" : "Title"} value={a.title} maxLength={25} onChange={(e) => updateCardAction(ci, ai, "title", e.target.value)} />
                    {a.type === "URL" && (
                      <Input dir="ltr" placeholder="URL" value={a.url || ""} onChange={(e) => updateCardAction(ci, ai, "url", e.target.value)} />
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

      {/* CATALOG */}
      {templateType === "twilio/catalog" && (
        <div className="space-y-3">
          <div>
            <Label>{isRtl ? "معرّف الكتالوج (من Meta Commerce Manager)" : "Catalog ID (from Meta Commerce Manager)"}</Label>
            <Input dir="ltr" value={catalogId} onChange={(e) => setCatalogId(e.target.value)} placeholder="e.g. 1017234312776586" />
          </div>
          <div>
            <Label>{isRtl ? "عنوان الكتالوج" : "Catalog Title"}</Label>
            <Input dir={dir} value={catalogTitle} onChange={(e) => setCatalogTitle(e.target.value)} placeholder={isRtl ? "عنوان (حد 60 حرف)" : "Title (max 60 chars)"} maxLength={60} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{isRtl ? "عناصر الكتالوج" : "Catalog Items"}</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setCatalogItems((p) => [...p, { id: "", section_title: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> {isRtl ? "عنصر" : "Item"}
            </Button>
          </div>
          {catalogItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input dir="ltr" placeholder={isRtl ? "معرّف المنتج" : "Product ID"} value={item.id} onChange={(e) => setCatalogItems((p) => p.map((it, i) => (i === idx ? { ...it, id: e.target.value } : it)))} />
              <Input dir={dir} placeholder={isRtl ? "عنوان القسم" : "Section title"} value={item.section_title} onChange={(e) => setCatalogItems((p) => p.map((it, i) => (i === idx ? { ...it, section_title: e.target.value } : it)))} />
              <Button variant="ghost" size="sm" onClick={() => setCatalogItems((p) => p.filter((_, i) => i !== idx))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Submit button */}
      <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("campaigns.templateApproval.submitting")}
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            {t("campaigns.templateApproval.submit")} — {typeLabel(templateType)}
          </>
        )}
      </Button>
    </div>
  )
}

// ─── Contacts Tab ────────────────────────────────────────

function ContactsTab({
  contacts,
  t,
  dir,
  isRtl,
}: {
  contacts: Contact[]
  t: (key: string) => string
  dir: string
  isRtl: boolean
}) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return contacts
    const q = search.toLowerCase()
    return contacts.filter(
      (c) =>
        c.customerWa.includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q))
    )
  }, [contacts, search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("campaigns.contacts.total").replace("{count}", String(contacts.length))}
        </p>
        <div className="relative w-64">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
          <Input
            dir={dir}
            placeholder={t("campaigns.contacts.search")}
            className={cn(isRtl ? "pr-10" : "pl-10")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("campaigns.contacts.phone")}</TableHead>
              <TableHead>{t("campaigns.contacts.name")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.customerWa}>
                <TableCell className="font-mono text-sm">{c.customerWa}</TableCell>
                <TableCell>{c.customerName || "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {t("campaigns.contacts.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
