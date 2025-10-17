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
    console.log("[admin/bots/[id]] No authorization header")
    return false
  }

  const password = authHeader.replace("Bearer ", "").trim()
  const isValid = password === ADMIN_PASSWORD
  
  if (!isValid) {
    console.log("[admin/bots/[id]] Invalid admin password")
  }
  
  return isValid
}

/**
 * GET /api/admin/bots/[id]
 * Get a specific bot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify admin authentication
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "غير مصرح - Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const response = await fetch(`${BOT_API_URL}/admin/bots/${params.id}`, {
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "البوت غير موجود - Bot not found" },
          { status: 404 }
        )
      }
      throw new Error(`Bot API error: ${response.status}`)
    }

    const bot = await response.json()
    return NextResponse.json(bot)
  } catch (error: any) {
    console.error(`[admin/bots/${params.id}] Failed to fetch bot:`, error)
    return NextResponse.json(
      { error: "فشل في جلب البوت - Failed to fetch bot" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/bots/[id]
 * Update a bot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify admin authentication
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "غير مصرح - Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // Normalize whatsappNumber if present: ensure leading plus
    if (body && typeof body.whatsappNumber === "string") {
      const original: string = body.whatsappNumber
      const withoutPrefix = original.startsWith("whatsapp:") ? original.slice(9) : original
      const withPlus = withoutPrefix.startsWith("+") ? withoutPrefix : `+${withoutPrefix}`
      body.whatsappNumber = original.startsWith("whatsapp:") ? `whatsapp:${withPlus}` : withPlus
    }

    const response = await fetch(`${BOT_API_URL}/admin/bots/${params.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const bot = await response.json()
    return NextResponse.json(bot)
  } catch (error: any) {
    console.error(`[admin/bots/${params.id}] Failed to update bot:`, error)
    return NextResponse.json(
      { error: "فشل في تحديث البوت - Failed to update bot" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/bots/[id]
 * Delete a bot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify admin authentication
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { error: "غير مصرح - Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const response = await fetch(`${BOT_API_URL}/admin/bots/${params.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "البوت غير موجود - Bot not found" },
          { status: 404 }
        )
      }
      throw new Error(`Bot API error: ${response.status}`)
    }

    return NextResponse.json({ success: true, message: "تم حذف البوت - Bot deleted" })
  } catch (error: any) {
    console.error(`[admin/bots/${params.id}] Failed to delete bot:`, error)
    return NextResponse.json(
      { error: "فشل في حذف البوت - Failed to delete bot" },
      { status: 500 }
    )
  }
}

