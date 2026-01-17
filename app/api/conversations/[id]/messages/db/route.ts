import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"

const BOT_API_URL =
  process.env.BOT_API_URL || process.env.NEXT_PUBLIC_BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""

/**
 * GET /api/conversations/[id]/messages/db
 * Fetch messages directly from bot service database for the authenticated restaurant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!BOT_API_TOKEN) {
      console.error("[conversations/messages/db] Missing BOT_API_TOKEN env var")
      return NextResponse.json({ error: "Server misconfiguration", messages: [] }, { status: 500 })
    }

    const restaurant = await getAuthenticatedRestaurant(request)
    if (!restaurant) {
      return NextResponse.json({ error: "Unauthorized", messages: [] }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limitNum = parseInt(searchParams.get("limit") || "100", 10)
    const beforeParam = searchParams.get("before")

    const queryParams = new URLSearchParams({
      limit: (isNaN(limitNum) ? 100 : Math.min(Math.max(limitNum, 1), 200)).toString(),
    })
    if (beforeParam) {
      queryParams.set("before", beforeParam)
    }

    const headers: HeadersInit = {
      Authorization: `Bearer ${BOT_API_TOKEN}`,
      "Content-Type": "application/json",
      "X-Restaurant-Id": restaurant.id,
    }

    const response = await fetch(
      `${BOT_API_URL}/db/conversations/${encodeURIComponent(id)}/messages?${queryParams.toString()}`,
      { headers }
    )

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error("Bot API error /db/conversations/:id/messages", response.status, body)
      return NextResponse.json({ error: "Bot API request failed", messages: [] }, { status: response.status })
    }

    const data = await response.json()
    // Bot service may return either an array OR an object like { success: true, messages: [...] }
    const messages = Array.isArray(data) ? data : Array.isArray((data as any)?.messages) ? (data as any).messages : []
    return NextResponse.json({ messages })
  } catch (error: any) {
    const { id } = await params
    console.error(`[conversations/${id}/messages/db] Failed to fetch messages:`, error)
    return NextResponse.json(
      { error: "فشل في جلب الرسائل - Failed to fetch messages", messages: [] },
      { status: 500 }
    )
  }
}

