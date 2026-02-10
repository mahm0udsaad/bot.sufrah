type MerchantPaymentInfo = {
  apiKey?: string
  secretKey?: string
  publicKey?: string
  status?: string
}

export type MerchantData = {
  id?: string
  email?: string
  phoneNumber?: string
  name?: string
  address?: string
  sloganPhoto?: string
  isActive?: boolean
  purchaseTaxNumber?: string
  taxCertificateUpload?: string
  subscriptionStatus?: string
  bundleName?: string
  startAt?: string
  expirationAt?: string
  period?: number
  price?: number
  numberOfBranches?: number
  hasMobileApp?: boolean
  paymentInfo?: MerchantPaymentInfo
}

export type ExternalClientData = {
  id?: string
  name?: string
  fullName?: string
  clientName?: string
  displayName?: string
  phoneNumber?: string
  mobileNumber?: string
  whatsappNumber?: string
  customerPhone?: string
  phone?: string
}

function joinUrl(base: string, path: string): string {
  if (!base) return path
  const hasSlash = base.endsWith("/")
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path
  return hasSlash ? `${base}${trimmedPath}` : `${base}/${trimmedPath}`
}

export async function fetchMerchantByPhoneOrEmail(
  emailOrPhone: string,
  options?: { preserveEncoding?: boolean }
): Promise<{ success: boolean; data?: MerchantData; error?: string }>{
  const baseUrl = process.env.SUFRAH_MAIN_API || ""
  const apiToken = process.env.SUFRAH_API_KEY || ""
  console.log("baseUrl", baseUrl)
  console.log("apiToken", apiToken)
  if (!baseUrl || !apiToken) {
    return { success: false, error: "External merchant API not configured" }
  }

  const url = new URL(joinUrl(baseUrl, "/api/v1/external/merchants/get-by-property"))
  console.log("url", url.toString())
  if (options?.preserveEncoding) {
    url.search = `EmailOrPhone=${emailOrPhone}`
  } else {
    url.searchParams.set("EmailOrPhone", emailOrPhone)
  }
  
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/plain",
        Authorization: `ApiToken ${apiToken}`,
      },
      // Keep Node.js runtime; avoid revalidation caching for verification flow
      cache: "no-store",
    })

    if (!res.ok) {
      console.log("[v0] External API error:", res) // Add debug logging
      return { success: false, error: `External API error ${res.status}` }
    }

    // Some APIs return JSON with text/plain content-type. Try json(), fallback to text()->JSON.parse.
    let data: any
    try {
      data = await res.json()
    } catch {
      const text = await res.text()
      try {
        data = JSON.parse(text)
      } catch {
        // If not parseable, return as error
        return { success: false, error: "Invalid response format from external API" }
      }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

type FetchMerchantClientsOptions = {
  filter?: string
  sorting?: string
  skipCount?: number
  maxResultCount?: number
}

function unwrapClientItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  if (Array.isArray(payload?.result?.items)) return payload.result.items
  if (Array.isArray(payload?.result)) return payload.result
  if (payload && typeof payload === "object") return [payload]
  return []
}

export async function fetchMerchantClients(
  merchantId: string,
  options: FetchMerchantClientsOptions = {}
): Promise<{ success: boolean; data?: ExternalClientData[]; error?: string }> {
  const baseUrl = process.env.SUFRAH_MAIN_API || ""
  const apiToken = process.env.SUFRAH_API_KEY || ""

  if (!baseUrl || !apiToken) {
    return { success: false, error: "External merchant API not configured" }
  }

  if (!merchantId) {
    return { success: false, error: "Missing merchantId" }
  }

  const url = new URL(joinUrl(baseUrl, "/api/v1/external/clients"))
  url.searchParams.set("merchantId", merchantId)
  if (typeof options.filter === "string" && options.filter.length > 0) {
    url.searchParams.set("Filter", options.filter)
  }
  if (typeof options.sorting === "string" && options.sorting.length > 0) {
    url.searchParams.set("Sorting", options.sorting)
  }
  if (typeof options.skipCount === "number" && Number.isFinite(options.skipCount)) {
    url.searchParams.set("SkipCount", String(Math.max(0, Math.floor(options.skipCount))))
  }
  if (typeof options.maxResultCount === "number" && Number.isFinite(options.maxResultCount)) {
    url.searchParams.set("MaxResultCount", String(Math.max(1, Math.floor(options.maxResultCount))))
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain;q=0.9",
        Authorization: `ApiToken ${apiToken}`,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { success: false, error: `External API error ${res.status}${body ? `: ${body}` : ""}` }
    }

    let payload: any
    try {
      payload = await res.json()
    } catch {
      const text = await res.text()
      try {
        payload = JSON.parse(text)
      } catch {
        return { success: false, error: "Invalid response format from external clients API" }
      }
    }

    const items = unwrapClientItems(payload) as ExternalClientData[]
    return { success: true, data: items }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
