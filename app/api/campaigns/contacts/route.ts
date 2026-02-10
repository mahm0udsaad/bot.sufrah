import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { getMergedClientContacts } from "@/lib/client-contacts"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const search = request.nextUrl.searchParams
  const filter = search.get("Filter") || undefined
  const sorting = search.get("Sorting") || undefined
  const skipCountRaw = search.get("SkipCount")
  const maxResultCountRaw = search.get("MaxResultCount")
  const skipCount = skipCountRaw !== null ? Number.parseInt(skipCountRaw, 10) : undefined
  const maxResultCount = maxResultCountRaw !== null ? Number.parseInt(maxResultCountRaw, 10) : undefined

  const contacts = await getMergedClientContacts({
    restaurantId: restaurant.id,
    externalMerchantId: restaurant.externalMerchantId,
    externalQuery: {
      filter,
      sorting,
      skipCount: Number.isFinite(skipCount) ? skipCount : undefined,
      maxResultCount: Number.isFinite(maxResultCount) ? maxResultCount : undefined,
    },
  })
  return NextResponse.json({ contacts })
}
