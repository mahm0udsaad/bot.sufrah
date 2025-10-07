import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { getMerchantBranches, getMerchantCategories, getCategoryProducts } from "@/lib/sufrah"
import Image from "next/image"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"

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
  console.log("[v0] Restaurant:", restaurant) // Add debug logging
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

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Catalog</h1>
            <p className="text-gray-600 mt-1">Manage your products, categories, and branches</p>
          </div>

          {/* Categories Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
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
                  {cat.nameEn || cat.nameAr || cat.id}
                </Link>
              ))}
              {categories.length === 0 && (
                <div className="text-sm text-gray-500 py-2">No categories found</div>
              )}
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Products</h2>
              <span className="text-sm text-gray-500">{products.length} items</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <div key={p.id} className="group bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all duration-200">
                  {p.avatar || (p.images && p.images[0]) ? (
                    <div className="relative aspect-square bg-gray-200">
                      <Image
                        src={(p.avatar as string) || (p.images?.[0] as string)}
                        alt={(p.nameEn || p.nameAr || "Product") as string}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-3.5">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {p.nameEn || p.nameAr || p.id}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1 min-h-[2rem]">
                      {p.descriptionEn || p.descriptionAr || "No description"}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-900">
                        {typeof p.priceAfter === "number" && typeof p.price === "number" && p.priceAfter !== p.price ? (
                          <div className="flex flex-col">
                            <span className="text-indigo-600">${p.priceAfter.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 line-through">${p.price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>
                            {typeof p.price === "number" ? `$${p.price.toFixed(2)}` : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                    {(p.isAvailableToDelivery || p.isAvailableToReceipt || p.isAvailableToLocalDemand || p.isAvailableToOrderFromCar) && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {p.isAvailableToDelivery && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-medium">Delivery</span>
                        )}
                        {p.isAvailableToReceipt && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-medium">Pickup</span>
                        )}
                        {p.isAvailableToLocalDemand && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-medium">Dine-in</span>
                        )}
                        {p.isAvailableToOrderFromCar && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md font-medium">Car</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No products available</h3>
                  <p className="mt-1 text-sm text-gray-500">Select a category to view products</p>
                </div>
              )}
            </div>
          </div>

          {/* Branches Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
              <span className="text-sm text-gray-500">{branches.length} locations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-lg bg-white border border-gray-200 overflow-hidden relative flex-shrink-0">
                      {b.imageUrl ? (
                        <Image 
                          src={b.imageUrl} 
                          alt={(b.nameEn || b.nameAr || "Branch") as string} 
                          fill 
                          className="object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {b.nameEn || b.nameAr || b.id}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {b.city?.nameEn || b.city?.nameAr || "No address provided"}
                      </p>
                      {b.phoneNumber && (
                        <div className="mt-2 flex items-center text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {b.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {branches.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No branches available</h3>
                  <p className="mt-1 text-sm text-gray-500">Add your first branch location</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
