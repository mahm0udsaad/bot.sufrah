import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import twilio from "twilio"
import { z } from "zod"

const payloadSchema = z.object({
  restaurantId: z.string().optional(),
})

const ensureTwilioCredentials = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials. Please contact support.")
  }

  return { accountSid, authToken }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { restaurantId: explicitRestaurantId } = payloadSchema.parse(body)

    // Authentication
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to connect WhatsApp." },
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

    // Get restaurant
    const restaurant = explicitRestaurantId
      ? await prisma.restaurant.findUnique({ where: { id: explicitRestaurantId } })
      : await prisma.restaurant.findFirst({ where: { userId: user.id } })

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant profile not found. Please complete your profile first." },
        { status: 404 }
      )
    }

    // Authorization check
    if (restaurant.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to connect this restaurant." },
        { status: 403 }
      )
    }

    const { accountSid, authToken } = ensureTwilioCredentials()
    const client = twilio(accountSid, authToken)

    // Build callback URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host") || "localhost:3000"}`
    const redirectUrl = new URL("/onboarding/whatsapp/callback", appUrl)
    redirectUrl.searchParams.set("restaurantId", restaurant.id)

    console.log(`[WhatsApp Embedded Signup] Creating signup for restaurant: ${restaurant.id}, name: ${restaurant.name}`)

    // Create embedded signup
    const signup = await client.whatsapp.embeddedSignups.create({
      redirectUrl: redirectUrl.toString(),
      displayName: restaurant.name || `Restaurant ${restaurant.id}`,
    })

    if (!signup.url) {
      throw new Error("Twilio did not return a signup URL. Please try again or contact support.")
    }

    console.log(`[WhatsApp Embedded Signup] Successfully created signup URL for restaurant: ${restaurant.id}`)

    return NextResponse.json({ success: true, url: signup.url })
  } catch (error) {
    console.error("[WhatsApp Embedded Signup] Error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request format." },
        { status: 400 }
      )
    }

    // Handle specific Twilio errors
    if (error && typeof error === "object" && "code" in error) {
      const twilioError = error as { code: number; message: string; moreInfo?: string }

      if (twilioError.code === 20003) {
        return NextResponse.json(
          { success: false, error: "Authentication failed. Please contact support to verify Twilio credentials." },
          { status: 500 }
        )
      }

      if (twilioError.code === 63100) {
        return NextResponse.json(
          { success: false, error: "WhatsApp Business account not set up. Please complete initial setup in Twilio Console first." },
          { status: 400 }
        )
      }

      if (twilioError.code === 63101) {
        return NextResponse.json(
          { success: false, error: "WhatsApp Embedded Signup is not enabled for your Twilio account. Please contact Twilio support." },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Twilio error (${twilioError.code}): ${twilioError.message}`,
          moreInfo: twilioError.moreInfo,
        },
        { status: 500 }
      )
    }

    const message = error instanceof Error ? error.message : "Failed to start WhatsApp connection. Please try again."
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

