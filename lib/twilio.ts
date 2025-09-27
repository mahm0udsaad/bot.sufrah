import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const smsFrom = process.env.TWILIO_SMS_FROM
const twilioDebug = process.env.TWILIO_DEBUG === "true"

function maskPhoneNumber(phone: string | null | undefined) {
  if (!phone) return "unknown"
  const digits = phone.replace(/[^\d+]/g, "")
  if (digits.length <= 4) return digits
  return `***${digits.slice(-4)}`
}

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

export async function sendVerificationSMS(phoneNumber: string, code: string) {
  try {
    // Input validation
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        success: false,
        error: "Invalid phone number format. Use E.164 format (+1234567890)",
      }
    }

    const twilioClient = getClient()
    if (!twilioClient) {
      return {
        success: false,
        error: "SMS service not configured - missing Twilio credentials",
      }
    }

    if (!smsFrom) {
      return {
        success: false,
        error: "SMS sender number not configured",
      }
    }

    if (twilioDebug) {
      console.log(
        `[twilio] Attempting SMS send | account=${maskPhoneNumber(accountSid)} | from=${smsFrom} | to=${maskPhoneNumber(phoneNumber)} | code=${code}`,
      )
    }

    const message = await twilioClient.messages.create({
      body: `Your Sufrah verification code is: ${code}. This code will expire in 10 minutes.`,
      from: smsFrom,
      to: phoneNumber,
    })

    return {
      success: true,
      messageId: message.sid,
      message: "Verification code sent via SMS",
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
      error: error.message || "Failed to send verification SMS",
    }
  }
}
