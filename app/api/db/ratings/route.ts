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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const minRating = searchParams.get("minRating") ? parseInt(searchParams.get("minRating")!) : undefined
    const maxRating = searchParams.get("maxRating") ? parseInt(searchParams.get("maxRating")!) : undefined

    // Build where clause
    const where: any = {
      restaurantId: restaurant.id,
      rating: { not: null },
    }

    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {
        ...(minRating !== undefined && { gte: minRating }),
        ...(maxRating !== undefined && { lte: maxRating }),
      }
    }

    // Fetch ratings
    const orders = await prisma.order.findMany({
      where,
      orderBy: { ratedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        conversation: {
          select: {
            customerWa: true,
            customerName: true,
          },
        },
      },
    })

    // Transform to match API spec
    const ratings = orders.map((order) => ({
      id: order.id,
      orderReference: order.orderReference,
      orderNumber: null, // Not in schema, keeping as null for compatibility
      restaurantId: order.restaurantId,
      conversationId: order.conversationId,
      customerPhone: order.conversation?.customerWa || "",
      customerName: order.conversation?.customerName || null,
      rating: order.rating!,
      ratingComment: order.ratingComment,
      ratedAt: order.ratedAt!.toISOString(),
      ratingAskedAt: order.ratingAskedAt?.toISOString() || null,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      totalCents: order.totalCents,
      currency: order.currency,
      branchId: order.branchId,
      branchName: order.branchName,
      orderCreatedAt: order.createdAt.toISOString(),
    }))

    return NextResponse.json(ratings)
  } catch (error) {
    console.error("Ratings API error:", error)
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 })
  }
}

