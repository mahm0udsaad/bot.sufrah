import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.getUserByPhone(userPhone)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }

    // Fetch all rated orders
    const ratedOrders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        rating: { not: null },
      },
      select: {
        rating: true,
      },
    })
    console.log("ratedOrders", ratedOrders)
    // Calculate statistics
    const totalRatings = ratedOrders.length
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let sum = 0

    for (const order of ratedOrders) {
      if (order.rating) {
        sum += order.rating
        distribution[order.rating] = (distribution[order.rating] || 0) + 1
      }
    }

    const averageRating = totalRatings > 0 ? Math.round((sum / totalRatings) * 100) / 100 : 0

    return NextResponse.json({
      totalRatings,
      averageRating,
      distribution,
    })
  } catch (error) {
    console.error("Ratings stats API error:", error)
    return NextResponse.json({ error: "Failed to fetch rating stats" }, { status: 500 })
  }
}

