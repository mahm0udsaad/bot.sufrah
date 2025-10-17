// phone-utils.ts
export type Channel = "sms" | "whatsapp"

export function formatPhoneNumber(phone: string, channel: Channel = "sms"): string {
  const trimmed = phone.trim()
  // Keep only digits
  const digits = trimmed.replace(/\D/g, "")
  // Always return E.164 with leading + for internal/Twilio usage
  const e164 = `+${digits}`

  if (channel === "whatsapp") {
    return `whatsapp:${e164}`
  }
  return e164
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
