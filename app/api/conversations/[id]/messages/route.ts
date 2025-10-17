import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

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
    const { id } = await params

    if (!restaurantId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { content, sender_type, message_type, template_id } = await request.json()

    if (!content || !sender_type) {
      return NextResponse.json({ success: false, message: "Content and sender_type are required" }, { status: 400 })
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

    const direction = sender_type === "customer" ? "IN" : "OUT"

    const message = await db.createMessage({
      conversationId: id,
      restaurantId: restaurant.id,
      direction,
      body: content,
      mediaUrl: message_type === "media" ? content : undefined,
    })

    // Log usage
    await db.logUsage(restaurant.id, "message_sent", { messageId: message.id })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
