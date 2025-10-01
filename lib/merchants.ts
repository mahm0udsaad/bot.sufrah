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

function joinUrl(base: string, path: string): string {
  if (!base) return path
  const hasSlash = base.endsWith("/")
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path
  return hasSlash ? `${base}${trimmedPath}` : `${base}/${trimmedPath}`
}

export async function fetchMerchantByPhoneOrEmail(emailOrPhone: string): Promise<{ success: boolean; data?: MerchantData; error?: string }>{
  const baseUrl = process.env.BASEURL || ""
  const apiToken = process.env.APITOKEN || ""

  if (!baseUrl || !apiToken) {
    return { success: false, error: "External merchant API not configured" }
  }

  const url = new URL(joinUrl(baseUrl, "/api/v1/external/merchants/get-by-property"))
  url.searchParams.set("EmailOrPhone", emailOrPhone)
  
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/plain",
        Authorization: "ApiToken MVP4L8AhFnS3S1LGcg6QqkZ8yPEcgaWetBnGOKu6dCE=",
      },
      // Keep Node.js runtime; avoid revalidation caching for verification flow
      cache: "no-store",
    })

    if (!res.ok) {
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


