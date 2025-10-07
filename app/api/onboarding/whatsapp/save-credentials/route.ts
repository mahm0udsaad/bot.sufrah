import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payloadSchema = z.object({
  restaurantId: z.string(),
  wabaId: z.string(),
  whatsappNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, "Invalid WhatsApp number format"),
  senderSid: z.string(),
  status: z.string(), // e.g., "approved", "pending", "rejected"
})

const ensureTwilioCredentials = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
  }

  return { accountSid, authToken }
}

export async function POST(request: Request) {
  try {
    // Authentication
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to save WhatsApp credentials." },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found. Please log in again." },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { restaurantId, wabaId, whatsappNumber, senderSid, status } = payloadSchema.parse(body)

    console.log(`[Save Credentials] Received: restaurantId=${restaurantId}, wabaId=${wabaId}, number=${whatsappNumber}, senderSid=${senderSid}, status=${status}`)

    // Authorization
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found." },
        { status: 404 }
      )
    }

    if (restaurant.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to update this restaurant." },
        { status: 403 }
      )
    }

    // Determine bot status based on callback status
    let botStatus: "ACTIVE" | "PENDING" | "FAILED" | "VERIFYING" = "PENDING"
    let errorMessage: string | null = null

    if (status === "approved") {
      botStatus = "ACTIVE"
    } else if (status === "rejected") {
      botStatus = "FAILED"
      errorMessage = "WhatsApp connection was rejected by Meta/Twilio."
    } else if (status === "pending") {
      botStatus = "VERIFYING"
    }

    const { accountSid, authToken } = ensureTwilioCredentials()

    // Verify the sender exists and is valid with Twilio
    try {
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
      const senderCheckUrl = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`
      const senderCheckResponse = await fetch(senderCheckUrl, {
        method: "GET",
        headers: { Authorization: `Basic ${basicAuth}` },
      })

      if (senderCheckResponse.ok) {
        const senderData = await senderCheckResponse.json()
        console.log(`[Save Credentials] Sender verification status: ${senderData.status}`)

        if (senderData.status === "ONLINE") {
          botStatus = "ACTIVE"
        } else if (senderData.status === "PENDING" || senderData.status === "UNVERIFIED") {
          botStatus = "VERIFYING"
        }
      } else {
        console.warn(`[Save Credentials] Could not verify sender ${senderSid}: ${senderCheckResponse.status}`)
      }
    } catch (verifyError) {
      console.error("[Save Credentials] Error verifying sender:", verifyError)
      // Continue anyway - don't fail the entire save operation
    }

    // Check for existing bot with different number (to prevent duplicates)
    const existingBot = await prisma.restaurantBot.findFirst({
      where: {
        restaurantId: restaurant.id,
      },
    })

    if (existingBot && existingBot.whatsappNumber !== whatsappNumber) {
      console.warn(`[Save Credentials] Replacing existing number ${existingBot.whatsappNumber} with ${whatsappNumber}`)
    }

    const bot = await prisma.restaurantBot.upsert({
      where: { restaurantId: restaurant.id },
      update: {
        accountSid,
        name: restaurant.name,
        restaurantName: restaurant.name,
        whatsappNumber,
        senderSid,
        wabaId,
        status: botStatus,
        verifiedAt: botStatus === "ACTIVE" ? new Date() : null,
        errorMessage,
        // For Embedded Signup, clear verificationSid since no OTP is needed
        verificationSid: null,
        // Keep master account credentials
        subaccountSid: accountSid,
        authToken: authToken,
      },
      create: {
        restaurantId: restaurant.id,
        accountSid,
        name: restaurant.name,
        restaurantName: restaurant.name,
        whatsappNumber,
        senderSid,
        wabaId,
        status: botStatus,
        verifiedAt: botStatus === "ACTIVE" ? new Date() : null,
        errorMessage,
        // Embedded Signup doesn't need verificationSid
        verificationSid: null,
        subaccountSid: accountSid,
        authToken: authToken,
      },
    })

    // Also update the restaurant's whatsappNumber field
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { whatsappNumber },
    })

    console.log(`[Save Credentials] Successfully saved bot for restaurant ${restaurantId} with status ${botStatus}`)

    return NextResponse.json({
      success: true,
      bot,
      message: botStatus === "ACTIVE"
        ? "WhatsApp connected successfully!"
        : botStatus === "VERIFYING"
        ? "WhatsApp connection is being verified. This may take a few moments."
        : "WhatsApp connection saved."
    })
  } catch (error) {
    console.error("[Save Credentials] Error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: `Invalid data: ${error.errors[0]?.message || "Validation failed"}` },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : "Failed to save credentials"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
