import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { db } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function getUserIdFromToken(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.userId as string
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const conversationId = request.nextUrl.searchParams.get("conversationId")
    const takeParam = request.nextUrl.searchParams.get("take")
    const take = takeParam ? Math.min(Math.max(parseInt(takeParam, 10) || 0, 1), 200) : 100

    if (!conversationId) {
      return NextResponse.json({ success: false, message: "conversationId is required" }, { status: 400 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const conversation = await db.getConversation(restaurant.id, conversationId)

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }

    const messages = await db.listMessages(restaurant.id, conversationId, take)

    return NextResponse.json({ success: true, messages })
  } catch (error) {
    console.error("Fetch messages error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
