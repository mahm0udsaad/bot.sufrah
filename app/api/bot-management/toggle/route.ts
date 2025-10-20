import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { isActive } = await request.json()

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ success: false, message: "isActive must be a boolean" }, { status: 400 })
    }

    // Get bot for this restaurant
    const bots = await prisma.restaurantBot.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    })

    if (!bots[0]) {
      return NextResponse.json({ success: false, message: "Bot not found" }, { status: 404 })
    }

    const bot = bots[0]

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

