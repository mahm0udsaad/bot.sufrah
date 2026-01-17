/**
 * Admin Twilio API Service (client-side)
 * Calls internal admin routes that query Twilio server-side.
 */

export interface TwilioSender {
  sid?: string
  status?: string
  senderId?: string
  wabaId?: string | null
  profileName?: string | null
}

function getAuthHeaders(): HeadersInit {
  const adminPassword = typeof window !== "undefined" ? sessionStorage.getItem("admin_password") : null
  return {
    "Content-Type": "application/json",
    ...(adminPassword && { Authorization: `Bearer ${adminPassword}` }),
  }
}

export async function listTwilioSenders(options?: { limit?: number; channel?: string }): Promise<TwilioSender[]> {
  const params = new URLSearchParams()
  params.set("channel", options?.channel || "whatsapp")
  if (typeof options?.limit === "number") params.set("limit", String(options.limit))

  const response = await fetch(`/api/admin/twilio/senders?${params.toString()}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || "Failed to fetch Twilio senders")
  }

  return (body?.senders || []) as TwilioSender[]
}

