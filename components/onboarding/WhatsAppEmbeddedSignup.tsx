"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  restaurantId: string
  onStarted?: (bot: unknown) => void
}

export function WhatsAppEmbeddedSignup({ restaurantId, onStarted }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popupClosed, setPopupClosed] = useState(false)

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)
    setPopupClosed(false)

    try {
      const response = await fetch("/api/onboarding/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to start connection process.")
      }

      if (!data.url) {
        throw new Error("No signup URL received from server.")
      }

      // Open popup with better positioning
      const width = 800
      const height = 700
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2
      const popup = window.open(
        data.url,
        "whatsapp-signup",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        throw new Error("Failed to open signup window. Please allow popups and try again.")
      }

      // Periodically check if the popup is closed
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          setPopupClosed(true)
          setIsLoading(false)
          // Refresh to get updated bot status
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      }, 500)

      // Set a timeout to stop checking after 10 minutes
      setTimeout(() => {
        clearInterval(timer)
        if (!popup.closed) {
          popup.close()
        }
        setIsLoading(false)
      }, 600000) // 10 minutes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred."
      setError(errorMessage)
      setIsLoading(false)
      console.error("WhatsApp embedded signup failed:", err)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
        <p className="font-medium text-foreground">✨ Recommended: Connect via Meta Business</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Secure one-click connection through Meta's official WhatsApp Business flow. No manual OTP entry required.
        </p>
      </div>

      <Button
        onClick={handleConnect}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? "Opening connection window..." : "🔗 Connect WhatsApp Business"}
      </Button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-medium text-red-700">Connection Error</p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <button
            onClick={handleConnect}
            className="mt-2 text-xs font-medium text-red-700 underline hover:text-red-800"
          >
            Retry Connection
          </button>
        </div>
      )}

      {popupClosed && !error && (
        <div className="space-y-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⏳ Connection window closed. Waiting for verification from Meta/Twilio...
          </div>
          <p className="text-xs text-muted-foreground">
            The page will automatically refresh in a moment to show your connection status.
          </p>
        </div>
      )}
    </div>
  )
}
