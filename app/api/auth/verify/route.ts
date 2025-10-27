import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { formatPhoneNumber } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    console.log("[verify] Verify request - phone:", phone, "code:", code)

    if (!phone || !code) {
      return NextResponse.json({ success: false, message: "Phone number and code are required" }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(phone)
    console.log("[verify] Formatted phone for verification:", formattedPhone)

    const user = await db.getUserByPhone(formattedPhone)
    console.log("[verify] User found for verification:", !!user)

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const storedCode = user.verification_code
    const expiration = user.verification_expires_at ? new Date(user.verification_expires_at) : null

    if (!storedCode) {
      return NextResponse.json({ success: false, message: "No verification code found. Request a new code." }, { status: 400 })
    }

    if (storedCode !== code) {
      console.log("[verify] Invalid verification code - expected:", storedCode, "received:", code)
      return NextResponse.json({ success: false, message: "Invalid verification code" }, { status: 400 })
    }

    if (!expiration || new Date() > expiration) {
      return NextResponse.json({ success: false, message: "Verification code has expired" }, { status: 400 })
    }

    // Mark user as verified and clear verification code
    const updatedUser = await db.updateUser(user.id, {
      is_verified: true,
      verification_code: null,
      verification_expires_at: null,
    })

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    // NOTE: Merchant data is now fetched during signin, not here.
    // This ensures only registered merchants can create accounts.
    // If needed, we can optionally re-sync merchant data here for existing users.

    // Log usage
    if (restaurant) {
      await db.logUsage(restaurant.id, "user_signin")
    }

    const response = NextResponse.json({
      success: true,
      message: "Verification successful",
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        is_verified: updatedUser.is_verified,
      },
    })

    response.cookies.set("user-phone", formattedPhone, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    console.log("[verify] Cookie set for phone:", formattedPhone)

    return response
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
