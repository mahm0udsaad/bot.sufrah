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

    // Get template usage analytics
    const templateUsage = await db.sql`
      SELECT 
        t.name,
        t.category,
        t.usage_count as usage
      FROM templates t
      WHERE t.user_id = ${userId}
        AND t.status = 'approved'
        AND t.usage_count > 0
      ORDER BY t.usage_count DESC
      LIMIT 10
    `

    return NextResponse.json(templateUsage)
  } catch (error) {
    console.error("Dashboard templates API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
