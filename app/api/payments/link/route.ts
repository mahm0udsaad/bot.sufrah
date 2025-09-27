import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { orderApi } from "@/lib/order-api"

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

    const { order_id, amount } = await request.json()

    if (!order_id || !amount) {
      return NextResponse.json({ success: false, message: "Order ID and amount are required" }, { status: 400 })
    }

    // TODO: Replace with main Order System API
    const paymentLink = await orderApi.createPaymentLink(order_id, amount)

    return NextResponse.json(paymentLink)
  } catch (error) {
    console.error("Payment link API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
