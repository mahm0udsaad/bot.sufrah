import { NextRequest, NextResponse } from "next/server"

const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""

/**
 * GET /api/conversations/db
 * Fetch conversations from database (not in-memory cache)
 * This ensures data persists across server restarts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "active"
    const limit = searchParams.get("limit") || "50"
    const offset = searchParams.get("offset") || "0"

    // Get restaurant ID from header (for multi-tenancy)
    const restaurantId = request.headers.get("x-restaurant-id")

    const params = new URLSearchParams({
      status,
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

    const response = await fetch(`${BOT_API_URL}/db/conversations?${params}`, {
      headers,
    })

    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`)
    }

    const conversations = await response.json()
    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error("[conversations/db] Failed to fetch conversations:", error)
    return NextResponse.json(
      { error: "فشل في جلب المحادثات - Failed to fetch conversations", conversations: [] },
      { status: 500 }
    )
  }
}

