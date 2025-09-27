import { Buffer } from "node:buffer"

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

export async function sendVerificationSMS(phoneNumber: string, code: string) {
  try {
    // Input validation
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        success: false,
        error: "Invalid phone number format. Use E.164 format (+1234567890)",
      }
    }

    if (!accountSid || !authToken) {
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

    const body = new URLSearchParams({
      Body: `Your Sufrah verification code is: ${code}. This code will expire in 10 minutes.`,
      From: smsFrom,
      To: phoneNumber,
    })

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      const message =
        (typeof errorBody?.message === "string" && errorBody.message) ||
        (typeof errorBody?.error_message === "string" && errorBody.error_message) ||
        response.statusText ||
        "Failed to send verification SMS"

      if (twilioDebug) {
        console.error("[twilio] API error", response.status, message, errorBody)
      }

      return {
        success: false,
        error: message,
      }
    }

    const messageData = await response.json()

    return {
      success: true,
      messageId: messageData.sid,
      message: "Verification code sent via SMS",
    }
  } catch (error: any) {
    console.error("Twilio SMS error:", error)

    return {
      success: false,
      error: error.message || "Failed to send verification SMS",
    }
  }
}
