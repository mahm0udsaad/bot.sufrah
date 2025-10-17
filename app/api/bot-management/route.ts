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
      include: {
        bots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const bot = restaurant.bots[0]

    if (!bot) {
      return NextResponse.json({ success: false, message: "No bot configuration found" }, { status: 404 })
    }

    // Return bot data (excluding sensitive auth token)
    const { authToken, ...botData } = bot

    return NextResponse.json({ success: true, bot: botData })
  } catch (error) {
    console.error("Bot management API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

