import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("[bot-management] GET request received")
  
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      console.log("[bot-management] ❌ Authentication failed - returning 401")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    console.log("[bot-management] ✅ Authenticated - fetching bot for restaurant:", restaurant.id)

    // Get bot for this restaurant
    const bots = await prisma.restaurantBot.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    })

    const bot = bots[0]

    if (!bot) {
      console.log("[bot-management] ❌ No bot found for restaurant:", restaurant.id)
      return NextResponse.json({ success: false, message: "No bot configuration found" }, { status: 404 })
    }

    console.log("[bot-management] ✅ Bot found - id:", bot.id, "isActive:", bot.isActive)

    // Return bot data (excluding sensitive auth token)
    const { authToken, ...botData } = bot

    return NextResponse.json({ success: true, bot: botData })
  } catch (error) {
    console.error("[bot-management] ❌ Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

