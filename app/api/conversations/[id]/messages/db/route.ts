import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { db } from "@/lib/db"

/**
 * GET /api/conversations/[id]/messages/db
 * Fetch messages directly from our database for the authenticated restaurant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)
    if (!restaurant) {
      return NextResponse.json({ error: "Unauthorized", messages: [] }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitNum = parseInt(searchParams.get("limit") || "100", 10)

    // Read from prisma through our db helper
    const rows = await db.listMessages(restaurant.id, params.id, isNaN(limitNum) ? 100 : limitNum)

    return NextResponse.json({ messages: rows })
  } catch (error: any) {
    console.error(`[conversations/${params.id}/messages/db] Failed to fetch messages:`, error)
    return NextResponse.json(
      { error: "فشل في جلب الرسائل - Failed to fetch messages", messages: [] },
      { status: 500 }
    )
  }
}

