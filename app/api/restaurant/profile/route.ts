import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
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

    // TODO: Replace with main Order System API
    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error("Restaurant profile API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
