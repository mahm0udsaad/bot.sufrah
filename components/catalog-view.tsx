"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Loader2, 
  Store, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  LayoutGrid, 
  List, 
  Filter, 
  ArrowRight,
  ChevronRight,
  UtensilsCrossed,
  Info
} from "lucide-react"
import { useCatalog } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export function CatalogView() {
  const { t, locale, dir } = useI18n()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const { categories, branches, items, syncStatus, loading, itemsLoading, error } = useCatalog(
    locale as 'en' | 'ar', 
    selectedCategory || undefined
  )
  const isRtl = dir === "rtl"

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [items, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <UtensilsCrossed className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground animate-pulse font-medium">{t("catalog.loading") || "Loading menu..."}</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-destructive">{t("catalog.error") || "Failed to load catalog"}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">{error}</p>
          <Button variant="outline" className="mt-6 border-destructive/20 hover:bg-destructive/10" onClick={() => window.location.reload()}>
            {t("common.retry") || "Retry"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemAnim = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{t("catalog.header.title") || "Menu Catalog"}</h1>
          <p className="text-muted-foreground mt-1 text-lg">{t("catalog.header.subtitle") || "Browse and manage your digital menu items"}</p>
        </div>
        
        {/* Sync Status Badge-style Card */}
        {syncStatus && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex items-center gap-4 px-5 py-3 rounded-2xl border bg-card shadow-sm transition-all",
              syncStatus.status === 'success' ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-inner",
              syncStatus.status === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            )}>
              {syncStatus.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : syncStatus.status === 'failed' ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">
                {syncStatus.status === 'success' 
                  ? t("catalog.sync.success") || "Synced successfully"
                  : syncStatus.status === 'failed'
                  ? t("catalog.sync.failed") || "Sync failed"
                  : t("catalog.sync.inProgress") || "Syncing..."}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {t("catalog.sync.lastSync") || "Last sync:"} {new Date(syncStatus.lastSyncAt).toLocaleString(locale)}
              </p>
            </div>
            <div className="h-8 w-px bg-border/50 mx-2 hidden sm:block" />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-black">{syncStatus.itemsSynced}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("catalog.sync.items") || "items"}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modern Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t("catalog.stats.categories") || "Categories", value: categories.length, icon: Store, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: t("catalog.stats.branches") || "Branches", value: branches.length, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: t("catalog.stats.active") || "Active Status", value: branches.filter(b => b.isActive).length, icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10", unit: " branches" }
        ].map((stat, i) => (
          <Card key={i} className="overflow-hidden group hover:shadow-md transition-all border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-black">{stat.value}</p>
                  {stat.unit && <span className="text-xs text-muted-foreground font-medium">{stat.unit}</span>}
                </div>
              </div>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-inner", stat.bg)}>
                <stat.icon className={cn("h-7 w-7", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Categories Navigation */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                {t("catalog.categories.title") || "Categories"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    !selectedCategory 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="h-4 w-4" />
                    <span>{t("catalog.categories.all") || "All Items"}</span>
                  </div>
                  <Badge variant={!selectedCategory ? "secondary" : "outline"} className="font-bold">
                    {items.length}
                  </Badge>
                </button>
                
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                      selectedCategory === category.id 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        selectedCategory === category.id ? "bg-white scale-125" : "bg-muted-foreground/30 group-hover:bg-primary"
                      )} />
                      <span className="truncate max-w-[150px]">{category.name}</span>
                    </div>
                    <Badge variant={selectedCategory === category.id ? "secondary" : "outline"} className="font-bold">
                      {category.itemCount}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Branches Section */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {t("catalog.branches.title") || "Branches"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {branches.map((branch) => (
                <div key={branch.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className={cn(
                    "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                    branch.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{branch.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{branch.address}</p>
                    <Badge variant={branch.isActive ? "default" : "secondary"} className="mt-2 text-[10px] py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {branch.isActive ? t("catalog.branches.active") : t("catalog.branches.inactive")}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Menu Items */}
        <div className="lg:col-span-9 space-y-6">
          <Card className="border-border/50 shadow-sm bg-background/50 backdrop-blur-sm sticky top-20 z-10">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={t("catalog.items.searchPlaceholder") || "Search menu items..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-background rounded-xl border-border/60 focus:ring-primary/20 transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border/50">
                  <Button 
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('grid')}
                    className={cn("h-9 w-9 p-0 rounded-lg", viewMode === 'grid' && "bg-background shadow-sm")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('list')}
                    className={cn("h-9 w-9 p-0 rounded-lg", viewMode === 'list' && "bg-background shadow-sm")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {itemsLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-border/50">
                    <Skeleton className="h-48 w-full rounded-none" />
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-6 w-3/4 rounded-md" />
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            ) : filteredItems.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4 text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {searchQuery ? "لم يتم العثور على نتائج" : "لا توجد أصناف في هذا القسم"}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  {searchQuery 
                    ? "جرب البحث بكلمات أخرى أو اختر قسماً مختلفاً من القائمة الجانبية." 
                    : "سيتم عرض أصناف الطعام هنا بمجرد إضافتها إلى القائمة."}
                </p>
                {searchQuery && (
                  <Button variant="link" className="mt-4 text-primary font-bold" onClick={() => setSearchQuery("")}>
                    عرض جميع الأصناف
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key={viewMode}
                variants={container}
                initial="hidden"
                animate="show"
                className={cn(
                  viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
                    : "space-y-4"
                )}
              >
                {filteredItems.map((item) => (
                  <motion.div key={item.id} variants={itemAnim}>
                    <Card className={cn(
                      "overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/50",
                      viewMode === 'list' && "flex md:items-center p-0"
                    )}>
                      {/* Item Image */}
                      <div className={cn(
                        "relative bg-muted overflow-hidden flex-shrink-0",
                        viewMode === 'grid' ? "w-full h-52" : "w-32 h-32 md:w-40 md:h-40"
                      )}>
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <UtensilsCrossed className="h-10 w-10 text-primary/20" />
                          </div>
                        )}
                        
                        {/* Badges on image */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {!item.isAvailable && (
                            <Badge variant="destructive" className="font-bold shadow-lg shadow-destructive/20 border-white/20">
                              {t("catalog.items.unavailable") || "Unavailable"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardContent className={cn(
                        "p-5 flex-1 flex flex-col",
                        viewMode === 'list' && "justify-center"
                      )}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-black text-lg line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                            <span className="text-lg font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">
                              {item.priceFormatted}
                            </span>
                          </div>
                          
                          {(item.description || item.descriptionEn) && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {locale === 'ar' ? (item.description || item.descriptionEn) : (item.descriptionEn || item.description)}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 mt-auto">
                            {item.calories && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                <Info className="h-3 w-3 text-primary" />
                                <span>{item.calories} {t("catalog.items.cal") || "cal"}</span>
                              </div>
                            )}
                            {item.preparationTime && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span>{item.preparationTime} {t("catalog.items.min") || "min"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              item.isAvailable ? "bg-emerald-500" : "bg-red-500"
                            )} />
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                              {item.isAvailable ? "In Stock" : "Out of Stock"}
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-2 text-primary hover:bg-primary/5">
                            Details
                            <ChevronRight className={cn("h-3 w-3", isRtl && "rotate-180")} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

