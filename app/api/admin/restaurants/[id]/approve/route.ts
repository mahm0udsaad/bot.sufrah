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

async function isAdminUser(userId: string) {
  try {
    const user = await db.prisma.user.findUnique({
      where: { id: userId }
    })
    
    // Simple admin check - you may want to implement proper role-based access
    return user?.email?.includes('admin') || user?.phone === '+966500000000'
  } catch (error) {
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await isAdminUser(userId)
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    // Find the restaurant bot
    const restaurantBot = await db.prisma.restaurantBot.findUnique({
      where: { id: params.id },
      include: {
        restaurant: true
      }
    })

    if (!restaurantBot) {
      return NextResponse.json({ success: false, message: "Restaurant bot not found" }, { status: 404 })
    }

    // Update status to ACTIVE
    const updatedBot = await db.prisma.restaurantBot.update({
      where: { id: params.id },
      data: { 
        status: "ACTIVE",
        verifiedAt: new Date(),
        errorMessage: null
      }
    })

    // Also notify the external bot service if available
    try {
      const botApiUrl = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
      const response = await fetch(`${botApiUrl}/admin/restaurants/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      
      if (!response.ok) {
        console.warn(`Failed to sync approval to external service: ${response.statusText}`)
      }
    } catch (error) {
      console.warn("Failed to sync approval to external service:", error)
      // Don't fail the request if external sync fails
    }

    return NextResponse.json({ 
      success: true, 
      message: "Restaurant approved successfully",
      restaurant: updatedBot
    })
  } catch (error) {
    console.error("Approve restaurant API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
