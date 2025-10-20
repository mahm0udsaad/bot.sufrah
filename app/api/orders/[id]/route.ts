import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { db, type OrderStatus } from "@/lib/db"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)
    const { id } = await params

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
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
