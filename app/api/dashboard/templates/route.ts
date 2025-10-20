import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/server-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Get template usage analytics
    const templateUsage = await prisma.template.findMany({
      where: {
        user_id: user.id,
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
