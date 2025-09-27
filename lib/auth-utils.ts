export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "")

  if (phone.startsWith("+")) {
    // If it already starts with +, just clean and return
    return "+" + cleaned
  }

  // If no country code, add + to the cleaned number (let the user's input determine the country)
  return "+" + cleaned
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
