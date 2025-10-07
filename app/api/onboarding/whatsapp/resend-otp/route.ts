import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payloadSchema = z.object({
  senderSid: z.string().min(1),
  method: z.enum(["sms", "voice"]).optional().default("sms"),
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
    const body = await request.json()
    const { senderSid, method } = payloadSchema.parse(body)

    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const bot = await prisma.restaurantBot.findFirst({ where: { senderSid } })
    if (!bot) {
      return NextResponse.json({ success: false, error: "Sender not found" }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: bot.restaurantId } })
    if (!restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user || restaurant.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { accountSid, authToken } = ensureTwilioCredentials()
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    // Resend verification code using Twilio Senders API (WhatsApp onboarding)
    const resendUrl = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}/Request`
    const resendResponse = await fetch(resendUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        verification_method: method === "voice" ? "call" : "sms",
      }).toString(),
    })

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.json().catch(() => ({}))
      const errorMessage = (errorBody as any)?.message || `Failed to resend OTP: ${resendResponse.status}`
      throw new Error(errorMessage)
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent via ${method === "voice" ? "call" : "SMS"}`
    })
  } catch (error) {
    console.error("Failed to resend OTP", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Failed to resend OTP"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
