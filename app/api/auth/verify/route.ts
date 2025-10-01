import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { formatPhoneNumber } from "@/lib/auth-utils"
import { fetchMerchantByPhoneOrEmail } from "@/lib/merchants"

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    console.log("[v0] Verify request - phone:", phone, "code:", code) // Add debug logging

    if (!phone || !code) {
      return NextResponse.json({ success: false, message: "Phone number and code are required" }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(phone)
    console.log("[v0] Formatted phone for verification:", formattedPhone) // Add debug logging

    const user = await db.getUserByPhone(formattedPhone)
    console.log("[v0] User found for verification:", !!user) // Add debug logging

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const storedCode = user.verification_code
    const expiration = user.verification_expires_at ? new Date(user.verification_expires_at) : null

    if (!storedCode) {
      return NextResponse.json({ success: false, message: "No verification code found. Request a new code." }, { status: 400 })
    }

    if (storedCode !== code) {
      console.log("[v0] Invalid verification code - expected:", storedCode, "received:", code)
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

    // Fetch merchant data by phone and update restaurant profile (best-effort)
    try {
      const merchantRes = await fetchMerchantByPhoneOrEmail(formattedPhone)
      console.log("[v0] Merchant response:", merchantRes) // Add debug logging
      if (merchantRes.success && merchantRes.data) {
        const m = merchantRes.data
        await db.updateRestaurantProfile(user.id, {
          name: m.name || undefined,
          description: m.bundleName || undefined,
          phone: m.phoneNumber || undefined,
          whatsapp_number: m.phoneNumber || undefined,
          address: m.address || undefined,
          is_active: typeof m.isActive === "boolean" ? m.isActive : undefined,
        })
      }
    } catch (syncErr) {
      console.warn("[verify] Failed syncing merchant data:", syncErr)
    }

    // Log usage
    await db.logUsage(user.id, "user_signin")

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

    console.log("[v0] Cookie set for phone:", formattedPhone) // Add debug logging

    return response
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
