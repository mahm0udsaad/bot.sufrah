/**
 * Phone Number Utilities
 * Handle phone number formatting for different APIs
 */

/**
 * Format phone number for Sufrah API
 * Removes the + sign as Sufrah API expects numbers without it
 * 
 * @example
 * formatPhoneForSufrah('+966508034010') // '966508034010'
 */
export function formatPhoneForSufrah(phone: string): string {
  if (!phone) return '';
  return phone.replace(/^\+/, '');
}

/**
 * Format phone number for WhatsApp/Twilio
 * Ensures the + sign is present
 * 
 * @example
 * formatPhoneForWhatsApp('966508034010') // '+966508034010'
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  return phone.startsWith('+') ? phone : `+${phone}`;
}

/**
 * Normalize phone number to E.164 format with +
 * 
 * @example
 * normalizePhone('966508034010') // '+966508034010'
 * normalizePhone('+966508034010') // '+966508034010'
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove any non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Format phone number for display
 * Shows a user-friendly version
 * 
 * @example
 * formatPhoneForDisplay('+966508034010') // '+966 50 803 4010'
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  
  // Saudi Arabia format
  if (normalized.startsWith('+966')) {
    const number = normalized.substring(4);
    return `+966 ${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`;
  }
  
  // Generic format
  return normalized;
}

/**
 * Mask phone number for privacy
 * Shows only last 4 digits
 * 
 * @example
 * maskPhone('+966508034010') // '+966****4010'
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  
  const lastFour = phone.slice(-4);
  const masked = '*'.repeat(Math.max(0, phone.length - 4));
  
  return masked + lastFour;
}

/**
 * Validate Saudi phone number
 * 
 * @example
 * isValidSaudiPhone('+966508034010') // true
 * isValidSaudiPhone('966508034010') // true
 * isValidSaudiPhone('508034010') // false
 */
export function isValidSaudiPhone(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Saudi phone numbers: 966 + 9 digits (5X or 05X)
  return /^966[0-9]{9}$/.test(cleaned) || /^05[0-9]{8}$/.test(cleaned);
}

/**
 * Extract country code from phone number
 * 
 * @example
 * getCountryCode('+966508034010') // '966'
 */
export function getCountryCode(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  
  // Common country codes (1-3 digits after +)
  const match = normalized.match(/^\+(\d{1,3})/);
  return match ? match[1] : '';
}

