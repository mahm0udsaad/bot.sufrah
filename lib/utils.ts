import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize various currency inputs (symbols, lowercase, aliases) to valid ISO 4217 codes.
export function normalizeCurrencyCode(input?: string): string {
  const value = (input || '').toString().trim()
  if (!value) return 'USD'

  const upper = value.toUpperCase()

  // Common direct ISO codes
  const isoDirect = new Set(['USD', 'SAR', 'AED', 'EGP', 'EUR', 'GBP', 'PKR', 'INR'])
  if (isoDirect.has(upper)) return upper

  // Map common symbols/variants to ISO codes
  const map: Record<string, string> = {
    'ر.س': 'SAR', // Saudi Riyal in Arabic
    'ريال': 'SAR',
    'SAR ': 'SAR',
    'SR': 'SAR',
    'S.R.': 'SAR',
    '﷼': 'SAR', // generic riyal symbol
    '£': 'GBP',
    '€': 'EUR',
    '$': 'USD',
  }

  if (map[value]) return map[value]
  if (map[upper]) return map[upper]

  // Fallback: try to use Intl to validate; if invalid, default to USD
  try {
    // This will throw for invalid codes
    new Intl.NumberFormat('en-US', { style: 'currency', currency: upper }).format(1)
    return upper
  } catch {
    return 'USD'
  }
}
