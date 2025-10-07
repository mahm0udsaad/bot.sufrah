// phone-utils.ts
export type Channel = "sms" | "whatsapp"

export function formatPhoneNumber(phone: string, channel: Channel = "sms"): string {
  // Remove all non-digits except leading +
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    // Remove all non-digits except leading +
    const cleaned = "+" + trimmed.slice(1).replace(/\D/g, "");
    if (channel === "whatsapp") {
      return `whatsapp:${cleaned}`;
    }
    return cleaned;
  } else {
    // If no +, return as is (after trimming)
    if (channel === "whatsapp") {
      return `whatsapp:${trimmed}`;
    }
    return trimmed;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
