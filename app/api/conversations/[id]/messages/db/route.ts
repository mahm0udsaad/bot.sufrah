import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { db } from "@/lib/db"

/**
 * GET /api/conversations/[id]/messages/db
 * Fetch messages directly from our database for the authenticated restaurant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)
    if (!restaurant) {
      return NextResponse.json({ error: "Unauthorized", messages: [] }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limitNum = parseInt(searchParams.get("limit") || "100", 10)
    const beforeParam = searchParams.get("before")
    const beforeDate = beforeParam ? new Date(beforeParam) : undefined

    // Verify restaurant owns this conversation
    const conversation = await db.getConversation(restaurant.id, id)
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found", messages: [] }, { status: 404 })
    }

    // Pagination-friendly: newest page by default, older pages via `before`
    const rows = await db.listMessagesPage(
      id,
      isNaN(limitNum) ? 100 : Math.min(Math.max(limitNum, 1), 200),
      beforeDate && !isNaN(beforeDate.getTime()) ? beforeDate : undefined,
    )

    return NextResponse.json({ messages: rows })
  } catch (error: any) {
    const { id } = await params
    console.error(`[conversations/${id}/messages/db] Failed to fetch messages:`, error)
    return NextResponse.json(
      { error: "فشل في جلب الرسائل - Failed to fetch messages", messages: [] },
      { status: 500 }
    )
  }
}

