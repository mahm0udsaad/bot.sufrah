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

    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value
    if (!userPhone) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } })
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant || restaurant.userId !== user.id) {
      return NextResponse.json({ success: false, error: "Restaurant not found or access denied" }, { status: 403 })
    }

    // Find bot
    const bot = await prisma.restaurantBot.findUnique({ where: { restaurantId: restaurant.id } })
    if (!bot) {
      return NextResponse.json({ success: false, error: "No bot to delink" }, { status: 404 })
    }

    // Reset bot to PENDING and clear linkage fields. Keep subaccount/auth for future setup.
    const updatedBot = await prisma.restaurantBot.update({
      where: { restaurantId: restaurant.id },
      data: {
        status: "PENDING",
        whatsappNumber: "",
        wabaId: null,
        senderSid: null,
        verificationSid: null,
        verifiedAt: null,
        errorMessage: null,
      },
    })

    // Clear whatsapp number from restaurant profile
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { whatsappNumber: null },
    })

    return NextResponse.json({ success: true, bot: updatedBot })
  } catch (error) {
    console.error("[Delink Shared Number] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to delink WhatsApp"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}


