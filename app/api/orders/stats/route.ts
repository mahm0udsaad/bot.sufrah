import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [todaysOrders, revenueAgg, completionData] = await Promise.all([
      prisma.order.count({ where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } } }),
      prisma.order.aggregate({
        where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } },
        _sum: { totalCents: true },
        _avg: { totalCents: true },
      }),
      prisma.order.groupBy({
        where: { restaurantId: restaurant.id, createdAt: { gte: startOfDay } },
        by: ["status"],
        _count: { status: true },
      }),
    ])

    const totalRevenue = (revenueAgg._sum.totalCents ?? 0) / 100
    const avgOrderValue = (revenueAgg._avg.totalCents ?? 0) / 100

    const totalCount = completionData.reduce((sum, row) => sum + row._count.status, 0)
    const deliveredCount = completionData
      .filter((row) => row.status === "DELIVERED")
      .reduce((sum, row) => sum + row._count.status, 0)
    const completionRate = totalCount === 0 ? 0 : Number(((deliveredCount * 100) / totalCount).toFixed(1))

    const stats = {
      todays_orders: todaysOrders,
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue,
      completion_rate: completionRate,
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("Order stats API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
