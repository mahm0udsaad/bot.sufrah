import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function checkSenderStatus(senderSid: string, accountSid: string, authToken: string) {
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  const url = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Basic ${basicAuth}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch sender status: ${response.status}`)
  }

  return (await response.json()) as any
}

async function requestVerification(senderSid: string, accountSid: string, authToken: string) {
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  const url = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}/Request`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ verification_method: "sms" }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(`Failed to request verification: ${JSON.stringify(errorBody)}`)
  }

  return (await response.json()) as any
}

async function resolveRestaurantId(request: NextRequest): Promise<string | null> {
  const explicitId = request.nextUrl.searchParams.get("restaurantId")
  if (explicitId) {
    return explicitId
  }

  const cookieStore = await cookies()
  const userPhone = cookieStore.get("user-phone")?.value
  if (!userPhone) {
    return null
  }

  const user = await prisma.user.findUnique({ where: { phone: userPhone } })
  if (!user) {
    return null
  }

  const restaurant = await prisma.restaurant.findFirst({ where: { userId: user.id } })
  return restaurant?.id ?? null
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(request)

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
    }

    let bot = await prisma.restaurantBot.findUnique({ where: { restaurantId } })

    // If we're in VERIFYING but have no verificationSid yet, try to advance automatically
    if (bot?.status === "VERIFYING" && bot?.senderSid && !bot?.verificationSid) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN

        if (accountSid && authToken) {
          const sender = await checkSenderStatus(bot.senderSid, accountSid, authToken)
          const status = sender?.status as string | undefined

          // When Twilio reports UNVERIFIED, request OTP and persist verificationSid
          if (status === "UNVERIFIED") {
            const verification = await requestVerification(bot.senderSid, accountSid, authToken)
            const verificationSid = verification?.verification_sid as string | undefined

            if (verificationSid) {
              bot = await prisma.restaurantBot.update({
                where: { restaurantId },
                data: { verificationSid },
              })
            }
          }
        }
      } catch (advanceError) {
        // Non-fatal; keep returning current bot state
        console.warn("GET /api/onboarding/whatsapp advance error:", advanceError)
      }
    }

    const isShared = !!bot?.whatsappNumber && bot.whatsappNumber === process.env.TWILIO_WHATSAPP_FROM
    return NextResponse.json({ success: true, bot, isShared })
  } catch (error) {
    console.error("Failed to fetch WhatsApp bot", error)
    return NextResponse.json({ success: false, error: "Failed to fetch WhatsApp bot" }, { status: 500 })
  }
}
