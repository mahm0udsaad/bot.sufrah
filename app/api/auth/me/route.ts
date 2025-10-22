import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    console.log("[v0] Checking auth for phone:", userPhone) // Add debug logging

    if (!userPhone) {
      return NextResponse.json({ success: false, message: "No session found" }, { status: 401 })
    }

    const user = await db.getUserByPhone(userPhone)
    console.log("[v0] User lookup result:", user ? "found" : "not found") // Add debug logging

    if (!user) {
      console.log("[v0] User not found, creating new user with phone:", userPhone)
      try {
        const newUser = await db.createUserWithRestaurant({
          phone: userPhone,
        })
        console.log("[v0] New user created:", newUser.id)

        const restaurant = await db.getPrimaryRestaurantByUserId(newUser.id)
        const restaurantBot = restaurant
          ? await prisma.restaurantBot.findFirst({ where: { restaurantId: restaurant.id } })
          : null

        return NextResponse.json({
          id: newUser.id,
          phone_number: newUser.phone,
          name: newUser.name,
          email: newUser.email,
          is_verified: newUser.is_verified,
          restaurant: restaurant,
          tenantId: restaurantBot?.id ?? null,
        })
      } catch (createError) {
        console.error("[v0] Failed to create user:", createError)
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
      }
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
    const restaurantBot = restaurant
      ? await prisma.restaurantBot.findFirst({ where: { restaurantId: restaurant.id } })
      : null

    return NextResponse.json({
      id: user.id,
      phone_number: user.phone,
      name: user.name,
      email: user.email,
      is_verified: user.is_verified,
      restaurant: restaurant,
      tenantId: restaurantBot?.id ?? null,
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ success: false, message: "Session error" }, { status: 401 })
  }
}
