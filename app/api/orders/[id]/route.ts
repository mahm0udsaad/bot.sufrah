import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { db, type OrderStatus } from "@/lib/db"

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserFromToken(request)
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const existing = await db.getOrder(restaurant.id, id)

    if (!existing) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    const payload = await request.json()
    const normalizedStatus =
      typeof payload.status === "string" ? payload.status.toUpperCase() : undefined

    const statusValue =
      normalizedStatus &&
      ["DRAFT", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(normalizedStatus)
        ? (normalizedStatus as OrderStatus)
        : undefined

    const nextMeta = {
      ...(existing.meta as Record<string, unknown> | null | undefined),
      payment_status: payload.payment_status ?? (existing.meta as any)?.payment_status,
      delivery_time: payload.delivery_time ?? (existing.meta as any)?.delivery_time,
    }

    const updatedOrder = await db.updateOrder(restaurant.id, id, {
      status: statusValue,
      meta: nextMeta,
    })

    await db.logUsage(restaurant.id, "order_updated", {
      orderId: id,
      status: statusValue,
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error("Update order error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
