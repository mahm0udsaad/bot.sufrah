// phone-utils.ts
export type Channel = "sms" | "whatsapp"

export function formatPhoneNumber(phone: string, channel: Channel = "sms"): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "")

  // Ensure E.164 format
  const e164 = phone.startsWith("+") ? "+" + cleaned : "+" + cleaned

  if (channel === "whatsapp") {
    return `whatsapp:${e164}`
  }

  return e164
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
