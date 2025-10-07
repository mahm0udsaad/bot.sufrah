"use client"

import { useState } from "react"
import { OTPVerification } from "@/components/onboarding/OTPVerification"

interface Props {
  restaurantId: string
  initialPhone?: string | null
  onStarted: (bot: unknown) => void
}

const phoneRegex = /^\+[1-9]\d{7,14}$/

export function WhatsAppSetupForm({ restaurantId, initialPhone, onStarted }: Props) {
  const [phone, setPhone] = useState(initialPhone ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [startedBot, setStartedBot] = useState<any | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!phoneRegex.test(phone.trim())) {
      setError("Please enter a valid phone number in +E.164 format (e.g., +971501234567).")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/onboarding/whatsapp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), restaurantId }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to register WhatsApp number")
      }

      onStarted(payload.bot)
      setStartedBot(payload.bot)
      setSuccess(true)
    } catch (err) {
      console.error("WhatsApp sender registration failed", err)
      setError(err instanceof Error ? err.message : "Unable to register number right now")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="whatsapp-number" className="block text-sm font-medium text-foreground">
          WhatsApp phone number
        </label>
        <input
          id="whatsapp-number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+971501234567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Use the number you want customers to message. It must be able to receive SMS or voice OTP.
        </p>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-600">OTP sent! Check your phone for the verification code.</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {loading ? "Registering..." : "Send verification code"}
      </button>
      {startedBot?.senderSid && startedBot?.verificationSid ? (
        <div className="pt-2">
          <OTPVerification
            senderSid={startedBot.senderSid as string}
            onVerified={() => {
              // Parent will refresh status via polling; clear local state success message
              setSuccess(false)
            }}
          />
        </div>
      ) : null}
    </form>
  )
}
