import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payloadSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Invalid phone format"),
  restaurantId: z.string().optional(),
  profile: z
    .object({
      name: z.string().min(1).optional(),
      address: z.string().optional(),
      emails: z.array(z.string().email()).optional(),
      vertical: z.string().optional(),
      logo_url: z.string().url().optional(),
      description: z.string().optional(),
      about: z.string().optional(),
      websites: z.array(z.string().url()).optional(),
    })
    .optional(),
  webhook: z
    .object({
      callback_method: z.enum(["GET", "POST"]).optional(),
      callback_url: z.string().url(),
    })
    .optional(),
})

const ensureTwilioCredentials = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const wabaId = process.env.TWILIO_WABA_ID

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
  }

  if (!wabaId) {
    throw new Error("Missing TWILIO_WABA_ID - This is required to register WhatsApp senders")
  }

  return { accountSid, authToken, wabaId }
}

// Helper function to check sender status
async function checkSenderStatus(senderSid: string, accountSid: string, authToken: string) {
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  const url = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch sender status: ${response.status}`)
  }

  return await response.json()
}

// Helper function to request verification
async function requestVerification(senderSid: string, accountSid: string, authToken: string) {
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  const url = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}/Request`
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      verification_method: "sms"
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(`Failed to request verification: ${JSON.stringify(errorBody)}`)
  }

  return await response.json()
}

// Poll sender status until it's ready for verification
async function waitForSenderReady(senderSid: string, accountSid: string, authToken: string, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`[WhatsApp Start] 🔄 Polling attempt ${i + 1}/${maxAttempts}...`)
    const senderStatus = await checkSenderStatus(senderSid, accountSid, authToken)
    
    console.log(`[WhatsApp Start] Sender status: ${senderStatus.status}`)
    
    if (senderStatus.status === "UNVERIFIED" || senderStatus.status === "VERIFIED") {
      console.log(`[WhatsApp Start] ✓ Sender is ready (${senderStatus.status})`)
      return senderStatus
    }
    
    if (senderStatus.status === "FAILED") {
      throw new Error("Sender creation failed")
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  throw new Error("Sender creation timed out")
}

export async function POST(request: Request) {
  let restaurantRecord: { id: string } | null = null
  try {
    console.log("\n========== [WhatsApp Start] Step 1: Parse Request ==========")
    const body = await request.json()
    const {
      phone,
      restaurantId: explicitRestaurantId,
      profile: profileInput,
      webhook: webhookInput,
    } = payloadSchema.parse(body)
    console.log(`[WhatsApp Start] Received phone: ${phone}, restaurantId: ${explicitRestaurantId || "auto-detect"}`)

    console.log("\n========== [WhatsApp Start] Step 2: Authenticate User ==========")
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value
    console.log(`[WhatsApp Start] User phone from cookie: ${userPhone}`)

    if (!userPhone) {
      console.error("[WhatsApp Start] ❌ No user-phone cookie found")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user) {
      console.error(`[WhatsApp Start] ❌ User not found for phone: ${userPhone}`)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    console.log(`[WhatsApp Start] ✓ User authenticated: ${user.id}`)

    console.log("\n========== [WhatsApp Start] Step 3: Get Restaurant ==========")
    const restaurant = explicitRestaurantId
      ? await prisma.restaurant.findUnique({ where: { id: explicitRestaurantId } })
      : await prisma.restaurant.findFirst({ where: { userId: user.id } })

    if (!restaurant) {
      console.error(`[WhatsApp Start] ❌ Restaurant not found`)
      return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
    }
    console.log(`[WhatsApp Start] ✓ Restaurant found: ${restaurant.id} (${restaurant.name})`)

    if (explicitRestaurantId && restaurant.id !== explicitRestaurantId) {
      console.error(`[WhatsApp Start] ❌ Restaurant mismatch`)
      return NextResponse.json({ success: false, error: "Restaurant mismatch" }, { status: 403 })
    }

    restaurantRecord = { id: restaurant.id }

    console.log("\n========== [WhatsApp Start] Step 4: Load Twilio Credentials ==========")
    const { accountSid, authToken, wabaId } = ensureTwilioCredentials()
    console.log(`[WhatsApp Start] ✓ Account SID: ${accountSid}`)
    console.log(`[WhatsApp Start] ✓ WABA ID: ${wabaId}`)

    const normalizedPhone = phone.trim()
    const displayName = profileInput?.name || restaurant.name || `Restaurant ${restaurant.id}`
    console.log(`[WhatsApp Start] Display name: ${displayName}`)

    console.log("\n========== [WhatsApp Start] Step 5: Register Sender with Twilio ==========")
    const sendersUrl = "https://messaging.twilio.com/v2/Channels/Senders"

    const profilePayload: Record<string, unknown> = { name: displayName }
    if (profileInput?.address) profilePayload.address = profileInput.address
    if (profileInput?.emails?.length) profilePayload.emails = profileInput.emails
    if (profileInput?.vertical) profilePayload.vertical = profileInput.vertical
    if (profileInput?.logo_url) profilePayload.logo_url = profileInput.logo_url
    if (profileInput?.description) profilePayload.description = profileInput.description
    if (profileInput?.about) profilePayload.about = profileInput.about
    if (profileInput?.websites?.length) profilePayload.websites = profileInput.websites

    const senderPayload: Record<string, unknown> = {
      sender_id: `whatsapp:${normalizedPhone}`,
      profile: profilePayload,
      verification_method: "sms",
      configuration: { waba_id: wabaId },
    }

    // Configure webhook URL: prefer payload, else env, else default domain
    const envWebhookUrl = process.env.BOT_WEBHOOK_URL || (process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/bot/webhook` : "https://bot.sufrah.sa/api/bot/webhook")
    const effectiveWebhookUrl = webhookInput?.callback_url || envWebhookUrl
    ;(senderPayload as any).webhook = {
      callback_method: (webhookInput?.callback_method ?? "POST") as "GET" | "POST",
      callback_url: effectiveWebhookUrl,
    }
    console.log(`[WhatsApp Start] Request payload:`, JSON.stringify(senderPayload, null, 2))

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    console.log(`[WhatsApp Start] 🔄 Calling Twilio Senders API...`)
    const response = await fetch(sendersUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(senderPayload),
    })

    console.log(`[WhatsApp Start] Twilio response status: ${response.status}`)

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      console.error(`[WhatsApp Start] ❌ Twilio API error:`, JSON.stringify(errorBody, null, 2))

      const errorCode = (errorBody as any)?.error_code || (errorBody as any)?.code
      const errorMessage = (errorBody as any)?.message || `Twilio API error: ${response.status}`

      if (errorCode === "63100") {
        console.error(`[WhatsApp Start] ❌ Error 63100: First sender must be created via Console Self Sign-Up`)
        return NextResponse.json({
          success: false,
          error:
            "Twilio requires the first WhatsApp sender to be created in the Twilio Console (Self Sign-Up). Complete the initial onboarding in Twilio, then retry here.",
        }, { status: 400 })
      }

      if (errorCode === "20422") {
        console.error(`[WhatsApp Start] ❌ Error 20422: Phone number already registered`)
        return NextResponse.json({
          success: false,
          error:
            "This phone number is already registered. If you need to re-register it, please deregister it first.",
        }, { status: 400 })
      }

      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
    }

    const senderData = await response.json()
    console.log(`[WhatsApp Start] ✓ Twilio response:`, JSON.stringify(senderData, null, 2))
    console.log(`[WhatsApp Start] ✓ Sender SID: ${senderData.sid}`)
    console.log(`[WhatsApp Start] ✓ Initial Status: ${senderData.status}`)

    // NEW: Wait for sender to be ready and request verification
    console.log("\n========== [WhatsApp Start] Step 5b: Wait for Sender Ready ==========")
    let verificationSid: string | null = null
    
    if (senderData.status === "CREATING") {
      console.log(`[WhatsApp Start] Sender is CREATING, waiting for UNVERIFIED status...`)
      
      try {
        const readySender = await waitForSenderReady(senderData.sid, accountSid, authToken)
        
        if (readySender.status === "UNVERIFIED") {
          console.log(`[WhatsApp Start] 🔄 Requesting SMS verification...`)
          const verificationResponse = await requestVerification(senderData.sid, accountSid, authToken)
          verificationSid = verificationResponse.verification_sid
          console.log(`[WhatsApp Start] ✓ Verification requested! SID: ${verificationSid}`)
        } else {
          console.log(`[WhatsApp Start] ⚠️ Sender is already ${readySender.status}`)
        }
      } catch (pollError) {
        console.error(`[WhatsApp Start] ⚠️ Polling failed:`, pollError)
        // Continue anyway, save what we have
      }
    } else if (senderData.status === "UNVERIFIED") {
      // Sender is immediately ready
      console.log(`[WhatsApp Start] 🔄 Sender is UNVERIFIED, requesting SMS verification...`)
      const verificationResponse = await requestVerification(senderData.sid, accountSid, authToken)
      verificationSid = verificationResponse.verification_sid
      console.log(`[WhatsApp Start] ✓ Verification requested! SID: ${verificationSid}`)
    }

    console.log("\n========== [WhatsApp Start] Step 6: Save to Database ==========")
    const bot = await prisma.restaurantBot.upsert({
      where: { restaurantId: restaurant.id },
      update: {
        accountSid,
        name: displayName,
        restaurantName: restaurant.name,
        subaccountSid: accountSid,
        authToken,
        whatsappNumber: normalizedPhone,
        senderSid: senderData.sid,
        verificationSid: verificationSid,
        wabaId: wabaId,
        status: "VERIFYING",
        verifiedAt: null,
        errorMessage: null,
      },
      create: {
        restaurantId: restaurant.id,
        accountSid,
        name: displayName,
        restaurantName: restaurant.name,
        subaccountSid: accountSid,
        authToken,
        whatsappNumber: normalizedPhone,
        senderSid: senderData.sid,
        verificationSid: verificationSid,
        wabaId: wabaId,
        status: "VERIFYING",
      },
    })
    console.log(`[WhatsApp Start] ✓ Bot saved to database: ${bot.id}`)
    console.log(`[WhatsApp Start] ✓ Status: ${bot.status}`)

    console.log("\n========== [WhatsApp Start] Step 7: SUCCESS ==========")
    
    if (verificationSid) {
      console.log(`[WhatsApp Start] ✅ OTP sent to ${normalizedPhone}`)
      return NextResponse.json({ 
        success: true, 
        bot, 
        message: "OTP sent. Check your phone.",
        hasVerification: true 
      })
    } else {
      console.log(`[WhatsApp Start] ⚠️ Sender created but verification not ready yet`)
      return NextResponse.json({ 
        success: true, 
        bot, 
        message: "Sender created. Verification will be available shortly.",
        hasVerification: false 
      })
    }
  } catch (error) {
    console.error("WhatsApp sender registration failed", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Unexpected Twilio error"

    if (restaurantRecord) {
      try {
        await prisma.restaurantBot.updateMany({
          where: { restaurantId: restaurantRecord.id },
          data: { status: "FAILED", errorMessage: message },
        })
      } catch (persistError) {
        console.error("Failed to persist registration error", persistError)
      }
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
