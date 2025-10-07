"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"

function WhatsAppCallbackView() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState("Processing your connection...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saveData = async () => {
      // Log all parameters for debugging
      const allParams: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        allParams[key] = value
      })
      console.log("[WhatsApp Callback] Received params:", allParams)

      const restaurantId = searchParams.get("restaurantId")

      // Check if we have the success parameter from Twilio
      const code = searchParams.get("code")
      const embeddedSignupId = searchParams.get("embedded_signup_id")

      // Try different parameter formats
      const wabaId = searchParams.get("waba_id") || searchParams.get("wabaId")
      const phoneNumber = searchParams.get("phone_number") || searchParams.get("phoneNumber")
      const senderSid = searchParams.get("sender_sid") || searchParams.get("senderSid")
      const status = searchParams.get("status") || "approved"

      // Case 1: If we have just restaurantId (embedded signup callback without direct credentials)
      // This means the user completed the flow, but Twilio will send data via webhook
      if (restaurantId && !wabaId && !phoneNumber && !code && !embeddedSignupId) {
        console.log("[WhatsApp Callback] Embedded signup complete, awaiting webhook...")
        setMessage("✓ Connection initiated! Your WhatsApp will be verified shortly. You can close this window.")

        setTimeout(() => {
          window.close()
        }, 2000)
        return
      }

      // Case 2: If we have code or embedded_signup_id, process them via backend
      if (restaurantId && (code || embeddedSignupId)) {
        try {
          const response = await fetch("/api/onboarding/whatsapp/process-callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId,
              code,
              embeddedSignupId,
              allParams,
            }),
          })

          const data = await response.json()

          if (!response.ok || !data.success) {
            throw new Error(data.error || "Failed to process WhatsApp connection.")
          }

          setMessage("✓ WhatsApp connected successfully! You can close this window.")

          setTimeout(() => {
            window.close()
          }, 2000)
          return
        } catch (err) {
          console.error("[WhatsApp Callback] Error processing callback:", err)
          setError(err instanceof Error ? err.message : "An unknown error occurred.")
          return
        }
      }

      // Case 3: Direct credentials in URL (manual/legacy flow)
      if (!restaurantId || !wabaId || !phoneNumber || !senderSid) {
        console.warn("[WhatsApp Callback] Missing required parameters")
        setError(
          `Connection incomplete. Please close this window and check your dashboard. If the problem persists, try again.`
        )
        // Auto-close even on error after showing message
        setTimeout(() => {
          window.close()
        }, 5000)
        return
      }

      try {
        const response = await fetch("/api/onboarding/whatsapp/save-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            wabaId,
            whatsappNumber: phoneNumber,
            senderSid,
            status,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to save your WhatsApp connection.")
        }

        setMessage("✓ WhatsApp connected successfully! You can close this window.")

        setTimeout(() => {
          window.close()
        }, 2000)
      } catch (err) {
        console.error("[WhatsApp Callback] Error saving credentials:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred.")
      }
    }

    saveData()
  }, [searchParams])

  return (
    <div className="flex h-screen items-center justify-center bg-background p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Connecting to WhatsApp</h1>
        {error ? (
          <p className="mt-4 text-red-600">{error}</p>
        ) : (
          <p className="mt-4 text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  )
}

export default function WhatsAppCallbackPage() {
  return (
    <Suspense fallback={<Skeleton className="h-full w-full" />}>
      <WhatsAppCallbackView />
    </Suspense>
  )
}
