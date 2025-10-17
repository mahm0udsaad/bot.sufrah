import { NextRequest, NextResponse } from "next/server"

const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""

/**
 * Verify admin authentication from dashboard
 */
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    console.log("[admin/bots] No authorization header")
    return false
  }

  const password = authHeader.replace("Bearer ", "").trim()
  const isValid = password === ADMIN_PASSWORD
  
  if (!isValid) {
    console.log("[admin/bots] Invalid admin password")
  }
  
  return isValid
}

/**
 * GET /api/admin/bots
 * List all registered bots
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication from dashboard
  if (!verifyAdmin(request)) {
    console.log("[admin/bots] GET - Admin verification failed")
    return NextResponse.json(
      { error: "غير مصرح - Unauthorized" },
      { status: 401 }
    )
  }

  try {
    console.log("[admin/bots] GET - Fetching from bot service:", `${BOT_API_URL}/admin/bots`)
    
    // Use BOT_API_TOKEN to authenticate with the external bot service
    const response = await fetch(`${BOT_API_URL}/admin/bots`, {
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log("[admin/bots] GET - Bot service response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[admin/bots] Bot API error:", response.status, errorText)
      throw new Error(`Bot API error: ${response.status}`)
    }

    const bots = await response.json()
    console.log("[admin/bots] GET - Successfully fetched", bots.length, "bots")
    return NextResponse.json(bots)
  } catch (error: any) {
    console.error("[admin/bots] Failed to fetch bots:", error)
    return NextResponse.json(
      { error: "فشل في جلب البوتات - Failed to fetch bots" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/bots
 * Register a new bot
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication from dashboard
  if (!verifyAdmin(request)) {
    console.log("[admin/bots] POST - Admin verification failed")
    return NextResponse.json(
      { error: "غير مصرح - Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // Normalize whatsappNumber to ensure leading plus for the phone part
    if (body && typeof body.whatsappNumber === "string") {
      const original: string = body.whatsappNumber
      const withoutPrefix = original.startsWith("whatsapp:") ? original.slice(9) : original
      const withPlus = withoutPrefix.startsWith("+") ? withoutPrefix : `+${withoutPrefix}`
      body.whatsappNumber = original.startsWith("whatsapp:") ? `whatsapp:${withPlus}` : withPlus
    }

    console.log("[admin/bots] POST - Creating bot:", body.name, body.whatsappNumber)

    // Use BOT_API_TOKEN to authenticate with the external bot service
    const response = await fetch(`${BOT_API_URL}/admin/bots`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    console.log("[admin/bots] POST - Bot service response status:", response.status)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      console.error("[admin/bots] Failed to create bot:", error)
      return NextResponse.json(error, { status: response.status })
    }

    const bot = await response.json()
    console.log("[admin/bots] POST - Successfully created bot:", bot.id)
    return NextResponse.json(bot, { status: 201 })
  } catch (error: any) {
    console.error("[admin/bots] Failed to create bot:", error)
    return NextResponse.json(
      { error: "فشل في إنشاء البوت - Failed to create bot" },
      { status: 500 }
    )
  }
}

