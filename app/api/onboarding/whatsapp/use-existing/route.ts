import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payloadSchema = z.object({
  restaurantId: z.string(),
})

export async function POST(request: Request) {
  try {
    console.log("\n========== [Use Existing Number] Starting ==========")

    const body = await request.json()
    const { restaurantId } = payloadSchema.parse(body)

    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant || restaurant.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Restaurant not found or access denied" }, { status: 403 })
    }

    // Use the shared WhatsApp number from env
    // Normalize shared number to +E.164
    const envFrom = process.env.TWILIO_WHATSAPP_FROM
    const sharedWhatsAppNumber = envFrom?.startsWith("+") ? envFrom : envFrom ? `+${envFrom.replace(/^whatsapp:/, "")}` : undefined
    const wabaId = process.env.TWILIO_WABA_ID
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!sharedWhatsAppNumber || !wabaId || !accountSid || !authToken) {
      return NextResponse.json(
        { success: false, error: "WhatsApp configuration missing" },
        { status: 500 }
      )
    }

    console.log(`[Use Existing Number] Using shared number: ${sharedWhatsAppNumber}`)
    console.log(`[Use Existing Number] WABA ID: ${wabaId}`)

    // Create/update bot record with the shared number
    // Use findFirst + update/create pattern to avoid issues with nullable unique fields in upsert
    const existingBot = await prisma.restaurantBot.findFirst({
      where: { restaurantId: restaurant.id },
    })

    const botData = {
      accountSid: accountSid,
      name: restaurant.name,
      restaurantName: restaurant.name,
      whatsappNumber: sharedWhatsAppNumber,
      wabaId: wabaId,
      subaccountSid: accountSid,
      authToken: authToken,
      status: "ACTIVE" as const,
      verifiedAt: new Date(),
      errorMessage: null,
      senderSid: null, // No sender SID for shared number
      verificationSid: null, // No verification needed
    }

    const bot = existingBot
      ? await prisma.restaurantBot.update({
          where: { id: existingBot.id },
          data: botData,
        })
      : await prisma.restaurantBot.create({
          data: {
            ...botData,
            restaurantId: restaurant.id,
          },
        })

    console.log(`[Use Existing Number] ✅ Bot activated with shared number`)

    // Persist the shared number on the Restaurant profile as well for consistency across the UI
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { whatsappNumber: sharedWhatsAppNumber },
    })

    return NextResponse.json({
      success: true,
      bot,
      message: `WhatsApp connected! You'll receive messages at the shared number ${sharedWhatsAppNumber}`,
    })
  } catch (error) {
    console.error("[Use Existing Number] Error:", error)

    const message = error instanceof Error ? error.message : "Failed to activate WhatsApp"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
