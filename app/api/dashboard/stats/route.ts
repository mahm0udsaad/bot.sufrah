import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant, getAuthenticatedUser } from "@/lib/server-auth"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const [restaurant, user] = await Promise.all([
      getAuthenticatedRestaurant(request),
      getAuthenticatedUser(request)
    ])

    if (!restaurant || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [activeConversations, todaysOrders, messagesToday, activeTemplates] = await Promise.all([
      prisma.conversation.count({ where: { restaurantId: restaurant.id, status: "OPEN" } }),
      prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } } }),
      prisma.message.count({ where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } } }),
      prisma.template.count({ where: { user_id: user.id, status: "approved" } }),
    ])

    const stats = {
      active_conversations: activeConversations,
      todays_orders: todaysOrders,
      messages_today: messagesToday,
      active_templates: activeTemplates,
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("Dashboard stats API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
