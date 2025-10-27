"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Braces,
} from "lucide-react"
import { useTemplates, type TemplateCategory, type TemplateStatus } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const statusColors: Record<TemplateStatus, string> = {
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusIcons: Record<TemplateStatus, any> = {
  APPROVED: CheckCircle2,
  PENDING: Clock,
  REJECTED: XCircle,
}

export default function TemplatesPage() {
  const { t, dir, locale } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "ALL">("ALL")
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatus | "ALL">("ALL")
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [formError, setFormError] = useState("")
  const isRtl = dir === "rtl"

  const effectiveLimit = useMemo(() => Math.min(Math.max(limit, 1), 200), [limit])
  const safeOffset = useMemo(() => Math.max(offset, 0), [offset])

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "" as TemplateCategory,
    body_text: "",
    footer_text: "",
    language: locale === 'ar' ? 'ar' : 'en',
  })

  // Fetch templates with the new API
  const {
    data: templatesData,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch,
  } = useTemplates({
    status: selectedStatus === "ALL" ? undefined : selectedStatus,
    category: selectedCategory === "ALL" ? undefined : selectedCategory,
    locale: locale as 'en' | 'ar',
    limit: effectiveLimit,
    offset: safeOffset,
  })

  const templates = templatesData?.templates || []

  const getTemplateBody = (template: any) => template?.bodyText ?? template?.body_text ?? ""
  const getTemplateFooter = (template: any) => template?.footerText ?? template?.footer_text ?? ""
  const formatCategoryLabel = (category: string) =>
    category
      ? category
          .replace(/_/g, " ")
          .split(" ")
          .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
          .join(" ")
      : ""

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category || !formData.body_text) {
      setFormError(t("templates.errors.requiredFields") || "Please fill in all required fields")
      return
    }

    setFormError("")

    const result = await createTemplate({
      name: formData.name,
      category: formData.category,
      language: formData.language,
      body_text: formData.body_text,
      footer_text: formData.footer_text || undefined,
      variables: extractVariables(formData.body_text),
    })

    if (result?.error) {
      setFormError(result.error)
      toast.error(t("templates.errors.createFailed") || "Failed to create template")
    } else {
      toast.success(t("templates.toasts.created") || "Template created successfully")
      setIsCreateDialogOpen(false)
      resetForm()
    }
  }

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return

    setFormError("")

    const result = await updateTemplate(editingTemplate.id, {
      name: formData.name,
      category: formData.category,
      body_text: formData.body_text,
      footer_text: formData.footer_text || undefined,
      variables: extractVariables(formData.body_text),
    })

    if (result?.error) {
      setFormError(result.error)
      toast.error(t("templates.errors.updateFailed") || "Failed to update template")
    } else {
      toast.success(t("templates.toasts.updated") || "Template updated successfully")
      setEditingTemplate(null)
      resetForm()
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(t("templates.actions.confirmDelete", { values: { name: templateName } }) || `Delete ${templateName}?`)) return

    const result = await deleteTemplate(templateId)
    
    if (result?.error) {
      toast.error(t("templates.errors.deleteFailed") || "Failed to delete template")
    } else {
      toast.success(t("templates.toasts.deleted") || "Template deleted successfully")
    }
  }

  const handleCopyTemplate = (template: any) => {
    const content = getTemplateBody(template)

    if (!content) {
      toast.error(t("templates.errors.copyFailed") || "Template body not available")
      return
    }

    navigator.clipboard.writeText(content)
    toast.success(t("templates.toasts.copied") || "Template copied to clipboard")
  }

  const handleEditClick = (template: any) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      body_text: getTemplateBody(template),
      footer_text: getTemplateFooter(template),
      language: template.language,
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "" as TemplateCategory,
      body_text: "",
      footer_text: "",
      language: locale === 'ar' ? 'ar' : 'en',
    })
    setFormError("")
  }

  const handleNextPage = () => {
    if (!canGoNext) return
    setOffset((prev) => prev + effectiveLimit)
  }

  const handlePreviousPage = () => {
    if (!canGoPrevious) return
    setOffset((prev) => Math.max(0, prev - effectiveLimit))
  }

  const handlePageSizeChange = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    const clamped = Math.min(Math.max(parsed, 1), 200)
    setLimit(clamped)
    setOffset(0)
  }

  const categories: { value: TemplateCategory; label: string }[] = [
    { value: "MARKETING", label: t("templates.categories.marketing") || "Marketing" },
    { value: "UTILITY", label: t("templates.categories.utility") || "Utility" },
    { value: "AUTHENTICATION", label: t("templates.categories.authentication") || "Authentication" },
    { value: "ORDER_STATUS", label: t("templates.categories.orderStatus") || "Order Status" },
    { value: "ORDER_UPDATE", label: t("templates.categories.orderUpdate") || "Order Update" },
  ]

  const statusOptions: { value: TemplateStatus; label: string }[] = [
    { value: "APPROVED", label: t("templates.status.approved") || "Approved" },
    { value: "PENDING", label: t("templates.status.pending") || "Pending" },
    { value: "REJECTED", label: t("templates.status.rejected") || "Rejected" },
  ]

  const dynamicCategoryOptions = useMemo(() => {
    const known = new Set(categories.map((category) => category.value))
    const dynamic = new Set<string>()

    templates.forEach((template) => {
      if (!known.has(template.category)) {
        dynamic.add(template.category)
      }
    })

    return Array.from(dynamic).map((value) => ({
      value,
      label: formatCategoryLabel(value),
    }))
  }, [categories, templates])

  const categoryFilterOptions: { value: TemplateCategory | "ALL"; label: string }[] = useMemo(
    () => [
      { value: "ALL", label: t("templates.filters.allCategories") || "All Categories" },
      ...categories,
      ...dynamicCategoryOptions,
    ],
    [categories, dynamicCategoryOptions, t],
  )

  const statusFilterOptions: { value: TemplateStatus | "ALL"; label: string }[] = useMemo(
    () => [
      { value: "ALL", label: t("templates.filters.allStatuses") || "All Statuses" },
      ...statusOptions,
    ],
    [statusOptions, t],
  )

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map((match) => match.slice(2, -2).trim()) : []
  }

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return templates

    return templates.filter((template) => {
      const bodyText = getTemplateBody(template).toLowerCase()
      const templateSid = (template.templateSid || "").toLowerCase()

      return (
        template.name.toLowerCase().includes(query) ||
        bodyText.includes(query) ||
        templateSid.includes(query)
      )
    })
  }, [templates, searchQuery])

  const visibleCount = filteredTemplates.length

  const pagination = templatesData?.pagination

  const stats = useMemo(() => ({
    total: pagination?.total ?? templates.length,
    approved: templates.filter((t) => t.status === "APPROVED").length,
    pending: templates.filter((t) => t.status === "PENDING").length,
    rejected: templates.filter((t) => t.status === "REJECTED").length,
  }), [pagination, templates])

  const totalTemplatesCount = pagination?.total ?? 0
  const totalPages = totalTemplatesCount > 0 ? Math.ceil(totalTemplatesCount / effectiveLimit) : 1
  const currentPage = Math.floor(safeOffset / effectiveLimit) + 1
  const canGoPrevious = safeOffset > 0
  const canGoNext = pagination ? pagination.hasMore || safeOffset + effectiveLimit < pagination.total : false
  const isInitialLoad = loading && templates.length === 0

  useEffect(() => {
    const total = pagination?.total

    if (total === undefined || total === null) {
      return
    }

    if (total === 0 && offset !== 0) {
      setOffset(0)
      return
    }

    if (total > 0 && offset >= total) {
      const maxOffset = Math.max(0, Math.floor((total - 1) / effectiveLimit) * effectiveLimit)
      if (offset !== maxOffset) {
        setOffset(maxOffset)
      }
    }
  }, [pagination?.total, offset, effectiveLimit])

  useEffect(() => {
    if (!error) return
    toast.error(error, { id: "templates-fetch-error" })
  }, [error])

  if (isInitialLoad) {
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("templates.header.title") || "Message Templates"}</h1>
              <p className="text-muted-foreground">{t("templates.header.subtitle") || "Manage WhatsApp message templates"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin", isRtl ? "ml-2" : "mr-2")} />
                {t("templates.actions.refresh") || "Refresh"}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
                    {t("templates.actions.create") || "Create Template"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("templates.form.dialogTitle") || "Create New Template"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    {formError && (
                      <Alert variant="destructive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="template-name">{t("templates.form.name.label") || "Template Name"}</Label>
                        <Input
                          id="template-name"
                          dir={dir}
                          placeholder={t("templates.form.name.placeholder") || "e.g., Welcome Message"}
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">{t("templates.form.category.label") || "Category"}</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as TemplateCategory }))}
                        >
                          <SelectTrigger dir={dir}>
                            <SelectValue placeholder={t("templates.form.category.placeholder") || "Select category"} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="content">{t("templates.form.body.label") || "Message Content"}</Label>
                      <Textarea
                        id="content"
                        dir={dir}
                        placeholder={t("templates.form.body.placeholder") || "Enter your message template..."}
                        className="min-h-32"
                        value={formData.body_text}
                        onChange={(e) => setFormData((prev) => ({ ...prev, body_text: e.target.value }))}
                        required
                      />
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("templates.form.body.helper") || "Use {{variable}} for dynamic content"}
                      </p>
                      {formData.body_text && extractVariables(formData.body_text).length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">{t("templates.form.variables.title") || "Variables found:"}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {extractVariables(formData.body_text).map((variable, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="footer">{t("templates.form.footer.label") || "Footer (Optional)"}</Label>
                      <Input
                        id="footer"
                        dir={dir}
                        placeholder={t("templates.form.footer.placeholder") || "e.g., © Your Restaurant 2024"}
                        value={formData.footer_text}
                        onChange={(e) => setFormData((prev) => ({ ...prev, footer_text: e.target.value }))}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false)
                          resetForm()
                        }}
                      >
                        {t("templates.actions.cancel") || "Cancel"}
                      </Button>
                      <Button type="submit">
                        {t("templates.actions.submit") || "Create Template"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("templates.stats.total") || "Total Templates"}</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("templates.stats.approved") || "Approved"}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("templates.stats.pending") || "Pending"}</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("templates.stats.rejected") || "Rejected"}</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search
                  className={cn(
                    "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                    isRtl ? "right-3" : "left-3",
                  )}
                />
                <Input
                  dir={dir}
                  placeholder={t("templates.filters.searchPlaceholder") || "Search templates..."}
                  className={cn(isRtl ? "pr-10 pl-3 text-right" : "pl-10")}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setOffset(0)
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("templates.filters.pageSize") || "Per page"}
                </span>
                <Select value={String(effectiveLimit)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-24" dir={dir}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100, 200].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {t("templates.filters.categoryLabel") || "Category"}
              </span>
              <div className="flex flex-wrap gap-2">
                {categoryFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={selectedCategory === option.value ? "default" : "outline"}
                    onClick={() => {
                      if (selectedCategory === option.value) return
                      setSelectedCategory(option.value as TemplateCategory | "ALL")
                      setOffset(0)
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {t("templates.filters.statusLabel") || "Status"}
              </span>
              <div className="flex flex-wrap gap-2">
                {statusFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={selectedStatus === option.value ? "default" : "outline"}
                    onClick={() => {
                      if (selectedStatus === option.value) return
                      setSelectedStatus(option.value as TemplateStatus | "ALL")
                      setOffset(0)
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Templates Table */}
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("templates.table.name") || "Template"}</TableHead>
                  <TableHead>{t("templates.table.status") || "Status"}</TableHead>
                  <TableHead>{t("templates.table.language") || "Language"}</TableHead>
                  <TableHead>{t("templates.table.category") || "Category"}</TableHead>
                  <TableHead className="text-right">{t("templates.table.usage") || "Usage"}</TableHead>
                  <TableHead>{t("templates.table.lastUsed") || "Last used"}</TableHead>
                  <TableHead>{t("templates.table.variables") || "Variables"}</TableHead>
                  <TableHead className="text-right">{t("templates.table.actions") || "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => {
                  const StatusIcon = statusIcons[template.status] || CheckCircle2
                  const variables = template.variables || []
                  const hasVariables = template.hasVariables || variables.length > 0
                  const statusBadgeClass = statusColors[template.status] || "bg-muted text-foreground"

                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{template.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {template.templateSid || t("templates.table.notProvisioned") || "Not provisioned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass}>
                          <StatusIcon className={cn("h-3 w-3", isRtl ? "ml-1" : "mr-1")} />
                          {template.statusDisplay || template.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="uppercase">{template.language}</TableCell>
                      <TableCell>{formatCategoryLabel(template.category)}</TableCell>
                      <TableCell className="text-right">{template.usageCount ?? 0}</TableCell>
                      <TableCell>
                        {template.lastUsedRelative || t("templates.table.never") || "Never"}
                      </TableCell>
                      <TableCell>
                        {hasVariables ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Braces className="h-3 w-3" />
                            {t("templates.table.hasVariables") || "Has variables"}
                            {variables.length > 0 && <span>({variables.length})</span>}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyTemplate(template)}
                            aria-label={t("templates.actions.copy") || "Copy"}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(template)}
                            aria-label={t("templates.actions.edit") || "Edit"}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            aria-label={t("templates.actions.delete") || "Delete"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {!loading && filteredTemplates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <MessageSquare className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{t("templates.empty.title") || "No templates yet"}</p>
                          <p className="text-sm text-muted-foreground">
                            {searchQuery || selectedCategory !== "ALL" || selectedStatus !== "ALL"
                              ? t("templates.empty.searchMessage") || "Try adjusting your filters"
                              : t("templates.empty.defaultMessage") || "Create your first template to get started"}
                          </p>
                        </div>
                        {!searchQuery && selectedCategory === "ALL" && selectedStatus === "ALL" && (
                          <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
                            {t("templates.actions.create") || "Create Template"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {loading && !isInitialLoad && (
                  Array.from({ length: Math.min(5, effectiveLimit) }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {totalTemplatesCount > 0
                ?
                    t("templates.table.resultsSummary", {
                      values: {
                        total: totalTemplatesCount,
                        visible: visibleCount,
                        page: currentPage,
                        pages: totalPages,
                      },
                    }) || `Showing ${visibleCount} of ${totalTemplatesCount} templates`
                : t("templates.table.noResults") || "No templates to display"}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(event) => {
                      event.preventDefault()
                      if (!canGoPrevious) return
                      handlePreviousPage()
                    }}
                    aria-disabled={!canGoPrevious}
                    className={!canGoPrevious ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm font-medium text-muted-foreground">
                    {t("templates.table.pageLabel", { values: { page: currentPage, pages: totalPages } }) || `Page ${currentPage} of ${totalPages}`}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={(event) => {
                      event.preventDefault()
                      if (!canGoNext) return
                      handleNextPage()
                    }}
                    aria-disabled={!canGoNext}
                    className={!canGoNext ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("templates.form.editTitle") || "Edit Template"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTemplate} className="space-y-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">{t("templates.form.name.label") || "Template Name"}</Label>
                  <Input
                    id="edit-name"
                    dir={dir}
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">{t("templates.form.category.label") || "Category"}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as TemplateCategory }))}
                  >
                    <SelectTrigger dir={dir}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-content">{t("templates.form.body.label") || "Message Content"}</Label>
                <Textarea
                  id="edit-content"
                  dir={dir}
                  className="min-h-32"
                  value={formData.body_text}
                  onChange={(e) => setFormData((prev) => ({ ...prev, body_text: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-footer">{t("templates.form.footer.label") || "Footer (Optional)"}</Label>
                <Input
                  id="edit-footer"
                  dir={dir}
                  value={formData.footer_text}
                  onChange={(e) => setFormData((prev) => ({ ...prev, footer_text: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null)
                    resetForm()
                  }}
                >
                  {t("templates.actions.cancel") || "Cancel"}
                </Button>
                <Button type="submit">
                  {t("templates.actions.save") || "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AuthGuard>
  )
}
