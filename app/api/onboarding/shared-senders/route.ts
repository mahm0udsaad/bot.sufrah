import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""
// Require an authenticated dashboard user (not admin) to access
async function verifyUser(): Promise<boolean> {
  const cookieStore = await cookies()
  const userPhone = cookieStore.get("user-phone")?.value
  if (!userPhone) return false
  const user = await prisma.user.findUnique({ where: { phone: userPhone } })
  return Boolean(user)
}

// GET /api/onboarding/shared-senders
// Returns active, unassigned bots from the external bot service
export async function GET(_request: NextRequest) {
  const ok = await verifyUser()
  if (!ok) return NextResponse.json({ error: "غير مصرح - Unauthorized" }, { status: 401 })

  try {
    const response = await fetch(`${BOT_API_URL}/admin/bots`, {
      headers: {
        Authorization: `Bearer ${BOT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("[onboarding/shared-senders] Bot API error", response.status, errorText)
      return NextResponse.json({ error: "Failed to fetch senders" }, { status: response.status })
    }

    const all = (await response.json()) as any[]
    const filtered = all.filter((b) => b?.isActive === true && (b?.restaurantId == null || b?.restaurantId === null))
    return NextResponse.json(filtered)
  } catch (error) {
    console.error("[onboarding/shared-senders] Unexpected error", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}


