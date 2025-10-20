import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

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
    const restaurant = await getAuthenticatedRestaurant(request)

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
