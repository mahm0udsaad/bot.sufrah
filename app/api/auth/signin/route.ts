import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { formatPhoneNumber, generateVerificationCode } from "@/lib/auth-utils"
import { sendVerificationWhatsApp } from "@/lib/twilio"
import { fetchMerchantByPhoneOrEmail } from "@/lib/merchants"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(phone)
    console.log("[signin] formattedPhone:", formattedPhone) 
    
    // Generate verification code
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    console.log("[signin] Verification code expires at:", expiresAt)
    
    // Check if user exists
    let user = await db.getUserByPhone(formattedPhone)
    console.log("[signin] User lookup result:", user ? `Found user ${user.id}` : "No user found")
    
    // Determine if we need to fetch merchant data
    const needsMerchantData = !user || 
      user.name === "Restaurant Owner" || 
      !user.name || 
      user.name.trim() === ""
    
    if (user && !needsMerchantData) {
      // Existing user with complete data - just update verification code
      console.log("[signin] Existing user with complete data, sending verification code")
      await db.updateUser(user.id, {
        verification_code: verificationCode,
        verification_expires_at: expiresAt,
      })
    } else {
      // New user OR existing user with dummy data - fetch merchant data from main API
      console.log("[signin] New user detected (or dummy data found), fetching merchant data from main API...")
      
      // Determine phone format for merchant API lookup
      const inputTrimmed = typeof phone === "string" ? phone.trim() : ""
      const digitsOnly = formattedPhone.replace(/^\+/, "")
      const usingDigitsOnly = !inputTrimmed.startsWith("+")
      const merchantLookupPhone = usingDigitsOnly ? digitsOnly : formattedPhone
      
      const merchantRes = await fetchMerchantByPhoneOrEmail(merchantLookupPhone)
      
      if (!merchantRes.success || !merchantRes.data) {
        console.log("[signin] Merchant not found in main API:", merchantRes.error)
        return NextResponse.json(
          {
            success: false,
            message: "هذا الرقم غير مسجل كمطعم في سفرة. يرجى التواصل مع الدعم.",
          },
          { status: 404 },
        )
      }

      console.log("[signin] Merchant found in main API:", merchantRes.data.name)
      const m = merchantRes.data

      if (user) {
        // Existing user with dummy data - update with real merchant data
        console.log("[signin] Updating existing user with real merchant data...")
        
        // Update user information
        await db.updateUser(user.id, {
          name: typeof m.name === "string" ? m.name : undefined,
          email: typeof m.email === "string" ? m.email : undefined,
          verification_code: verificationCode,
          verification_expires_at: expiresAt,
        })

        // Update restaurant information
        const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
        if (restaurant) {
          await db.updateRestaurant(restaurant.id, {
            name: m.name || undefined,
            description: m.bundleName || undefined,
            address: m.address || undefined,
            isActive: typeof m.isActive === "boolean" ? m.isActive : true,
            externalMerchantId: typeof m.id === "string" ? m.id : undefined,
          })
        }

        console.log("[signin] User and restaurant updated successfully with merchant data")
      } else {
        // New user - create with real merchant data
        console.log("[signin] Creating new user with real merchant data...")
        
        user = await db.createUserWithRestaurant({
          phone: formattedPhone,
          name: typeof m.name === "string" ? m.name : undefined,
          email: typeof m.email === "string" ? m.email : undefined,
          verification_code: verificationCode,
          verification_expires_at: expiresAt,
          restaurantData: {
            name: m.name || undefined,
            description: m.bundleName || undefined,
            address: m.address || undefined,
            isActive: typeof m.isActive === "boolean" ? m.isActive : true,
            externalMerchantId: typeof m.id === "string" ? m.id : undefined,
          },
        })

        console.log("[signin] User created successfully with merchant data")
      }
    }

    // Send verification via WhatsApp
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
