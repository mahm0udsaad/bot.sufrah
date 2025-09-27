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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserFromToken(request)
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { status, payment_status, delivery_time } = await request.json()

    // Verify order belongs to user
    const [order] = await db.sql`
      SELECT o.* FROM orders o
      LEFT JOIN conversations c ON c.id = o.conversation_id
      WHERE o.id = ${id} AND (
        c.user_id = ${userId} OR 
        o.customer_phone IN (
          SELECT DISTINCT customer_phone FROM conversations WHERE user_id = ${userId}
        )
      )
    `

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    // Update order
    const updates: any = { updated_at: new Date() }
    if (status) updates.status = status
    if (payment_status) updates.payment_status = payment_status
    if (delivery_time) updates.delivery_time = delivery_time

    const [updatedOrder] = await db.sql`
      UPDATE orders 
      SET ${db.sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `

    // Log usage
    await db.logUsage(userId, "order_updated", id, { status, payment_status })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Update order error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
