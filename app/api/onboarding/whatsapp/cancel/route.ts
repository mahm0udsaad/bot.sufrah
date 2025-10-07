import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payloadSchema = z.object({
  restaurantId: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { restaurantId } = payloadSchema.parse(body)

    // Authentication
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant || restaurant.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found or access denied" },
        { status: 403 }
      )
    }

    // Delete the bot record to start fresh
    await prisma.restaurantBot.deleteMany({
      where: { restaurantId: restaurant.id },
    })

    console.log(`[Cancel WhatsApp] Reset bot for restaurant ${restaurantId}`)

    return NextResponse.json({
      success: true,
      message: "Connection cancelled. You can now start over.",
    })
  } catch (error) {
    console.error("[Cancel WhatsApp] Error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : "Failed to cancel connection"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
