import { NextRequest, NextResponse } from "next/server"

const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""

/**
 * GET /api/conversations/[id]/messages/db
 * Fetch messages from database (not in-memory cache)
 * This ensures message history persists across server restarts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "100"
    const offset = searchParams.get("offset") || "0"

    // Get restaurant ID from header (for multi-tenancy)
    const restaurantId = request.headers.get("x-restaurant-id")

    const queryParams = new URLSearchParams({
      limit,
      offset,
    })

    const headers: HeadersInit = {
      Authorization: `Bearer ${BOT_API_TOKEN}`,
      "Content-Type": "application/json",
    }

    if (restaurantId) {
      headers["X-Restaurant-Id"] = restaurantId
    }

    const response = await fetch(
      `${BOT_API_URL}/db/conversations/${encodeURIComponent(params.id)}/messages?${queryParams}`,
      { headers }
    )

    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`)
    }

    const messages = await response.json()
    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error(`[conversations/${params.id}/messages/db] Failed to fetch messages:`, error)
    return NextResponse.json(
      { error: "فشل في جلب الرسائل - Failed to fetch messages", messages: [] },
      { status: 500 }
    )
  }
}

