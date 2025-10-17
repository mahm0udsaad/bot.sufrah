"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, Menu, Search, Settings, Store, MessageSquare, Package, BarChart3, FileText, X, Bot, ScrollText, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SignOutButton } from "@/components/sign-out-button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Chats", href: "/chats", icon: MessageSquare },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Catalog", href: "/catalog", icon: Store },
  { name: "Bot Management", href: "/bot-management", icon: Bot },
  { name: "Logs", href: "/logs", icon: ScrollText },
  { name: "Usage & Plan", href: "/usage", icon: BarChart3 },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

const ADMIN_NAV_ITEMS = [
  { name: "Admin Bots", href: "/admin/bots", icon: Shield },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const restaurantName = user?.restaurant?.name || "Sufrah Bot"
  const pathname = usePathname()
  
  // Check if user is admin - adjust this to include your admin users
  const isAdmin = true // Temporarily allow all logged-in users for testing
  // TODO: Update this with proper admin check:
  // const isAdmin = user?.email?.includes('admin') || user?.phone_number === '+966500000000'

  const navigation = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(`${item.href}/`)) ||
          (item.href === "/" && pathname === item.href)
        return { ...item, isActive }
      }),
    [pathname],
  )
  
  const adminNavigation = useMemo(
    () =>
      ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(`${item.href}/`))
        return { ...item, isActive }
      }),
    [pathname],
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">S</span>
                </div>
                <span className="font-semibold text-sidebar-foreground">{restaurantName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="px-4 py-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1",
                    item.isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </a>
              ))}
              
              {isAdmin && (
                <>
                  <div className="my-4 border-t border-sidebar-border" />
                  <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase">
                    Admin
                  </div>
                  {adminNavigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1",
                        item.isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </a>
                  ))}
                </>
              )}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4 bg-sidebar">
              <SignOutButton variant="ghost" size="sm" className="w-full justify-start" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sidebar border-r border-sidebar-border px-6 py-4">
            <div className="flex h-16 shrink-0 items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
              <span className="font-semibold text-sidebar-foreground">{restaurantName}</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      item.isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </a>
                </li>
              ))}
              
              {isAdmin && (
                <>
                  <li className="my-3 border-t border-sidebar-border pt-3">
                    <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase">
                      Admin
                    </div>
                  </li>
                  {adminNavigation.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className={cn(
                          "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          item.isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.name}
                      </a>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </nav>
          <div className="mt-auto border-t border-sidebar-border pt-4">
            <SignOutButton variant="ghost" size="sm" className="w-full justify-start" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4">
              <div className="flex items-center gap-x-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <select className="bg-transparent text-sm font-medium text-foreground border-none outline-none">
                  <option>{restaurantName}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-1 justify-end items-center gap-x-4 lg:gap-x-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10 w-64" />
              </div>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  3
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
