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

    // Conversation IDs from the bot service may not exist in our local DB.
    // Attempt a lookup, but do not block if missing – proceed to proxy.
    try {
      await db.getConversation(restaurant.id, conversationId)
    } catch {}

    const contentType = request.headers.get("content-type") || ""

    // Generate auth headers for bot API
    const botHeaders: HeadersInit = {}
    if (PAT && restaurantId) {
      botHeaders["Authorization"] = `Bearer ${PAT}`
      botHeaders["X-Restaurant-Id"] = restaurantId
    } else if (BOT_API_TOKEN) {
      botHeaders["Authorization"] = `ApiToken ${BOT_API_TOKEN}`
    } else if (BOT_API_KEY) {
      botHeaders["X-API-Key"] = BOT_API_KEY
    }

    // Forward to bot API
    const url = `${BOT_API_URL.replace(/\/$/, "")}/conversations/${encodeURIComponent(conversationId)}/send-media`

    if (contentType.includes("application/json")) {
      const body = await request.json()
      const mediaUrl: string | undefined = body?.mediaUrl || body?.mediaUrls?.[0]
      const caption: string | undefined = body?.caption
      const mediaType: string | undefined = body?.mediaType

      if (!mediaUrl) {
        return NextResponse.json({ success: false, message: "mediaUrl or mediaUrls is required" }, { status: 400 })
      }

      let res = await fetch(url, {
        method: "POST",
        headers: {
          ...botHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaUrl, caption, mediaType }),
      })

      if (!res.ok && (res.status === 404 || res.status === 405)) {
        // Fallback to legacy send endpoint
        const altUrl = `${BOT_API_URL.replace(/\/$/, "")}/conversations/${encodeURIComponent(conversationId)}/send`
        res = await fetch(altUrl, {
          method: "POST",
          headers: {
            ...botHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mediaUrl, caption, mediaType }),
        })
      }

      if (!res.ok) {
        const text = await res.text()
        console.error("Bot API error:", text)
        
        // Return 202 if no state yet (as per spec)
        if (res.status === 404 || res.status === 422) {
          return NextResponse.json({ message: null }, { status: 202 })
        }
        
        return NextResponse.json({ success: false, message: "Bot API error", details: text }, { status: res.status })
      }

      const payload = await res.json().catch(() => ({}))
      // Return spec-compliant response: { message: Message }
      return NextResponse.json({ message: payload.message || payload.data || null })
    }

    // Multipart form-data path
    const form = await request.formData()
    const file = form.get("file") as File | null
    const caption = form.get("caption") as string | null

    if (!file) {
      return NextResponse.json({ success: false, message: "file is required in form-data" }, { status: 400 })
    }

    const forward = new FormData()
    forward.append("file", file)
    if (caption) forward.append("caption", caption)

    let res = await fetch(url, {
      method: "POST",
      headers: botHeaders,
      body: forward,
    })

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      // Fallback to legacy send endpoint
      const altUrl = `${BOT_API_URL.replace(/\/$/, "")}/conversations/${encodeURIComponent(conversationId)}/send`
      res = await fetch(altUrl, {
        method: "POST",
        headers: botHeaders,
        body: forward,
      })
    }

    if (!res.ok) {
      const text = await res.text()
      console.error("Bot API error:", text)
      
      // Return 202 if no state yet (as per spec)
      if (res.status === 404 || res.status === 422) {
        return NextResponse.json({ message: null }, { status: 202 })
      }
      
      return NextResponse.json({ success: false, message: "Bot API error", details: text }, { status: res.status })
    }

    const payload = await res.json().catch(() => ({}))
    // Return spec-compliant response: { message: Message }
    return NextResponse.json({ message: payload.message || payload.data || null })
  } catch (error) {
    console.error("send-media API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}


