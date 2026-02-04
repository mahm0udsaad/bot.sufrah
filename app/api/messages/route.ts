import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { db } from "@/lib/db"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const conversationId = request.nextUrl.searchParams.get("conversationId")
    const takeParam = request.nextUrl.searchParams.get("take")
    const take = takeParam ? Math.min(Math.max(parseInt(takeParam, 10) || 0, 1), 200) : 100

    if (!conversationId) {
      return NextResponse.json({ success: false, message: "conversationId is required" }, { status: 400 })
    }

    const conversation = await db.getConversation(restaurant.id, conversationId)

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }

    const messages = await db.listMessages(restaurant.id, conversationId, take)

    return NextResponse.json({ success: true, messages })
  } catch (error) {
    console.error("Fetch messages error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
