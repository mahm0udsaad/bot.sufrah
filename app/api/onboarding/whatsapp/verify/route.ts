import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payloadSchema = z.object({
  senderSid: z.string().min(1),
  code: z.string().min(3),
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
  let botRecord: { restaurantId: string } | null = null
  try {
    console.log("\n========== [WhatsApp Verify] Step 1: Parse Request ==========")
    const body = await request.json()
    const { senderSid, code } = payloadSchema.parse(body)
    console.log(`[WhatsApp Verify] Sender SID: ${senderSid}`)
    console.log(`[WhatsApp Verify] OTP Code: ${code}`)

    console.log("\n========== [WhatsApp Verify] Step 2: Authenticate User ==========")
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value
    console.log(`[WhatsApp Verify] User phone from cookie: ${userPhone}`)

    if (!userPhone) {
      console.error("[WhatsApp Verify] ❌ No user-phone cookie found")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("\n========== [WhatsApp Verify] Step 3: Find Bot Record ==========")
    const bot = await prisma.restaurantBot.findFirst({ where: { senderSid } })
    if (!bot) {
      console.error(`[WhatsApp Verify] ❌ Bot not found for senderSid: ${senderSid}`)
      return NextResponse.json({ success: false, error: "Sender not found" }, { status: 404 })
    }
    console.log(`[WhatsApp Verify] ✓ Bot found: ${bot.id} (Restaurant: ${bot.restaurantId})`)

    botRecord = { restaurantId: bot.restaurantId }

    console.log("\n========== [WhatsApp Verify] Step 4: Verify Authorization ==========")
    const restaurant = await prisma.restaurant.findUnique({ where: { id: bot.restaurantId } })
    if (!restaurant) {
      console.error(`[WhatsApp Verify] ❌ Restaurant not found: ${bot.restaurantId}`)
      return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
    }
    console.log(`[WhatsApp Verify] ✓ Restaurant found: ${restaurant.name}`)

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user || restaurant.userId !== user.id) {
      console.error(`[WhatsApp Verify] ❌ Authorization failed`)
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    console.log(`[WhatsApp Verify] ✓ User authorized`)

    console.log("\n========== [WhatsApp Verify] Step 5: Submit OTP to Twilio ==========")
    const { accountSid, authToken } = ensureTwilioCredentials()
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    // Complete verification using Twilio Senders API (WhatsApp onboarding)
    const verifyUrl = `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}/Complete`
    console.log(`[WhatsApp Verify] Verify URL: ${verifyUrl}`)
    console.log(`[WhatsApp Verify] 🔄 Submitting OTP code...`)

    const verifyResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        verification_code: code.trim(),
      }).toString(),
    })

    console.log(`[WhatsApp Verify] Twilio verification response status: ${verifyResponse.status}`)

    if (!verifyResponse.ok) {
      const errorBody = await verifyResponse.json().catch(() => ({}))
      console.error(`[WhatsApp Verify] ❌ Verification failed:`, JSON.stringify(errorBody, null, 2))
      const errorMessage = (errorBody as any)?.message || `Verification failed: ${verifyResponse.status}`
      throw new Error(errorMessage)
    }

    const verifyData = await verifyResponse.json()
    console.log(`[WhatsApp Verify] ✓ Verification response:`, JSON.stringify(verifyData, null, 2))

    const sendersStatus = (verifyData as any)?.status || (verifyData as any)?.configuration?.verification?.status
    const approved = sendersStatus === "ONLINE" || sendersStatus === "VERIFIED" || sendersStatus === "ACTIVE"

    console.log("\n========== [WhatsApp Verify] Step 6: Determine Final Status ==========")
    let finalStatus = "VERIFYING"
    if (approved) {
      finalStatus = "ACTIVE"
      console.log(`[WhatsApp Verify] ✓ Sender verified, setting status to ACTIVE`)
    } else {
      console.log(`[WhatsApp Verify] ⚠️ Sender still not active (status: ${sendersStatus}), keeping as VERIFYING`)
    }

    console.log("\n========== [WhatsApp Verify] Step 7: Update Database ==========")
    console.log(`[WhatsApp Verify] Setting bot status to: ${finalStatus}`)
    const updatedBot = await prisma.restaurantBot.update({
      where: { restaurantId: bot.restaurantId },
      data: {
        status: finalStatus,
        verifiedAt: finalStatus === "ACTIVE" ? new Date() : null,
        errorMessage: null,
      },
    })
    console.log(`[WhatsApp Verify] ✓ Bot updated in database`)

    console.log("\n========== [WhatsApp Verify] Step 8: SUCCESS ==========")
    console.log(`[WhatsApp Verify] ✅ Verification complete. Final status: ${finalStatus}`)
    return NextResponse.json({ success: true, bot: updatedBot })
  } catch (error) {
    console.error("WhatsApp sender verification failed", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid verification payload" }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Verification failed"

    if (botRecord) {
      try {
        await prisma.restaurantBot.update({
          where: { restaurantId: botRecord.restaurantId },
          data: { status: "FAILED", errorMessage: message },
        })
      } catch (updateError) {
        console.error("Failed to persist verification error", updateError)
      }
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
