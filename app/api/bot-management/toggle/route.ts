import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function getUserFromToken(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.userId as string
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { isActive } = await request.json()

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ success: false, message: "isActive must be a boolean" }, { status: 400 })
    }

    // Get restaurant for this user
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId },
      include: {
        bots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!restaurant || !restaurant.bots[0]) {
      return NextResponse.json({ success: false, message: "Bot not found" }, { status: 404 })
    }

    const bot = restaurant.bots[0]

    // Update bot activation status
    const updatedBot = await prisma.restaurantBot.update({
      where: { id: bot.id },
      data: { isActive },
    })

    // Exclude sensitive data
    const { authToken, ...botData } = updatedBot

    return NextResponse.json({ success: true, bot: botData })
  } catch (error) {
    console.error("Bot toggle API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

