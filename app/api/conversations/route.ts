import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { db } from "@/lib/db"

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const takeParam = request.nextUrl.searchParams.get("take")
    const cursorId = request.nextUrl.searchParams.get("cursor")
    const take = takeParam ? Math.min(Math.max(parseInt(takeParam, 10) || 0, 1), 100) : 50

    const conversations = await db.listConversations(restaurant.id, take, cursorId ?? undefined)

    return NextResponse.json({ success: true, conversations })
  } catch (error) {
    console.error("Conversations API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const { customer_phone, customer_name } = await request.json()

    if (!customer_phone) {
      return NextResponse.json({ success: false, message: "Customer phone is required" }, { status: 400 })
    }

    // Find or create conversation using normalized phone
    const conversation = await db.findOrCreateConversation(
      restaurant.id,
      customer_phone,
      customer_name ?? null,
    )

    return NextResponse.json({ success: true, conversation })
  } catch (error) {
    console.error("Create conversation error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
