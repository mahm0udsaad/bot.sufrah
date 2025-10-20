import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    // Fetch order with rating
    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
        rating: { not: null },
      },
      include: {
        conversation: {
          select: {
            customerWa: true,
            customerName: true,
          },
        },
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 })
    }

    // Transform to match API spec
    const rating = {
      id: order.id,
      orderReference: order.orderReference,
      orderNumber: null, // Not in schema
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
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.qty,
        unitCents: item.unitCents,
        totalCents: item.totalCents,
      })),
    }

    return NextResponse.json(rating)
  } catch (error) {
    console.error("Rating detail API error:", error)
    return NextResponse.json({ error: "Failed to fetch rating" }, { status: 500 })
  }
}

