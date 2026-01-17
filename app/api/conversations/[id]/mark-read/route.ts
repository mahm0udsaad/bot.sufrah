import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { db } from "@/lib/db"

/**
 * POST /api/conversations/[id]/mark-read
 * Marks a conversation as read by setting unread_count to 0 for the authenticated restaurant.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)
    if (!restaurant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const conversation = await db.getConversation(restaurant.id, id)
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    await db.updateConversation(id, { unreadCount: 0 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { id } = await params
    console.error(`[conversations/${id}/mark-read] Failed to mark as read:`, error)
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
  }
}

