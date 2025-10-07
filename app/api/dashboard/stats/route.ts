import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { db } from "@/lib/db"
import prisma from "@/lib/prisma"

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [activeConversations, todaysOrders, messagesToday, activeTemplates] = await Promise.all([
      prisma.conversation.count({ where: { restaurantId: restaurant.id, status: "OPEN" } }),
      prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } } }),
      prisma.message.count({ where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } } }),
      prisma.template.count({ where: { user_id: userId, status: "approved" } }),
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
