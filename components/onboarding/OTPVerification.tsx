"use client"

import { useState } from "react"

interface Props {
  senderSid: string
  onVerified: (bot: unknown) => void
}

export function OTPVerification({ senderSid, onVerified }: Props) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleVerify = async () => {
    setError(null)
    setSuccess(false)

    if (!code.trim()) {
      setError("Enter the OTP sent to your phone")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/onboarding/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderSid, code: code.trim() }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Verification failed")
      }

      onVerified(payload.bot)
      setSuccess(true)
    } catch (err) {
      console.error("WhatsApp sender verification failed", err)
      setError(err instanceof Error ? err.message : "Unable to verify code right now")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async (method: "sms" | "voice") => {
    setError(null)
    setResendSuccess(false)
    setResending(true)

    try {
      const response = await fetch("/api/onboarding/whatsapp/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderSid, method }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to resend OTP")
      }

      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (err) {
      console.error("Failed to resend OTP", err)
      setError(err instanceof Error ? err.message : "Unable to resend OTP right now")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
        📱 Check your phone for the verification code
      </div>

      <div className="space-y-1">
        <label htmlFor="otp-code" className="block text-sm font-medium text-foreground">
          Enter OTP
        </label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && code.trim()) {
              void handleVerify()
            }
          }}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <p className="text-xs text-muted-foreground">Enter the 6-digit code sent via SMS or voice.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          ✓ Verified successfully! Your bot will activate shortly.
        </div>
      ) : null}

      {resendSuccess ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-600">
          ✓ OTP resent successfully! Check your phone.
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleVerify()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Verifying..." : "Confirm verification"}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResendOTP("sms")}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-60"
        >
          {resending ? "Sending..." : "📱 Resend SMS"}
        </button>
        <button
          type="button"
          disabled={resending}
          onClick={() => void handleResendOTP("voice")}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-60"
        >
          {resending ? "Calling..." : "📞 Call me"}
        </button>
      </div>
    </div>
  )
}
