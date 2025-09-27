import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Expected webhook payload from bot
    const { conversation_id, from_phone, to_phone, message_type, content, media_url, timestamp, is_from_customer } =
      data

    // Save message to database
    const message = await db.createMessage({
      conversation_id,
      from_phone,
      to_phone,
      message_type,
      content,
      media_url,
      timestamp: new Date(timestamp),
      is_from_customer,
    })

    // Update conversation last activity
    await db.updateConversation(conversation_id, {
      last_message_at: new Date(timestamp),
      updated_at: new Date(),
    })

    return NextResponse.json({ success: true, message_id: message.id })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
