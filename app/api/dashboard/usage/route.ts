import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { db } from "@/lib/db"
import { getAuthenticatedRestaurant, getAuthenticatedUser } from "@/lib/server-auth"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [restaurant, user] = await Promise.all([
      getAuthenticatedRestaurant(request),
      getAuthenticatedUser(request),
    ])

    if (!restaurant || !user) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const usageData = await prisma.$queryRaw<any[]>`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      daily_messages AS (
        SELECT 
          DATE(m.created_at) as day,
          COUNT(*) as messages
        FROM "Message" m
        WHERE m.restaurant_id = ${restaurant.id}
          AND m.created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(m.created_at)
      ),
      daily_orders AS (
        SELECT 
          DATE(o.created_at) as day,
          COUNT(*) as orders
        FROM "Order" o
        WHERE o.restaurant_id = ${restaurant.id}
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
