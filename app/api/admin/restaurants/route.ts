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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await isAdminUser(userId)
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get("status")
    
    let whereClause: any = {}
    if (status === "PENDING_APPROVAL") {
      whereClause.status = "PENDING"
    } else if (status) {
      whereClause.status = status
    }

    const restaurants = await db.prisma.restaurantBot.findMany({
      where: whereClause,
      include: {
        restaurant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      success: true, 
      restaurants: restaurants.map(bot => ({
        id: bot.id,
        restaurantId: bot.restaurantId,
        name: bot.name,
        restaurantName: bot.restaurantName,
        whatsappNumber: bot.whatsappNumber,
        accountSid: bot.accountSid,
        subaccountSid: bot.subaccountSid,
        status: bot.status,
        createdAt: bot.createdAt.toISOString(),
        errorMessage: bot.errorMessage,
        restaurant: bot.restaurant
      }))
    })
  } catch (error) {
    console.error("Admin restaurants API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
