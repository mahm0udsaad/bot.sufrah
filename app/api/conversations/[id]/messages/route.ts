import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { db } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function getUserFromToken(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.userId as string
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserFromToken(request)
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns this conversation
    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

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
    const userId = await getUserFromToken(request)
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { content, sender_type, message_type, template_id } = await request.json()

    if (!content || !sender_type) {
      return NextResponse.json({ success: false, message: "Content and sender_type are required" }, { status: 400 })
    }

    // Verify user owns this conversation
    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

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
