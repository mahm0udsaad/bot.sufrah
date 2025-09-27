import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const smsFrom = process.env.TWILIO_SMS_FROM

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!accountSid || !authToken) {
    return null
  }

  if (!client) {
    client = twilio(accountSid, authToken)
  }

  return client
}

// In-memory storage for verification codes (use Redis/Database in production)
const verificationCodes = new Map<string, { 
  code: string
  expiresAt: number
  attempts: number
}>()

// Rate limiting storage
const rateLimits = new Map<string, { 
  count: number
  lastAttempt: number
}>()

// Generate random verification code
export function generateVerificationCode(length: number = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0')
}

export async function sendVerificationSMS(phoneNumber: string) {
  try {
    // Input validation
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return { 
        success: false, 
        error: "Invalid phone number format. Use E.164 format (+1234567890)" 
      }
    }

    const twilioClient = getClient()
    if (!twilioClient) {
      return { 
        success: false, 
        error: "SMS service not configured - missing Twilio credentials" 
      }
    }

    if (!smsFrom) {
      return { 
        success: false, 
        error: "SMS sender number not configured" 
      }
    }

    // Check rate limiting
    const now = Date.now()
    const rateLimitKey = phoneNumber
    const rateLimit = rateLimits.get(rateLimitKey)
    
    if (rateLimit && rateLimit.count >= 3 && (now - rateLimit.lastAttempt) < 15 * 60 * 1000) {
      return { 
        success: false, 
        error: "Too many SMS requests. Please try again in 15 minutes." 
      }
    }

    // Generate verification code
    const code = generateVerificationCode(6)
    const expiresAt = Date.now() + (10 * 60 * 1000) // 10 minutes expiration

    // Store verification code
    verificationCodes.set(phoneNumber, {
      code,
      expiresAt,
      attempts: 0
    })

    // Send SMS using Twilio Messages API
    const message = await twilioClient.messages.create({
      body: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
      from: smsFrom,
      to: phoneNumber,
    })

    // Update rate limiting
    rateLimits.set(rateLimitKey, {
      count: (rateLimit?.count || 0) + 1,
      lastAttempt: now
    })

    return { 
      success: true, 
      messageId: message.sid,
      message: "Verification code sent via SMS",
      // Don't return the actual code in production
      ...(process.env.NODE_ENV === 'development' && { code })
    }

  } catch (error: any) {
    console.error("Twilio SMS error:", error)
    
    // Handle specific Twilio error codes
    if (error.code === 20003) {
      return { success: false, error: "Authentication failed - check Twilio credentials" }
    }
    if (error.code === 21211) {
      return { success: false, error: "Invalid phone number" }
    }
    if (error.code === 21608) {
      return { success: false, error: "Phone number is not a valid mobile number" }
    }
    if (error.code === 21614) {
      return { success: false, error: "Phone number is not SMS capable" }
    }
    if (error.code === 30007) {
      return { success: false, error: "Message delivery failed - carrier rejected" }
    }
    
    return { 
      success: false, 
      error: error.message || "Failed to send verification SMS" 
    }
  }
}

export async function verifyCode(phoneNumber: string, userCode: string) {
  try {
    // Input validation
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return { success: false, error: "Invalid phone number format" }
    }

    if (!userCode || !/^\d{4,8}$/.test(userCode.trim())) {
      return { success: false, error: "Invalid verification code format" }
    }

    const storedData = verificationCodes.get(phoneNumber)

    if (!storedData) {
      return { 
        success: false, 
        error: "No verification code found. Please request a new code." 
      }
    }

    // Check if code expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(phoneNumber)
      return { 
        success: false, 
        error: "Verification code has expired. Please request a new code." 
      }
    }

    // Check attempt limit
    if (storedData.attempts >= 5) {
      verificationCodes.delete(phoneNumber)
      return { 
        success: false, 
        error: "Too many verification attempts. Please request a new code." 
      }
    }

    // Increment attempt counter
    storedData.attempts += 1

    // Verify code
    if (storedData.code === userCode.trim()) {
      // Success - cleanup
      verificationCodes.delete(phoneNumber)
      rateLimits.delete(phoneNumber) // Reset rate limit on success
      
      return { 
        success: true, 
        message: "Phone number verified successfully!" 
      }
    } else {
      // Update attempts count
      verificationCodes.set(phoneNumber, storedData)
      
      return { 
        success: false, 
        error: `Invalid verification code. ${5 - storedData.attempts} attempts remaining.` 
      }
    }

  } catch (error: any) {
    console.error("Code verification error:", error)
    return { 
      success: false, 
      error: "Verification failed. Please try again." 
    }
  }
}

// Cleanup expired codes (run periodically)
export function cleanupExpiredCodes() {
  const now = Date.now()
  
  for (const [phoneNumber, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(phoneNumber)
    }
  }
  
  // Also cleanup old rate limits (older than 1 hour)
  for (const [key, rateLimit] of rateLimits.entries()) {
    if (now - rateLimit.lastAttempt > 60 * 60 * 1000) {
      rateLimits.delete(key)
    }
  }
}

// Get verification status (useful for debugging)
export function getVerificationStatus(phoneNumber: string) {
  const data = verificationCodes.get(phoneNumber)
  if (!data) {
    return { exists: false }
  }
  
  return {
    exists: true,
    expired: Date.now() > data.expiresAt,
    attempts: data.attempts,
    remainingAttempts: Math.max(0, 5 - data.attempts),
    expiresIn: Math.max(0, data.expiresAt - Date.now())
  }
}