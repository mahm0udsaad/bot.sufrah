import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import prisma from "@/lib/prisma"

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

    // Get template usage analytics
    const templateUsage = await prisma.template.findMany({
      where: {
        user_id: userId,
        status: "approved",
        usage_count: { gt: 0 },
      },
      select: {
        name: true,
        category: true,
        usage_count: true,
      },
      orderBy: { usage_count: "desc" },
      take: 10,
    })

    // Match previous shape (usage instead of usage_count)
    return NextResponse.json(
      templateUsage.map((t: { name: string; category: string; usage_count: number | null }) => ({
        name: t.name,
        category: t.category,
        usage: t.usage_count ?? 0,
      }))
    )
  } catch (error) {
    console.error("Dashboard templates API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
