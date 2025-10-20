import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { maxMessagesPerMin, maxMessagesPerDay } = await request.json()

    // Validate inputs
    if (
      typeof maxMessagesPerMin !== "number" ||
      typeof maxMessagesPerDay !== "number" ||
      maxMessagesPerMin < 1 ||
      maxMessagesPerDay < 1
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid rate limit values" },
        { status: 400 }
      )
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

    // Update rate limits
    const updatedBot = await prisma.restaurantBot.update({
      where: { id: bot.id },
      data: {
        maxMessagesPerMin,
        maxMessagesPerDay,
      },
    })

    // Exclude sensitive data
    const { authToken, ...botData } = updatedBot

    return NextResponse.json({ success: true, bot: botData })
  } catch (error) {
    console.error("Bot limits update API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

