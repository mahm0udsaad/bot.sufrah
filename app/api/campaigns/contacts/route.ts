import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { campaignDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contacts = await campaignDb.getCustomerContacts(restaurant.id)
  return NextResponse.json({ contacts })
}
