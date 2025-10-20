import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { z } from "zod"
import { db } from "@/lib/db"

const payloadSchema = z.object({
  restaurantId: z.string().min(1),
  conversationId: z.string().min(1),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.message }, { status: 400 })
    }

    const { restaurantId, conversationId, text, mediaUrl } = parsed.data

    if (restaurant.id !== restaurantId) {
      return NextResponse.json({ success: false, message: "Restaurant mismatch" }, { status: 403 })
    }

    const conversation = await db.getConversation(restaurant.id, conversationId)

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 })
    }

    if (!text && !mediaUrl) {
      return NextResponse.json({ success: false, message: "Message text or mediaUrl required" }, { status: 400 })
    }

    const message = await db.createMessage({
      restaurantId: restaurant.id,
      conversationId,
      direction: "OUT",
      body: text ?? mediaUrl ?? "",
      mediaUrl,
    })

    // TODO: enqueue outbound delivery via bot service / Twilio

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
