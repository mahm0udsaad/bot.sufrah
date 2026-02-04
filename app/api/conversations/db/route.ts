import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"

export const dynamic = 'force-dynamic';

const BOT_API_URL =
  process.env.BOT_API_URL || process.env.NEXT_PUBLIC_BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""

/**
 * GET /api/conversations/db
 * Fetch conversations from database (not in-memory cache)
 * This ensures data persists across server restarts
 */

export async function GET(request: NextRequest) {
  try {
    if (!BOT_API_TOKEN) {
      console.error("[conversations/db] Missing BOT_API_TOKEN env var")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "active"
    const limit = searchParams.get("limit") || "50"
    const offset = searchParams.get("offset") || "0"

    // Derive restaurant from authenticated session
    const restaurant = await getAuthenticatedRestaurant(request)
    const restaurantId = restaurant?.id || undefined

    const params = new URLSearchParams({
      status,
      limit,
      offset,
    })

    const headers: HeadersInit = {
      Authorization: `Bearer ${BOT_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(restaurantId ? { "X-Restaurant-Id": restaurantId } : {}),
    }

    const response = await fetch(`${BOT_API_URL}/db/conversations?${params}`, {
      headers,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error("Bot API error /db/conversations", response.status, body)
      return NextResponse.json({ error: "Bot API request failed" }, { status: response.status })
    }

    const conversations = await response.json()
    console.log("conversations", conversations)
    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error("[conversations/db] Failed to fetch conversations:", error)
    return NextResponse.json(
      { error: "فشل في جلب المحادثات - Failed to fetch conversations", conversations: [] },
      { status: 500 }
    )
  }
}

