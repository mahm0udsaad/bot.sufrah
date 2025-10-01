import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { formatPhoneNumber, generateVerificationCode } from "@/lib/auth-utils"
import { sendVerificationWhatsApp } from "@/lib/twilio"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(phone)

    // Generate verification code
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Check if user exists
    let user = await db.getUserByPhone(formattedPhone)

    if (user) {
      await db.updateUser(user.id, {
        verification_code: verificationCode,
        verification_expires_at: expiresAt,
      })
    } else {
      user = await db.createUserWithRestaurant({
        phone: formattedPhone,
        verification_code: verificationCode,
        verification_expires_at: expiresAt,
      })
    }

    // Send verification via WhatsApp instead of SMS
    const smsResult = await sendVerificationWhatsApp(formattedPhone, verificationCode)

    if (!smsResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: smsResult.error || "Failed to send verification code",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      // Include code in development for testing
      ...(process.env.NODE_ENV === "development" && { code: verificationCode }),
    })
  } catch (error) {
    console.error("[API/SIGNIN] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      },
      { status: 500 },
    )
  }
}
