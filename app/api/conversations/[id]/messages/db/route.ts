import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"

const BOT_API_URL =
  process.env.BOT_API_URL || process.env.NEXT_PUBLIC_BOT_API_URL || "https://bot.sufrah.sa/api"
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
    if (!BOT_API_TOKEN) {
      console.error(`[conversations/${params.id}/messages/db] Missing BOT_API_TOKEN env var`)
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "100"
    const offset = searchParams.get("offset") || "0"

    // Derive restaurant from authenticated session
    const restaurant = await getAuthenticatedRestaurant(request)
    const restaurantId = restaurant?.id || undefined

    const queryParams = new URLSearchParams({
      limit,
      offset,
    })

    const headers: HeadersInit = {
      Authorization: `Bearer ${BOT_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(restaurantId ? { "X-Restaurant-Id": restaurantId } : {}),
    }

    const response = await fetch(
      `${BOT_API_URL}/db/conversations/${encodeURIComponent(params.id)}/messages?${queryParams}`,
      { headers }
    )

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error(`Bot API error /db/conversations/${params.id}/messages`, response.status, body)
      return NextResponse.json({ error: "Bot API request failed" }, { status: response.status })
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

