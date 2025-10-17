"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardDescription } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, Eye, Shield, Clock, Building2, Lock } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface PendingRestaurant {
  id: string
  restaurantId: string
  name: string
  restaurantName: string
  whatsappNumber: string
  accountSid: string
  subaccountSid?: string
  status: string
  createdAt: string
  errorMessage?: string
  restaurant?: {
    id: string
    name: string
    phone?: string
    address?: string
    user?: {
      id: string
      name?: string
      phone?: string
      phone_number?: string
      email?: string
    }
  }
}

const STATUS_STYLES: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "في الانتظار", badge: "bg-yellow-100 text-yellow-800" },
  VERIFYING: { label: "جاري التحقق", badge: "bg-blue-100 text-blue-800" },
  ACTIVE: { label: "نشط", badge: "bg-green-100 text-green-800" },
  FAILED: { label: "فشل", badge: "bg-red-100 text-red-800" },
}

export default function AdminPage() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<PendingRestaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<PendingRestaurant | null>(null)
  
  // Password authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [verifying, setVerifying] = useState(false)

  // Check if user is admin - adjust this to include your admin users
  const isAdmin = true // Temporarily allow all logged-in users for testing
  // TODO: Update this with proper admin check:
  // const isAdmin = user?.email?.includes('admin') || user?.phone_number === '+966500000000'

  const fetchPendingRestaurants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/restaurants?status=PENDING_APPROVAL')
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending restaurants')
      }

      const data = await response.json()
      if (data.success) {
        setRestaurants(data.restaurants || [])
      }
    } catch (error) {
      console.error('Failed to load pending restaurants:', error)
      toast.error('Failed to load pending restaurants')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (restaurantId: string) => {
    try {
      setActioningId(restaurantId)
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve restaurant')
      }

      const data = await response.json()
      if (data.success) {
        toast.success('Restaurant approved successfully')
        setRestaurants(prev => prev.filter(r => r.id !== restaurantId))
      } else {
        throw new Error(data.message || 'Approval failed')
      }
    } catch (error) {
      console.error('Failed to approve restaurant:', error)
      toast.error('Failed to approve restaurant')
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (restaurantId: string) => {
    try {
      setActioningId(restaurantId)
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/reject`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to reject restaurant')
      }

      const data = await response.json()
      if (data.success) {
        toast.success('Restaurant rejected')
        setRestaurants(prev => prev.filter(r => r.id !== restaurantId))
      } else {
        throw new Error(data.message || 'Rejection failed')
      }
    } catch (error) {
      console.error('Failed to reject restaurant:', error)
      toast.error('Failed to reject restaurant')
    } finally {
      setActioningId(null)
    }
  }

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

  useEffect(() => {
    if (user && isAdmin && isAuthenticated) {
      fetchPendingRestaurants()
    }
  }, [user, isAdmin, isAuthenticated])

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
                <CardTitle className="text-2xl">لوحة التحكم الإدارية</CardTitle>
                <CardDescription>
                  الرجاء إدخال كلمة مرور الإدارة للوصول إلى البيانات
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

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
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
              <h1 className="text-2xl font-bold text-foreground">لوحة التحكم الإدارية</h1>
              <p className="text-muted-foreground">إدارة طلبات تسجيل المطاعم</p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">صلاحيات الإدارة</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الطلبات المعلقة</p>
                    <p className="text-2xl font-bold">{restaurants.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">المطاعم النشطة</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>طلبات الموافقة على المطاعم</CardTitle>
              <p className="text-sm text-muted-foreground">
                مراجعة والموافقة على طلبات تسجيل المطاعم
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {restaurants.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد طلبات معلقة</p>
                  <p className="text-sm">تم معالجة جميع طلبات المطاعم</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المطعم</TableHead>
                      <TableHead className="text-right">المالك</TableHead>
                      <TableHead className="text-right">رقم واتساب</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">تاريخ التقديم</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restaurants.map((restaurant) => {
                      const statusKey = restaurant.status.toUpperCase()
                      const statusMeta = STATUS_STYLES[statusKey] || STATUS_STYLES.PENDING

                      return (
                        <TableRow key={restaurant.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{restaurant.restaurantName || restaurant.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {restaurant.id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {restaurant.restaurant?.user?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {restaurant.restaurant?.user?.phone_number || restaurant.restaurant?.user?.phone}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{restaurant.whatsappNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(restaurant.createdAt).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setSelectedRestaurant(restaurant)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>تفاصيل المطعم</DialogTitle>
                                  </DialogHeader>
                                  {selectedRestaurant && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="font-medium text-muted-foreground">اسم المطعم</p>
                                          <p>{selectedRestaurant.restaurantName}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium text-muted-foreground">رقم واتساب</p>
                                          <p className="font-mono">{selectedRestaurant.whatsappNumber}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium text-muted-foreground">Twilio Account SID</p>
                                          <p className="font-mono text-xs">{selectedRestaurant.accountSid}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium text-muted-foreground">Subaccount SID</p>
                                          <p className="font-mono text-xs">{selectedRestaurant.subaccountSid || 'غير محدد'}</p>
                                        </div>
                                      </div>
                                      {selectedRestaurant.errorMessage && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                          <p className="text-sm text-red-700">{selectedRestaurant.errorMessage}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={actioningId === restaurant.id}
                                  >
                                    {actioningId === restaurant.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 ml-1" />
                                    )}
                                    موافقة
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>الموافقة على المطعم</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من الموافقة على "{restaurant.restaurantName}"؟ 
                                      سيتم تفعيل خدمة البوت على واتساب.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleApprove(restaurant.id)}>
                                      موافقة
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    disabled={actioningId === restaurant.id}
                                  >
                                    {actioningId === restaurant.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4 ml-1" />
                                    )}
                                    رفض
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>رفض المطعم</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من رفض "{restaurant.restaurantName}"؟ 
                                      لا يمكن التراجع عن هذا الإجراء.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleReject(restaurant.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      رفض
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
