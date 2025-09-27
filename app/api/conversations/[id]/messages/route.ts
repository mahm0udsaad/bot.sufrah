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
    const conversation = await db.getConversation(id)
    if (!conversation || conversation.user_id !== userId) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }

    const messages = await db.getMessages(id)

    return NextResponse.json(messages)
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
    const conversation = await db.getConversation(id)
    if (!conversation || conversation.user_id !== userId) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }

    const message = await db.createMessage({
      conversation_id: id,
      sender_type,
      content,
      message_type,
      template_id,
    })

    // Log usage
    await db.logUsage(userId, "message_sent", message.id)

    return NextResponse.json(message)
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
