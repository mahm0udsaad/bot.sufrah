import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const webhookPayloadSchema = z.object({
  waba_id: z.string(),
  phone_number: z.string(),
  sender_sid: z.string(),
  status: z.string(), // e.g., "approved", "rejected", "pending"
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = webhookPayloadSchema.parse(body)

    console.log(`[WhatsApp Webhook] Received status update: ${payload.status} for ${payload.phone_number}`)

    const bot = await prisma.restaurantBot.findUnique({
      where: { whatsappNumber: payload.phone_number },
    })

    if (!bot) {
      console.warn(`[WhatsApp Webhook] Received webhook for unknown number: ${payload.phone_number}`)
      // Return 200 to acknowledge receipt and prevent retries
      return NextResponse.json({ success: true, message: "Bot not found for this number." })
    }

    let newStatus: "ACTIVE" | "PENDING" | "FAILED" = "PENDING"
    if (payload.status === "approved") {
      newStatus = "ACTIVE"
    } else if (payload.status === "rejected") {
      newStatus = "FAILED"
    }

    // Note: Embedded Signup connections don't need OTP verification
    // verificationSid should remain null for these connections
    await prisma.restaurantBot.update({
      where: { id: bot.id },
      data: {
        status: newStatus,
        wabaId: payload.waba_id,
        senderSid: payload.sender_sid,
        verifiedAt: newStatus === "ACTIVE" ? new Date() : bot.verifiedAt,
        errorMessage: newStatus === "FAILED" ? "Connection rejected by provider." : null,
        // Don't set verificationSid - Embedded Signup doesn't need OTP
      },
    })

    console.log(`[WhatsApp Webhook] Updated bot ${bot.id} to status ${newStatus}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("WhatsApp webhook processing failed", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid webhook payload" }, { status: 400 })
    }
    // Acknowledge receipt to Twilio even on internal error to avoid retries
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 200 })
  }
}
