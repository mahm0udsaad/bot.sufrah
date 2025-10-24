"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Store, MapPin, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useCatalog } from "@/hooks/use-dashboard-api"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function CatalogView() {
  const { t, locale, dir } = useI18n()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { categories, branches, items, syncStatus, loading, itemsLoading, error } = useCatalog(
    locale as 'en' | 'ar', 
    selectedCategory || undefined
  )
  const isRtl = dir === "rtl"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{t("catalog.error") || "Failed to load catalog"}</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedCategoryData = selectedCategory 
    ? categories.find(c => c.id === selectedCategory) 
    : categories[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("catalog.header.title") || "Menu Catalog"}</h1>
        <p className="text-muted-foreground">{t("catalog.header.subtitle") || "Browse your menu and branches"}</p>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {syncStatus.status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : syncStatus.status === 'failed' ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {syncStatus.status === 'success' 
                      ? t("catalog.sync.success") || "Synced successfully"
                      : syncStatus.status === 'failed'
                      ? t("catalog.sync.failed") || "Sync failed"
                      : t("catalog.sync.inProgress") || "Syncing..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("catalog.sync.lastSync") || "Last sync:"} {new Date(syncStatus.lastSyncAt).toLocaleString(locale)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{syncStatus.itemsSynced} {t("catalog.sync.items") || "items"}</p>
                {syncStatus.errors && syncStatus.errors.length > 0 && (
                  <p className="text-xs text-red-600">{syncStatus.errors.length} {t("catalog.sync.errors") || "errors"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("catalog.stats.categories") || "Categories"}</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <Store className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("catalog.stats.branches") || "Branches"}</p>
                <p className="text-2xl font-bold">{branches.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("catalog.stats.active") || "Active Branches"}</p>
                <p className="text-2xl font-bold">{branches.filter(b => b.isActive).length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t("catalog.categories.title") || "Categories"}</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("catalog.categories.empty") || "No categories found"}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className="shrink-0"
              >
                {t("catalog.categories.all") || "All Items"}
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  className="shrink-0"
                >
                  {category.name}
                  <Badge variant="secondary" className={cn("ml-2")}>
                    {category.itemCount}
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("catalog.items.title") || "Menu Items"}</CardTitle>
            <Badge variant="secondary">
              {items.length} {t("catalog.items.total") || "items"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("catalog.items.empty") || "No items found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  {item.imageUrl && (
                    <div className="relative w-full h-48 bg-gray-100">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold line-clamp-2">{item.name}</h3>
                        {!item.isAvailable && (
                          <Badge variant="destructive" className="shrink-0">
                            {t("catalog.items.unavailable") || "Unavailable"}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-lg font-bold text-primary">
                          {item.priceFormatted}
                        </span>
                        {item.calories && (
                          <span className="text-xs text-muted-foreground">
                            {item.calories} {t("catalog.items.cal") || "cal"}
                          </span>
                        )}
                      </div>
                      {item.preparationTime && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{item.preparationTime} {t("catalog.items.min") || "min"}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branches */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("catalog.branches.title") || "Branches"}</CardTitle>
            <Badge variant="secondary">
              {branches.length} {t("catalog.branches.total") || "total"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("catalog.branches.empty") || "No branches found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <Card key={branch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{branch.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{branch.address}</p>
                      </div>
                      {branch.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t("catalog.branches.active") || "Active"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t("catalog.branches.inactive") || "Inactive"}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

