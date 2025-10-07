import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SignJWT } from "jose"
import { db } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const user = await db.getUserByPhone(userPhone)

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const jwt = await new SignJWT({ restaurantId: restaurant.id, userId: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET)

    const wsUrl = process.env.NEXT_PUBLIC_REALTIME_WS_URL || process.env.REALTIME_WS_URL || ""

    return NextResponse.json({ success: true, token: jwt, restaurantId: restaurant.id, wsUrl })
  } catch (error) {
    console.error("Realtime token error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
