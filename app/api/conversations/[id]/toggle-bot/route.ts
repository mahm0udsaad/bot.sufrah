import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const PAT = process.env.DASHBOARD_PAT || process.env.BOT_API_TOKEN
const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""
const BOT_API_KEY = process.env.BOT_API_KEY || ""

function extractToken(headerValue: string | null): string | null {
  if (!headerValue) return null
  const trimmed = headerValue.trim()
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim()
  }
  if (trimmed.toLowerCase().startsWith("apitoken ")) {
    return trimmed.slice(9).trim()
  }
  return trimmed
}

async function resolveRestaurantId(request: NextRequest): Promise<string | null> {
  // 1) Try Personal Access Token from headers
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("X-API-Key")
    const provided = extractToken(authHeader) || extractToken(apiKeyHeader)

    if (provided && PAT && provided === PAT) {
      const rid = request.headers.get("x-restaurant-id") || request.headers.get("X-Restaurant-Id")
      if (rid && rid.trim().length > 0) {
        return rid.trim()
      }
      return null
    }
  } catch {
    // fall through
  }

  // 2) Fallback: existing cookie session via user phone -> primary restaurant
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value
    if (!userPhone) return null
    const user = await db.getUserByPhone(userPhone)
    if (!user) return null
    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
    return restaurant?.id ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    const { id: conversationId } = await params

    if (!restaurantId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getRestaurantById(restaurantId)
    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const { enabled } = await request.json()

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ success: false, message: "enabled must be a boolean" }, { status: 400 })
    }

    // Find the conversation (may not exist in local DB if bot-only conversation)
    let conversation = null
    try {
      conversation = await db.getConversation(restaurant.id, conversationId)
    } catch {}

    // Update the bot status for this conversation in local DB if it exists
    if (conversation) {
      await db.updateConversation(conversationId, { isBotActive: enabled })
    }

    // Sync to the external bot service
    try {
      const botHeaders: HeadersInit = { "Content-Type": "application/json" }
      if (PAT && restaurantId) {
        botHeaders["Authorization"] = `Bearer ${PAT}`
        botHeaders["X-Restaurant-Id"] = restaurantId
      } else if (BOT_API_TOKEN) {
        botHeaders["Authorization"] = `ApiToken ${BOT_API_TOKEN}`
      } else if (BOT_API_KEY) {
        botHeaders["X-API-Key"] = BOT_API_KEY
      }

      const response = await fetch(`${BOT_API_URL}/conversations/${conversationId}/toggle-bot`, {
        method: "POST",
        headers: botHeaders,
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        console.warn(`Failed to sync bot toggle to external service: ${response.statusText}`)
      }
    } catch (error) {
      console.warn("Failed to sync bot toggle to external service:", error)
      // Don't fail the request if external sync fails
    }

    // Return spec-compliant response: { success: true, isBotActive: boolean }
    return NextResponse.json({
      success: true,
      isBotActive: enabled,
    })
  } catch (error) {
    console.error("Toggle bot API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
