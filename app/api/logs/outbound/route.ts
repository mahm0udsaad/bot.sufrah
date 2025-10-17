import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"

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

    // Get restaurant for this user
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId },
    })

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    // Get filters from query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

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

    return NextResponse.json({ success: true, messages })
  } catch (error) {
    console.error("Outbound messages API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

