import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""

async function verifyUser(): Promise<boolean> {
  const cookieStore = await cookies()
  const userPhone = cookieStore.get("user-phone")?.value
  if (!userPhone) return false
  const user = await prisma.user.findUnique({ where: { phone: userPhone } })
  return Boolean(user)
}

// Resolve current restaurant from cookie-bound user session
async function resolveRestaurantId(): Promise<string | null> {
  const cookieStore = await cookies()
  const userPhone = cookieStore.get("user-phone")?.value
  if (!userPhone) return null
  const user = await prisma.user.findUnique({ where: { phone: userPhone } })
  if (!user) return null
  const restaurant = await prisma.restaurant.findFirst({ where: { userId: user.id } })
  return restaurant?.id ?? null
}

// POST /api/onboarding/link-sender  { botId: string, restaurantId?: string }
export async function POST(request: NextRequest) {
  const ok = await verifyUser()
  if (!ok) return NextResponse.json({ error: "غير مصرح - Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({})) as { botId?: string; restaurantId?: string }
    const botId = body.botId
    if (!botId) {
      return NextResponse.json({ error: "botId is required" }, { status: 400 })
    }

    // Determine restaurantId
    const currentRestaurantId = body.restaurantId || (await resolveRestaurantId())
    if (!currentRestaurantId) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }

    // Proxy update to external bot service
    const response = await fetch(`${BOT_API_URL}/admin/bots/${encodeURIComponent(botId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restaurantId: currentRestaurantId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(error || { error: "Failed to link sender" }, { status: response.status })
    }

    // Fetch updated bot details from external service
    const getRes = await fetch(`${BOT_API_URL}/admin/bots/${encodeURIComponent(botId)}`, {
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!getRes.ok) {
      // Linking succeeded, but we couldn't fetch details; still return success
      return NextResponse.json({ success: true })
    }

    const extBot = await getRes.json()

    // Normalize number to +E.164 (ensure plus, strip whatsapp:)
    const normalizePlus = (value?: string | null) => {
      if (!value || typeof value !== "string") return ""
      const withoutPrefix = value.startsWith("whatsapp:") ? value.slice(9) : value
      return withoutPrefix.startsWith("+") ? withoutPrefix : `+${withoutPrefix}`
    }

    const normalizedNumber = normalizePlus(extBot.whatsappNumber)

    // Upsert local RestaurantBot record
    const existingBotRecord = await prisma.restaurantBot.findFirst({ where: { restaurantId: currentRestaurantId } })

    const botData = {
      accountSid: extBot.accountSid || extBot.subaccountSid || extBot.account_sid,
      name: extBot.name || extBot.restaurantName || "",
      restaurantName: extBot.restaurantName || extBot.name || "",
      whatsappNumber: normalizedNumber,
      senderSid: extBot.senderSid || extBot.sender_sid || null,
      wabaId: extBot.wabaId || extBot.waba_id || null,
      status: "ACTIVE" as const,
      verifiedAt: new Date(),
      errorMessage: null as string | null,
      verificationSid: null as string | null,
      subaccountSid: extBot.subaccountSid || extBot.accountSid || null,
      authToken: extBot.authToken || null,
    }

    const localBot = existingBotRecord
      ? await prisma.restaurantBot.update({ where: { id: existingBotRecord.id }, data: botData })
      : await prisma.restaurantBot.create({ data: { ...botData, restaurantId: currentRestaurantId } })

    // Update Restaurant profile number to normalized digits
    await prisma.restaurant.update({ where: { id: currentRestaurantId }, data: { whatsappNumber: normalizedNumber } })

    return NextResponse.json({ success: true, bot: localBot })
  } catch (error) {
    console.error("[onboarding/link-sender] Unexpected error", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}


