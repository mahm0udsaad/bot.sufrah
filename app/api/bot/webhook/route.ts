import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Expected webhook payload from bot
    const { conversation_id, from_phone, to_phone, message_type, content, media_url, timestamp, is_from_customer } =
      data

    const normalize = (value: string | undefined | null) => {
      if (!value) return null
      const trimmed = value.trim()
      return trimmed.startsWith("whatsapp:") ? trimmed.slice(9) : trimmed
    }

    const toNumber = normalize(to_phone)
    const fromAddress = typeof from_phone === "string" && from_phone.startsWith("whatsapp:") ? from_phone : `whatsapp:${from_phone}`

    if (!toNumber) {
      return NextResponse.json({ success: false, error: "Missing destination" }, { status: 400 })
    }

    const restaurantBot = await prisma.restaurantBot.findFirst({ where: { whatsappNumber: toNumber } })

    if (!restaurantBot) {
      return NextResponse.json({ success: false, error: "Unknown WhatsApp sender" }, { status: 404 })
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        restaurantId_customerWa: {
          restaurantId: restaurantBot.restaurantId,
          customerWa: fromAddress,
        },
      },
      update: {
        lastMessageAt: new Date(timestamp ?? Date.now()),
        status: "OPEN",
      },
      create: {
        id: conversation_id ?? undefined,
        restaurantId: restaurantBot.restaurantId,
        customerWa: fromAddress,
        lastMessageAt: new Date(timestamp ?? Date.now()),
        status: "OPEN",
      },
    })

    const direction = is_from_customer ? "IN" : "OUT"

    const message = await db.createMessage({
      restaurantId: restaurantBot.restaurantId,
      conversationId: conversation.id,
      direction,
      body: content ?? "",
      mediaUrl: media_url ?? undefined,
      waSid: typeof data.message_sid === "string" ? data.message_sid : undefined,
    })

    return NextResponse.json({ success: true, message_id: message.id })
  } catch (error) {
    console.error("Webhook error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
