import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  console.log("[logs/webhook] GET request received")
  
  try {
    const restaurant = await getAuthenticatedRestaurant(request)

    if (!restaurant) {
      console.log("[logs/webhook] ❌ Authentication failed - returning 401")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    console.log("[logs/webhook] ✅ Authenticated - fetching logs for restaurant:", restaurant.id)

    // Get filters from query params
    const { searchParams } = new URL(request.url)
    const pathFilter = searchParams.get("path")
    const statusFilter = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    console.log("[logs/webhook] Filters - path:", pathFilter, "status:", statusFilter, "limit:", limit)

    // Build where clause
    const where: any = {
      restaurantId: restaurant.id,
    }

    if (pathFilter && pathFilter !== "ALL") {
      where.path = { contains: pathFilter }
    }

    if (statusFilter && statusFilter !== "ALL") {
      where.statusCode = parseInt(statusFilter, 10)
    }

    // Fetch logs
    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500), // Max 500 logs
    })

    console.log("[logs/webhook] ✅ Found", logs.length, "webhook logs")

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error("[logs/webhook] ❌ Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

