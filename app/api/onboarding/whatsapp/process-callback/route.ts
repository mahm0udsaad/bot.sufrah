import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import twilio from "twilio"
import { z } from "zod"

const payloadSchema = z.object({
  restaurantId: z.string(),
  code: z.string().optional(),
  embeddedSignupId: z.string().optional(),
  allParams: z.record(z.string()).optional(),
})

const ensureTwilioCredentials = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials")
  }

  return { accountSid, authToken }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { restaurantId, code, embeddedSignupId, allParams } = payloadSchema.parse(body)

    console.log("[Process Callback] Received:", { restaurantId, code, embeddedSignupId, allParams })

    // Authentication
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant || restaurant.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found or access denied." },
        { status: 403 }
      )
    }

    const { accountSid, authToken } = ensureTwilioCredentials()
    const client = twilio(accountSid, authToken)

    // If we have an embeddedSignupId, fetch the embedded signup details
    if (embeddedSignupId) {
      try {
        console.log(`[Process Callback] Fetching embedded signup: ${embeddedSignupId}`)
        const signup = await client.whatsapp.embeddedSignups(embeddedSignupId).fetch()

        console.log("[Process Callback] Embedded signup data:", {
          sid: signup.sid,
          status: signup.status,
          wabaId: signup.wabaId,
          phoneNumber: signup.phoneNumber,
        })

        // Extract the WhatsApp sender information
        const wabaId = signup.wabaId
        const phoneNumber = signup.phoneNumber
        const senderSid = signup.sid // or might need to fetch separately

        if (!wabaId || !phoneNumber) {
          throw new Error("Incomplete signup data from Twilio")
        }

        // Save credentials
        const bot = await prisma.restaurantBot.upsert({
          where: { restaurantId: restaurant.id },
          update: {
            accountSid,
            name: restaurant.name,
            restaurantName: restaurant.name,
            whatsappNumber: phoneNumber,
            senderSid: senderSid || null,
            wabaId,
            status: signup.status === "APPROVED" ? "ACTIVE" : "VERIFYING",
            verifiedAt: signup.status === "APPROVED" ? new Date() : null,
            errorMessage: null,
            verificationSid: null, // No OTP needed for embedded signup
            subaccountSid: accountSid,
            authToken: authToken,
          },
          create: {
            restaurantId: restaurant.id,
            accountSid,
            name: restaurant.name,
            restaurantName: restaurant.name,
            whatsappNumber: phoneNumber,
            senderSid: senderSid || null,
            wabaId,
            status: signup.status === "APPROVED" ? "ACTIVE" : "VERIFYING",
            verifiedAt: signup.status === "APPROVED" ? new Date() : null,
            verificationSid: null,
            subaccountSid: accountSid,
            authToken: authToken,
          },
        })

        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { whatsappNumber: phoneNumber },
        })

        console.log(`[Process Callback] Successfully saved bot for restaurant ${restaurantId}`)

        return NextResponse.json({
          success: true,
          bot,
          message: "WhatsApp connected successfully!",
        })
      } catch (twilioError) {
        console.error("[Process Callback] Twilio API error:", twilioError)
        throw twilioError
      }
    }

    // If we don't have proper callback data, return error
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process callback. No valid signup information received from Twilio.",
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Process Callback] Error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid callback data" },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : "Failed to process WhatsApp connection"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
