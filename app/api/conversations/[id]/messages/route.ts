import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db, normalizePhone } from "@/lib/db"

const PAT = process.env.BOT_API_TOKEN

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
    const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("X-API-Key") || request.headers.get("x-api-token")
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    const { id } = await params

    if (!restaurantId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Verify restaurant owns this conversation
    const restaurant = await db.getRestaurantById(restaurantId)
    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const conversation = await db.getConversation(restaurant.id, id)
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }

    const messages = await db.listMessages(restaurant.id, id)

    return NextResponse.json({ success: true, messages })
  } catch (error) {
    console.error("Messages API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    const { id: conversationIdOrPhone } = await params

    if (!restaurantId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { content, sender_type, message_type } = await request.json()

    if (!content || !sender_type) {
      return NextResponse.json({ success: false, message: "Content and sender_type are required" }, { status: 400 })
    }

    // Only handle outbound messages (from agent to customer) via bot API
    if (sender_type !== "agent" && sender_type !== "restaurant") {
      return NextResponse.json({ success: false, message: "Invalid sender_type. Use 'agent' for outbound messages." }, { status: 400 })
    }

    // Verify restaurant owns this conversation
    const restaurant = await db.getRestaurantById(restaurantId)
    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    // Try to resolve conversation - might be ID or phone number
    let conversation = await db.getConversation(restaurant.id, conversationIdOrPhone)
    
    // If not found by ID, try as phone number
    if (!conversation) {
      const normalizedPhone = normalizePhone(conversationIdOrPhone)
      const convByPhone = await db.findOrCreateConversation(restaurant.id, normalizedPhone)
      conversation = convByPhone
    }
    
    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }
    
    const conversationId = conversation.id

    // Get bot configuration to find botId
    const bot = await db.getPrimaryRestaurantByUserId(restaurant.userId).then(r => r?.bots)
    const botId = bot?.id

    if (!botId) {
      return NextResponse.json({ success: false, message: "Bot not configured for this restaurant" }, { status: 400 })
    }

    // Forward to bot API
    const BOT_API_URL = process.env.BOT_API_URL || process.env.NEXT_PUBLIC_BOT_API_URL
    if (!BOT_API_URL) {
      return NextResponse.json({ success: false, message: "Bot API not configured" }, { status: 500 })
    }

    const PAT = process.env.BOT_API_TOKEN
    // BOT_API_URL already includes /api, so just append the path
    const botApiUrl = `${BOT_API_URL.replace(/\/$/, "")}/conversations/${encodeURIComponent(conversationId)}/messages?tenantId=${encodeURIComponent(botId)}`

    const botHeaders: HeadersInit = { "Content-Type": "application/json" }
    if (PAT && restaurantId) {
      botHeaders["Authorization"] = `Bearer ${PAT}`
      botHeaders["X-Restaurant-Id"] = restaurantId
    }

    console.log(`[dashboard] Forwarding message to bot API: ${botApiUrl}`)

    const botResponse = await fetch(botApiUrl, {
      method: "POST",
      headers: botHeaders,
      body: JSON.stringify({
        content,
        messageType: message_type || "text",
      }),
    })

    if (!botResponse.ok) {
      const errorText = await botResponse.text()
      console.error(`[dashboard] Bot API error (${botResponse.status}):`, errorText)
      return NextResponse.json(
        { success: false, message: "Failed to send message via bot API", details: errorText },
        { status: botResponse.status }
      )
    }

    const botResult = await botResponse.json()

    // Log usage
    await db.logUsage(restaurant.id, "message_sent", { 
      conversationId,
      messageId: botResult.message?.id,
      via: "bot_api" 
    })

    return NextResponse.json({ success: true, message: botResult.message || botResult })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
