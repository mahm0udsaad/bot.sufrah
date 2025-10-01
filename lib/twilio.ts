import twilio from "twilio"

let twilioClient: twilio.Twilio | null = null
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const smsFrom = process.env.TWILIO_SMS_FROM // Must be an SMS-capable Twilio number
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM // Must be a WhatsApp-enabled Twilio number

function getClient() {
  if (!twilioClient && accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

function maskPhoneNumber(phone: string) {
  if (!phone) return ""
  return phone.slice(0, 4) + "****" + phone.slice(-2)
}

const twilioDebug = process.env.NODE_ENV !== "production"

export async function sendVerificationSMS(phoneNumber: string, code: string) {
  try {
    // Input validation
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        success: false,
        error: "Invalid phone number format. Use E.164 format (+1234567890)",
      }
    }

    const client = getClient()
    if (!client) {
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
        `[twilio] Attempting SMS send | account=${maskPhoneNumber(accountSid!)} | from=${smsFrom} | to=${maskPhoneNumber(
          phoneNumber,
        )} | code=${code}`,
      )
    }

    const message = await client.messages.create({
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
    switch (error.code) {
      case 20003:
        return { success: false, error: "Authentication failed - check Twilio credentials" }
      case 21211:
        return { success: false, error: "Invalid phone number" }
      case 21608:
        return { success: false, error: "Phone number is not a valid mobile number" }
      case 21612:
        return {
          success: false,
          error:
            "Invalid From/To combination. Your Twilio number may not support sending SMS to this country (Saudi Arabia). " +
            "Check Twilio Geo Permissions or register a Sender ID.",
        }
      case 21614:
        return { success: false, error: "Phone number is not SMS capable" }
      case 30007:
        return { success: false, error: "Message delivery failed - carrier rejected" }
      default:
        return {
          success: false,
          error: error.message || "Failed to send verification SMS",
        }
    }
  }
}

export async function sendVerificationWhatsApp(phoneNumber: string, code: string) {
  try {
    // Input validation (E.164 without whatsapp: prefix)
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        success: false,
        error: "Invalid phone number format. Use E.164 format (+1234567890)",
      }
    }

    const client = getClient()
    if (!client) {
      return {
        success: false,
        error: "WhatsApp service not configured - missing Twilio credentials",
      }
    }

    const fromAddress = whatsappFrom?.startsWith("whatsapp:") ? whatsappFrom : whatsappFrom ? `whatsapp:${whatsappFrom}` : undefined
    const toAddress = `whatsapp:${phoneNumber}`

    if (!fromAddress) {
      return {
        success: false,
        error: "WhatsApp sender not configured (TWILIO_WHATSAPP_FROM)",
      }
    }

    if (twilioDebug) {
      console.log(
        `[twilio] Attempting WhatsApp send | account=${maskPhoneNumber(accountSid!)} | from=${fromAddress} | to=${maskPhoneNumber(
          phoneNumber,
        )} | code=${code}`,
      )
    }

    const message = await client.messages.create({
      body: `Your Sufrah verification code is: ${code}. This code will expire in 10 minutes.`,
      from: fromAddress,
      to: toAddress,
    })

    return {
      success: true,
      messageId: message.sid,
      message: "Verification code sent via WhatsApp",
    }
  } catch (error: any) {
    console.error("Twilio WhatsApp error:", error)

    switch (error.code) {
      case 20003:
        return { success: false, error: "Authentication failed - check Twilio credentials" }
      case 21211:
        return { success: false, error: "Invalid phone number" }
      case 21612:
        return { success: false, error: "Invalid From/To combination for WhatsApp" }
      case 63016:
        return { success: false, error: "WhatsApp template not approved or not enabled" }
      default:
        return {
          success: false,
          error: error.message || "Failed to send verification via WhatsApp",
        }
    }
  }
}
