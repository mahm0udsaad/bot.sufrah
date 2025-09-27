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

    // Get order statistics
    const [stats] = await db.sql`
      WITH user_orders AS (
        SELECT o.*
        FROM orders o
        LEFT JOIN conversations c ON c.id = o.conversation_id
        WHERE c.user_id = ${userId} OR o.customer_phone IN (
          SELECT DISTINCT customer_phone FROM conversations WHERE user_id = ${userId}
        )
      )
      SELECT 
        (SELECT COUNT(*) FROM user_orders WHERE DATE(created_at) = CURRENT_DATE) as todays_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM user_orders WHERE DATE(created_at) = CURRENT_DATE) as total_revenue,
        (SELECT COALESCE(AVG(total_amount), 0) FROM user_orders WHERE DATE(created_at) = CURRENT_DATE) as avg_order_value,
        (SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*)), 1)
          END
        FROM user_orders WHERE DATE(created_at) = CURRENT_DATE) as completion_rate
    `

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Order stats API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
