import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("[logs/outbound] GET request received")
  
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      console.log("[logs/outbound] ❌ Authentication failed - returning 401")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    console.log("[logs/outbound] ✅ Authenticated - fetching messages for restaurant:", restaurant.id)

    // Get filters from query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    console.log("[logs/outbound] Filters - status:", statusFilter, "limit:", limit)

    // Build where clause
    const where: any = {
      restaurantId: restaurant.id,
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter
    }

    // Fetch outbound messages
    const messages = await prisma.outboundMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500), // Max 500 messages
    })

    console.log("[logs/outbound] ✅ Found", messages.length, "outbound messages")

    return NextResponse.json({ success: true, messages })
  } catch (error) {
    console.error("[logs/outbound] ❌ Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

