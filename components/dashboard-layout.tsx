"use client"

import type React from "react"

import { useMemo, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Menu, Search, Settings, Store, MessageSquare, Package, BarChart3, FileText, X, Bot, ScrollText, Shield, Star, ChevronLeft, ChevronRight, Megaphone, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SignOutButton } from "@/components/sign-out-button"
import { NotificationsSheet } from "@/components/notifications-sheet"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useI18n } from "@/hooks/use-i18n"
import { RealtimeProvider } from "@/contexts/realtime-context"
import { useProfile } from "@/hooks/use-dashboard-api"

const NAV_ITEMS = [
  { labelKey: "navigation.dashboard", href: "/", icon: BarChart3 },
  { labelKey: "navigation.chats", href: "/chats", icon: MessageSquare },
  { labelKey: "navigation.orders", href: "/orders", icon: Package },
  { labelKey: "navigation.ratings", href: "/ratings", icon: Star },
  { labelKey: "navigation.catalog", href: "/catalog", icon: Store },
  { labelKey: "navigation.botManagement", href: "/bot-management", icon: Bot },
  { labelKey: "navigation.campaigns", href: "/campaigns", icon: Megaphone },
  { labelKey: "navigation.usage", href: "/usage", icon: BarChart3 },
]

const ADMIN_NAV_ITEMS = [
  { labelKey: "navigation.adminBots", href: "/admin/bots", icon: Shield },
  { labelKey: "navigation.adminUsage", href: "/admin/usage", icon: BarChart3 },
  { labelKey: "navigation.adminBilling", href: "/admin/billing", icon: DollarSign },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem("sidebarCollapsed") === "true"
    } catch {
      return false
    }
  })
  const { user } = useAuth()
  const { t, dir } = useI18n()
  const restaurantName = user?.restaurant?.name || t("common.brand.defaultName")
  const pathname = usePathname()
  const isRtl = dir === "rtl"
  const { data: profile } = useProfile()
  const brandImage = profile?.logoUrl || profile?.sloganPhoto || null
  
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed))
    } catch {
      // ignore
    }
  }, [sidebarCollapsed])
  
  // Check if current page needs full height (no padding)
  const isFullHeightPage = pathname === "/chats"
  
  // Check if user is admin - adjust this to include your admin users
  const isAdmin = true // Temporarily allow all logged-in users for testing
  // TODO: Update this with proper admin check:
  // const isAdmin = user?.email?.includes('admin') || user?.phone_number === '+966500000000'
console.log(brandImage)
  const navigation = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(`${item.href}/`)) ||
          (item.href === "/" && pathname === item.href)
        return { ...item, isActive, label: t(item.labelKey) }
      }),
    [pathname, t],
  )

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div
            className={cn(
              "fixed top-0 h-full w-64 bg-sidebar",
              isRtl ? "right-0 border-l border-sidebar-border" : "left-0 border-r border-sidebar-border",
            )}
          >
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
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1",
                    item.isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4 bg-sidebar">
              <SignOutButton variant="ghost" size="sm" className="w-full justify-start" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-[width] duration-300",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64",
          isRtl ? "lg:right-0" : "lg:left-0",
        )}
      >
        <div
          className={cn(
            "flex grow flex-col gap-y-5 overflow-y-auto bg-sidebar py-4",
            sidebarCollapsed ? "px-2" : "px-6",
            isRtl ? "border-l border-sidebar-border" : "border-r border-sidebar-border",
          )}
        >
          <div className={cn("flex h-16 shrink-0 items-center gap-2", sidebarCollapsed && "justify-center")}> 
            {brandImage ? (
              <img
                src={brandImage}
                alt={restaurantName || "Restaurant"}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
            )}
            <span className={cn("font-semibold text-sidebar-foreground", sidebarCollapsed && "hidden")}>{restaurantName}</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      sidebarCollapsed && "justify-center",
                      item.isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={cn(sidebarCollapsed && "hidden")}>{item.label}</span>
                  </a>
                </li>
              ))}
              
            </ul>
          </nav>
          <div className="mt-auto border-t border-sidebar-border pt-4">
            {!sidebarCollapsed && (
              <SignOutButton variant="ghost" size="sm" className="w-full justify-start" />
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(isRtl ? (sidebarCollapsed ? "lg:pr-20" : "lg:pr-64") : (sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"))}> 
        {/* Top bar */}
        <div
          className={cn(
            "sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8",
            isRtl ? "border-b border-border" : "border-b border-border",
          )}
        >
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {isRtl ? (
              sidebarCollapsed ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )
            ) : (
              sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )
            )}
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
                <Search
                  className={cn(
                    "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                    isRtl ? "right-3" : "left-3",
                  )}
                />
                <Input
                  dir={dir}
                  placeholder={t("navigation.searchPlaceholder")}
                  className={cn("w-64", isRtl ? "pr-10 pl-3 text-right" : "pl-10")}
                />
              </div>
              <LocaleSwitcher />
              <NotificationsSheet />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className={cn(
          isFullHeightPage 
            ? "h-[calc(100vh-4rem)]" 
            : "py-6"
        )}>
          <div className={cn(
            isFullHeightPage 
              ? "h-full" 
              : "px-4 sm:px-6 lg:px-8"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
    </RealtimeProvider>
  )
}
