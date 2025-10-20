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

    // IMPORTANT: Bot API expects customer phone number in E.164 format, not DB conversation ID
    // Try to fetch the conversation to get the customer phone
    let customerPhone: string = conversationId
    try {
      const conversation = await db.getConversation(restaurant.id, conversationId)
      if (conversation && conversation.customerWa) {
        customerPhone = conversation.customerWa
        console.log(`[send] Resolved conversation ${conversationId} to phone: ${customerPhone}`)
      }
    } catch (error) {
      console.log(`[send] Conversation not in local DB, using conversationId as phone: ${conversationId}`)
    }

    // Normalize to E.164 format with leading '+' (required by Bot API)
    customerPhone = customerPhone.startsWith('+')
      ? customerPhone
      : `+${customerPhone.replace(/^\+?/, '')}`
    
    console.log(`[send] Using normalized phone: ${customerPhone}`)

    const body = await request.json()
    const message = body.message || body.content || body.text

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ success: false, message: "message is required" }, { status: 400 })
    }

    // Forward to bot API using customer phone number
    const url = `${BOT_API_URL.replace(/\/$/, "")}/conversations/${encodeURIComponent(customerPhone)}/send`

    // Generate auth headers for bot API
    const botHeaders: HeadersInit = { "Content-Type": "application/json" }
    if (PAT && restaurantId) {
      botHeaders["Authorization"] = `Bearer ${PAT}`
      botHeaders["X-Restaurant-Id"] = restaurantId
    } else if (BOT_API_TOKEN) {
      botHeaders["Authorization"] = `ApiToken ${BOT_API_TOKEN}`
    } else if (BOT_API_KEY) {
      botHeaders["X-API-Key"] = BOT_API_KEY
    }

    const res = await fetch(url, {
      method: "POST",
      headers: botHeaders,
      body: JSON.stringify({ message }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Bot API error:", text)
      
      // Return 202 if no state yet (as per spec)
      if (res.status === 404 || res.status === 422) {
        return NextResponse.json({ message: null }, { status: 202 })
      }
      
      return NextResponse.json(
        { success: false, message: "Bot API error", details: text },
        { status: res.status }
      )
    }

    const payload = await res.json().catch(() => ({}))
    
    // Return spec-compliant response: { message: Message }
    return NextResponse.json({ message: payload.message || payload.data || null })
  } catch (error) {
    console.error("Send message API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

