import { cookies } from "next/headers"
import Image from "next/image"
import Link from "next/link"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { db } from "@/lib/db"
import { getMerchantBranches, getMerchantCategories, getCategoryProducts } from "@/lib/sufrah"
import { getI18nValue, getTranslator } from "@/lib/i18n/server"

async function getContext() {
  const cookieStore = await cookies()
  const userPhone = cookieStore.get("user-phone")?.value
  if (!userPhone) {
    throw new Error("Not authenticated")
  }

  const user = await db.getUserByPhone(userPhone)
  if (!user) {
    throw new Error("User not found")
  }

  const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
  const merchantId = restaurant?.externalMerchantId || ""
  return { merchantId, userId: user.id, restaurant }
}

export default async function CatalogPage({ searchParams }: { searchParams: { category?: string } }) {
  let merchantId = ""
  try {
    const ctx = await getContext()
    merchantId = ctx.merchantId
  } catch {}

  const [categories, branches] = await Promise.all([
    getMerchantCategories(merchantId).catch(() => []),
    getMerchantBranches(merchantId).catch(() => []),
  ])

  const selectedCategoryId = searchParams?.category || categories[0]?.id
  const products = selectedCategoryId ? await getCategoryProducts(selectedCategoryId).catch(() => []) : []
  const [t, { dir, locale }] = await Promise.all([getTranslator("catalog"), getI18nValue()])

  const isRtl = dir === "rtl"
  const localize = (en?: string | null, ar?: string | null, fallback?: string) => {
    const primary = isRtl ? ar : en
    return (primary || en || ar || fallback || "").toString()
  }

  const localizedCategoryName = (category: any) => localize(category.nameEn, category.nameAr, category.id)
  const localizedProductName = (product: any) => localize(product.nameEn, product.nameAr, product.id)
  const localizedProductDescription = (product: any) =>
    localize(product.descriptionEn, product.descriptionAr, t("catalog.products.noDescription"))
  const localizedBranchName = (branch: any) => localize(branch.nameEn, branch.nameAr, branch.id)
  const localizedBranchCity = (branch: any) =>
    localize(branch.city?.nameEn, branch.city?.nameAr, t("catalog.branches.noAddress"))

  const productsCountLabel = t("catalog.products.count", {
    values: { count: products.length.toLocaleString(locale) },
  })
  const branchesCountLabel = t("catalog.branches.count", {
    values: { count: branches.length.toLocaleString(locale) },
  })

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("catalog.header.title")}</h1>
            <p className="mt-1 text-gray-600">{t("catalog.header.subtitle")}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{t("catalog.categories.title")}</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalog?category=${cat.id}`}
                  className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    selectedCategoryId === cat.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {localizedCategoryName(cat)}
                </Link>
              ))}
              {categories.length === 0 && (
                <div className="py-2 text-sm text-gray-500">{t("catalog.categories.empty")}</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t("catalog.products.title")}</h2>
              <span className="text-sm text-gray-500">{productsCountLabel}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
                >
                  {p.avatar || (p.images && p.images[0]) ? (
                    <div className="relative aspect-square bg-gray-200">
                      <Image
                        src={(p.avatar as string) || (p.images?.[0] as string)}
                        alt={localizedProductName(p) || t("catalog.products.fallbackName")}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gray-200">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="p-3.5">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{localizedProductName(p)}</h3>
                    <p className="mt-1 min-h-[2rem] line-clamp-2 text-xs text-gray-600">
                      {localizedProductDescription(p)}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-900">
                        {typeof p.priceAfter === "number" && typeof p.price === "number" && p.priceAfter !== p.price ? (
                          <div className="flex flex-col">
                            <span className="text-indigo-600">${p.priceAfter.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 line-through">${p.price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>{typeof p.price === "number" ? `$${p.price.toFixed(2)}` : "—"}</span>
                        )}
                      </div>
                    </div>
                    {(p.isAvailableToDelivery ||
                      p.isAvailableToReceipt ||
                      p.isAvailableToLocalDemand ||
                      p.isAvailableToOrderFromCar) && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.isAvailableToDelivery && (
                          <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            {t("catalog.badges.delivery")}
                          </span>
                        )}
                        {p.isAvailableToReceipt && (
                          <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                            {t("catalog.badges.pickup")}
                          </span>
                        )}
                        {p.isAvailableToLocalDemand && (
                          <span className="rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                            {t("catalog.badges.dineIn")}
                          </span>
                        )}
                        {p.isAvailableToOrderFromCar && (
                          <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                            {t("catalog.badges.car")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">{t("catalog.products.emptyTitle")}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t("catalog.products.emptySubtitle")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t("catalog.branches.title")}</h2>
              <span className="text-sm text-gray-500">{branchesCountLabel}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                      {b.imageUrl ? (
                        <Image
                          src={b.imageUrl}
                          alt={localizedBranchName(b) || t("catalog.branches.fallbackName")}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{localizedBranchName(b)}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{localizedBranchCity(b)}</p>
                      {b.phoneNumber && (
                        <div className="mt-2 flex items-center text-xs text-gray-600">
                          <svg className="mr-1.5 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {b.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {branches.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">{t("catalog.branches.emptyTitle")}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t("catalog.branches.emptySubtitle")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
