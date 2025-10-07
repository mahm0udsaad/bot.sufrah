import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db, type OrderStatus } from "@/lib/db"
import { orderApi } from "@/lib/order-api"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const user = await db.getUserByPhone(userPhone)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const orders = await db.listOrders(restaurant.id)
    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error("Orders API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const user = await db.getUserByPhone(userPhone)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const orderData = await request.json()

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const order = await orderApi.createOrder(orderData)

    const items = Array.isArray(orderData.items)
      ? orderData.items.map((item: any) => {
          const qty = Number(item.quantity ?? item.qty ?? 1)
          const unit = Number(item.unit_price ?? item.unitAmount ?? item.unitCents ?? 0)
          const total = Number(item.total ?? item.totalAmount ?? item.totalCents ?? unit * qty)

          const unitCents = typeof item.unitCents === "number" ? item.unitCents : Math.round(unit * 100)
          const totalCents = typeof item.totalCents === "number" ? item.totalCents : Math.round(total * 100)

          return {
            name: item.name ?? "Item",
            qty,
            unitCents,
            totalCents,
          }
        })
      : []

    const normalizedStatus = typeof orderData.status === "string" ? orderData.status.toUpperCase() : undefined
    const orderStatus =
      normalizedStatus &&
      ["DRAFT", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(normalizedStatus)
        ? (normalizedStatus as OrderStatus)
        : undefined

    const dbOrder = await db.createOrder({
      restaurantId: restaurant.id,
      conversationId: orderData.conversation_id ?? null,
      status: orderStatus,
      totalCents: typeof orderData.total === "number" ? Math.round(orderData.total * 100) : undefined,
      currency: orderData.currency,
      meta: orderData,
      items,
    })

    await db.logUsage(restaurant.id, "order_created", { orderId: dbOrder.id })

    return NextResponse.json({ success: true, order, dbOrder })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
