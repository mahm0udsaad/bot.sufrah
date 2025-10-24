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

    const botApiUrl = process.env.BOT_API_URL || "https://bot.sufrah.sa"
    const whatsappSendToken = process.env.WHATSAPP_SEND_TOKEN

    if (!whatsappSendToken) {
      return {
        success: false,
        error: "WhatsApp Send API not configured - missing WHATSAPP_SEND_TOKEN",
      }
    }

    const messageText = `Your Sufrah verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`

    if (twilioDebug) {
      console.log(
        `[whatsapp-send-api] Sending verification code | to=${maskPhoneNumber(phoneNumber)} | code=${code}`,
      )
    }

    // Call the WhatsApp Send API
    const apiUrl = botApiUrl.replace(/\/api$/, "") // Remove /api suffix if present
    const response = await fetch(`${apiUrl}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappSendToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber,
        text: messageText,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[whatsapp-send-api] Error response:", data)
      return {
        success: false,
        error: data.error || `Failed to send verification code (status: ${response.status})`,
      }
    }

    if (twilioDebug) {
      console.log("[whatsapp-send-api] Success:", data)
    }

    return {
      success: true,
      messageId: data.jobId || data.sid || "queued",
      message: data.message || "Verification code sent via WhatsApp",
    }
  } catch (error: any) {
    console.error("WhatsApp Send API error:", error)

    return {
      success: false,
      error: error.message || "Failed to send verification via WhatsApp",
    }
  }
}
