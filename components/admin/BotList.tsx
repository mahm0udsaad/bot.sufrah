"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface Bot {
  id: string
  name: string
  restaurantName: string
  whatsappNumber: string
  accountSid: string
  senderSid?: string | null
  wabaId?: string | null
  status: "PENDING" | "ACTIVE" | "FAILED" | "VERIFYING"
  isActive: boolean
  maxMessagesPerMin: number
  maxMessagesPerDay: number
  supportContact?: string | null
  paymentLink?: string | null
  createdAt: string
  updatedAt: string
}

interface BotListProps {
  bots: Bot[]
  onEdit: (bot: Bot) => void
  onDelete: (bot: Bot) => void
  onRegister: () => void
  loading?: boolean
}

export function BotList({ bots, onEdit, onDelete, onRegister, loading }: BotListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getStatusColor = (status: Bot["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "FAILED":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      case "VERIFYING":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20"
    }
  }

  const getStatusText = (status: Bot["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "نشط"
      case "PENDING":
        return "قيد الانتظار"
      case "FAILED":
        return "فاشل"
      case "VERIFYING":
        return "قيد التحقق"
      default:
        return status
    }
  }

  const handleDelete = async (bot: Bot) => {
    if (!confirm("هل أنت متأكد من حذف هذا البوت؟ سيتم حذف جميع المحادثات والرسائل المرتبطة به.")) {
      return
    }

    setDeletingId(bot.id)
    try {
      await onDelete(bot)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">إدارة البوتات</h2>
          <p className="text-muted-foreground">إدارة أرقام الواتساب المسجلة في النظام</p>
        </div>
        <Button onClick={onRegister} className="gap-2">
          <Plus className="h-4 w-4" />
          تسجيل بوت جديد
        </Button>
      </div>

      {bots.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لا توجد بوتات مسجلة. قم بتسجيل أول بوت الآن!</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{bot.restaurantName}</CardTitle>
                    <CardDescription className="mt-1">{bot.name}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(bot.status)} variant="outline">
                    {getStatusText(bot.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">رقم الواتساب</p>
                  <p className="font-medium direction-ltr text-left">{bot.whatsappNumber}</p>
                </div>

                {bot.senderSid && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Sender SID</p>
                    <p className="text-xs font-mono direction-ltr text-left break-all">{bot.senderSid}</p>
                  </div>
                )}

                {bot.wabaId && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">WABA ID</p>
                    <p className="text-xs font-mono direction-ltr text-left">{bot.wabaId}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">الحد الأقصى/دقيقة</p>
                    <p className="text-sm font-medium">{bot.maxMessagesPerMin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الحد الأقصى/يوم</p>
                    <p className="text-sm font-medium">{bot.maxMessagesPerDay}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => onEdit(bot)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Pencil className="h-3 w-3" />
                    تعديل
                  </Button>
                  <Button
                    onClick={() => handleDelete(bot)}
                    variant="destructive"
                    size="sm"
                    className="flex-1 gap-2"
                    disabled={deletingId === bot.id}
                  >
                    {deletingId === bot.id ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
