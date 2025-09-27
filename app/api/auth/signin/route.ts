import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { formatPhoneNumber, generateVerificationCode } from "@/lib/auth-utils"
import { sendVerificationSMS as sendVerificationCode } from "@/lib/twilio"

async function dispatchVerificationCode(
  phone: string,
  code: string,
): Promise<{ success: boolean; message?: string; code?: string; error?: string }> {
  console.log(`[v0] SMS would be sent to ${phone}: Your verification code is ${code}`)

  const sendInDev = process.env.TWILIO_SEND_IN_DEV === "true"

  // Production: send via Twilio SMS
  if (process.env.NODE_ENV === "development" && sendInDev) {
    console.log("[v0] TWILIO_SEND_IN_DEV enabled - sending real SMS in development mode")
  }

  const result = await sendVerificationCode(phone, code)

  if (!result.success) {
    console.error("[v0] Failed to send verification SMS:", result.error)
    return {
      success: false,
      error: result.error || "Failed to send verification code",
    }
  }

  return {
    success: true,
    message: "Verification code sent successfully",
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] POST request received")

  try {
    console.log("[v0] Parsing request body...")
    const { phone } = await request.json()
    console.log("[v0] Phone number received:", phone)

    if (!phone) {
      console.log("[v0] No phone number provided")
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 })
    }

    console.log("[v0] Formatting phone number...")
    const formattedPhone = formatPhoneNumber(phone)
    console.log("[v0] Formatted phone:", formattedPhone)

    console.log("[v0] About to generate verification code...")
    console.log("[v0] generateVerificationCode function:", typeof generateVerificationCode)

    // Generate verification code
    console.log("[v0] Generating verification code...")
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    console.log("[v0] Verification code generated:", verificationCode)

    console.log("[v0] About to check if user exists...")
    console.log("[v0] db.getUserByPhone function:", typeof db.getUserByPhone)

    // Check if user exists
    console.log("[v0] Checking if user exists...")
    let user = await db.getUserByPhone(formattedPhone)
    console.log("[v0] User found:", !!user)

    if (user) {
      console.log("[v0] Updating existing user...")
      console.log("[v0] db.updateUser function:", typeof db.updateUser)
      await db.updateUser(user.id, {
        verification_code: verificationCode,
        verification_expires_at: expiresAt,
      })
      console.log("[v0] User updated successfully")
    } else {
      console.log("[v0] Creating new user...")
      console.log("[v0] db.createUserWithRestaurant function:", typeof db.createUserWithRestaurant)
      user = await db.createUserWithRestaurant({
        phone: formattedPhone,
        verification_code: verificationCode,
        verification_expires_at: expiresAt,
      })
      console.log("[v0] User created successfully:", user.id)
    }

    console.log("[v0] Attempting to send SMS to:", formattedPhone)
    const smsResult = await dispatchVerificationCode(formattedPhone, verificationCode)
    console.log("[v0] SMS result:", smsResult)

    if (!smsResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: smsResult.error || "Failed to send verification code",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Signin process completed successfully")
    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      // Include code in development for testing
      ...(process.env.NODE_ENV === "development" && { code: verificationCode }),
    })
  } catch (error) {
    console.error("[v0] Sign-in error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("[v0] Error message:", error instanceof Error ? error.message : "Unknown")
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
