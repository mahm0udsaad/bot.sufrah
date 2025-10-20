export type SufrahCategory = {
  id: string
  nameAr?: string
  nameEn?: string
  imageUrl?: string
}

export type SufrahProduct = {
  id: string
  avatar?: string
  nameAr?: string
  nameEn?: string
  descriptionAr?: string
  descriptionEn?: string
  price?: number
  priceAfter?: number
  images?: string[]
  isAvailableToDelivery?: boolean
  isAvailableToReceipt?: boolean
  isAvailableToLocalDemand?: boolean
  isAvailableToOrderFromCar?: boolean
  isPriceIncludingAddons?: boolean
}

export type SufrahBranch = {
  id: string
  nameAr?: string
  nameEn?: string
  city?: {
    id: string
    nameAr?: string
    nameEn?: string
    areas?: Array<{
      id: string
      nameAr?: string
      nameEn?: string
      centerLongitude?: number
      centerLatitude?: number
      radius?: number
    }>
  }
  phoneNumber?: string
  latitude?: string
  longitude?: string
  imageUrl?: string
}

const SUFRAH_BASE_URL = process.env.BASEURL || "https://api.dwv.sufrah.sa"
const SUFRAH_API_TOKEN = `ApiToken ${process.env.APITOKEN}`

function assertConfigured() {
  if (!SUFRAH_API_TOKEN) {
    throw new Error("Sufrah API token is not configured (APITOKEN)")
  }
}

async function request<T>(path: string): Promise<T> {
  assertConfigured()
  const url = `${SUFRAH_BASE_URL}${path}`
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: SUFRAH_API_TOKEN,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Sufrah API ${res.status}: ${body || res.statusText}`)
  }

  // Some endpoints return application/json but labeled as text/plain
  try {
    return (await res.json()) as T
  } catch {
    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error("Invalid response format from Sufrah API")
    }
  }
}

export async function getMerchantCategories(merchantId: string): Promise<SufrahCategory[]> {
  if (!merchantId) throw new Error("Missing merchant id")
  const data = await request<SufrahCategory[] | SufrahCategory>(
    `/api/v1/external/merchants/${merchantId}/categories`
  )
  return Array.isArray(data) ? data : [data]
}

export async function getMerchantBranches(merchantId: string): Promise<SufrahBranch[]> {
  if (!merchantId) throw new Error("Missing merchant id")
  const data = await request<SufrahBranch[] | SufrahBranch>(
    `/api/v1/external/merchants/${merchantId}/branches`
  )
  return Array.isArray(data) ? data : [data]
}

export async function getCategoryProducts(categoryId: string): Promise<SufrahProduct[]> {
  if (!categoryId) throw new Error("Missing category id")
  const data = await request<SufrahProduct[] | SufrahProduct>(
    `/api/v1/external/categories/${categoryId}/products`
  )
  return Array.isArray(data) ? data : [data]
}


