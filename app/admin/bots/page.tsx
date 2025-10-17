"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, listBots, createBot, updateBot, deleteBot, CreateBotRequest } from "@/lib/admin-bot-api"
import { BotList } from "@/components/admin/BotList"
import { BotForm } from "@/components/admin/BotForm"
import { Plus, Shield, Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

export default function AdminBotsPage() {
  const { user } = useAuth()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  
  // Password authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [verifying, setVerifying] = useState(false)

  // Check if user is admin - adjust this to include your admin users
  const isAdmin = true // Temporarily allow all logged-in users for testing
  // TODO: Update this with proper admin check:
  // const isAdmin = user?.email?.includes('admin') || user?.phone_number === '+966500000000'

  const loadBots = async () => {
    try {
      setLoading(true)
      const data = await listBots()
      setBots(data)
    } catch (error) {
      console.error('Failed to load bots:', error)
      toast.error('فشل في تحميل قائمة البوتات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin && isAuthenticated) {
      loadBots()
    }
  }, [user, isAdmin, isAuthenticated])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)

    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.success) {
        // Store password in session for API authentication
        sessionStorage.setItem('admin_password', password)
        setIsAuthenticated(true)
        toast.success('تم تسجيل الدخول بنجاح')
      } else {
        toast.error(data.error || 'كلمة المرور غير صحيحة')
        setPassword("")
      }
    } catch (error) {
      console.error('Failed to verify password:', error)
      toast.error('خطأ في التحقق من كلمة المرور')
    } finally {
      setVerifying(false)
    }
  }

  const handleCreateBot = async (data: CreateBotRequest) => {
    try {
      await createBot(data)
      toast.success('تم تسجيل البوت بنجاح')
      setShowForm(false)
      await loadBots()
    } catch (error) {
      throw error // Let the form handle the error
    }
  }

  const handleUpdateBot = async (data: CreateBotRequest) => {
    if (!editingBot) return

    try {
      await updateBot(editingBot.id, data)
      toast.success('تم تحديث البوت بنجاح')
      setShowForm(false)
      setEditingBot(null)
      await loadBots()
    } catch (error) {
      throw error // Let the form handle the error
    }
  }

  const handleDeleteBot = async (bot: Bot) => {
    try {
      await deleteBot(bot.id)
      toast.success('تم حذف البوت بنجاح')
      await loadBots()
    } catch (error) {
      console.error('Failed to delete bot:', error)
      toast.error('فشل في حذف البوت')
    }
  }

  const handleEditClick = (bot: Bot) => {
    setEditingBot(bot)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingBot(null)
  }

  if (!isAdmin) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">لا يمكن الوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Password protection
  if (!isAuthenticated) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">صفحة الإدارة</CardTitle>
                <CardDescription>
                  الرجاء إدخال كلمة مرور الإدارة للمتابعة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">كلمة المرور</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      disabled={verifying}
                      autoFocus
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={verifying || !password}>
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 ml-2" />
                        تسجيل الدخول
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
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
              <h1 className="text-2xl font-bold text-foreground">إدارة البوتات</h1>
              <p className="text-muted-foreground">
                تسجيل وإدارة بوتات واتساب المرتبطة بـ Twilio
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>صلاحيات الإدارة</span>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 ml-2" />
                تسجيل بوت جديد
              </Button>
            </div>
          </div>

          {/* Bots List */}
          <BotList
            bots={bots}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={(bot) => handleDeleteBot(bot)}
            onRegister={() => setShowForm(true)}
          />

          {/* Bot Form Dialog */}
          <Dialog open={showForm} onOpenChange={handleFormClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBot ? "تعديل البوت" : "تسجيل بوت جديد"}
                </DialogTitle>
              </DialogHeader>
              <BotForm
                bot={editingBot || undefined}
                onSubmit={editingBot ? handleUpdateBot : handleCreateBot}
                onCancel={handleFormClose}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

