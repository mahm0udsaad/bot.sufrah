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

    // Get daily usage data for the last 7 days
    const usageData = await db.sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      daily_messages AS (
        SELECT 
          DATE(m.sent_at) as day,
          COUNT(*) as messages
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.user_id = ${userId}
          AND m.sent_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(m.sent_at)
      ),
      daily_orders AS (
        SELECT 
          DATE(o.created_at) as day,
          COUNT(*) as orders
        FROM orders o
        JOIN conversations c ON c.id = o.conversation_id
        WHERE c.user_id = ${userId}
          AND o.created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(o.created_at)
      )
      SELECT 
        TO_CHAR(ds.day, 'Dy') as day,
        COALESCE(dm.messages, 0) as messages,
        COALESCE(do.orders, 0) as orders
      FROM date_series ds
      LEFT JOIN daily_messages dm ON ds.day = dm.day
      LEFT JOIN daily_orders do ON ds.day = do.day
      ORDER BY ds.day
    `

    return NextResponse.json(usageData)
  } catch (error) {
    console.error("Dashboard usage API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
