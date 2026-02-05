import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID!

function getClient() {
  return twilio(accountSid, authToken)
}

function getContentApiAuth() {
  return Buffer.from(`${accountSid}:${authToken}`).toString("base64")
}

// ─── Template type definitions ───────────────────────────

export type TemplateType =
  | "twilio/text"
  | "twilio/media"
  | "twilio/call-to-action"
  | "twilio/quick-reply"
  | "twilio/card"
  | "twilio/carousel"
  | "twilio/catalog"

export interface ActionButton {
  type: "URL" | "PHONE" | "PHONE_NUMBER" | "QUICK_REPLY" | "COPY_CODE" | "VOICE_CALL"
  title: string
  id?: string
  url?: string
  phone?: string
  code?: string
}

export interface CarouselCard {
  title?: string
  body: string
  media: string
  actions: ActionButton[]
}

export interface CatalogItem {
  id: string
  section_title: string
}

export interface ContentTemplatePayload {
  friendly_name: string
  language: string
  variables?: Record<string, string>
  types: Record<string, any>
}

// ─── Build typed payload ─────────────────────────────────

export function buildContentPayload(params: {
  name: string
  language: string
  templateType: TemplateType
  body?: string
  // media
  mediaUrls?: string[]
  // call-to-action / quick-reply
  actions?: ActionButton[]
  // card
  title?: string
  subtitle?: string
  // carousel
  cards?: CarouselCard[]
  // catalog
  catalogId?: string
  catalogItems?: CatalogItem[]
  thumbnailItemId?: string
  // variables
  variables?: Record<string, string>
}): ContentTemplatePayload {
  const {
    name, language, templateType, body, mediaUrls, actions, title, subtitle,
    cards, catalogId, catalogItems, thumbnailItemId, variables,
  } = params

  const types: Record<string, any> = {}

  switch (templateType) {
    case "twilio/text":
      types["twilio/text"] = { body: body || "" }
      break

    case "twilio/media":
      types["twilio/media"] = {
        body: body || undefined,
        media: mediaUrls || [],
      }
      break

    case "twilio/call-to-action": {
      const ctaActions = (actions || []).map((a) => {
        // Normalize PHONE → PHONE_NUMBER for Twilio API
        const type = a.type === "PHONE" ? "PHONE_NUMBER" : a.type
        const btn: Record<string, any> = { type, title: a.title }
        if (type === "URL" && a.url) btn.url = a.url
        if (type === "PHONE_NUMBER" && a.phone) btn.phone = a.phone
        if (type === "COPY_CODE" && a.code) btn.code = a.code
        if (type === "VOICE_CALL") btn.phone = a.phone || ""
        return btn
      })
      if (ctaActions.length === 0) {
        throw new Error("twilio/call-to-action requires at least one action button (URL, PHONE_NUMBER, COPY_CODE, or VOICE_CALL)")
      }
      types["twilio/call-to-action"] = {
        body: body || "",
        actions: ctaActions,
      }
      break
    }

    case "twilio/quick-reply":
      types["twilio/quick-reply"] = {
        body: body || "",
        actions: (actions || []).map((a) => ({
          title: a.title,
          id: a.id || a.title.toLowerCase().replace(/\s+/g, "_"),
        })),
      }
      break

    case "twilio/card":
      types["twilio/card"] = {
        title: title || undefined,
        body: body || undefined,
        subtitle: subtitle || undefined,
        media: mediaUrls && mediaUrls.length > 0 ? mediaUrls : undefined,
        actions: actions && actions.length > 0
          ? actions.map((a) => {
              const type = a.type === "PHONE" ? "PHONE_NUMBER" : a.type
              const btn: Record<string, any> = { type, title: a.title }
              if (a.id) btn.id = a.id
              if (a.url) btn.url = a.url
              if (a.phone) btn.phone = a.phone
              return btn
            })
          : undefined,
      }
      break

    case "twilio/carousel":
      types["twilio/carousel"] = {
        body: body || "",
        cards: (cards || []).map((c) => ({
          title: c.title || undefined,
          body: c.body,
          media: c.media,
          actions: c.actions.map((a) => {
            const type = a.type === "PHONE" ? "PHONE_NUMBER" : a.type
            const btn: Record<string, any> = { type, title: a.title }
            if (a.id) btn.id = a.id
            if (a.url) btn.url = a.url
            if (a.phone) btn.phone = a.phone
            return btn
          }),
        })),
      }
      break

    case "twilio/catalog":
      types["twilio/catalog"] = {
        id: catalogId || "",
        title: title || undefined,
        body: body || undefined,
        subtitle: subtitle || undefined,
        thumbnail_item_id: thumbnailItemId || undefined,
        items: catalogItems && catalogItems.length > 0 ? catalogItems : undefined,
      }
      break
  }

  // Clean undefined values from type objects
  for (const key of Object.keys(types)) {
    types[key] = Object.fromEntries(
      Object.entries(types[key]).filter(([, v]) => v !== undefined)
    )
  }

  const payload: ContentTemplatePayload = {
    friendly_name: name,
    language,
    types,
  }

  if (variables && Object.keys(variables).length > 0) {
    payload.variables = variables
  }

  return payload
}

// ─── API calls ───────────────────────────────────────────

/**
 * Create a content template in Twilio Content API (supports all types)
 */
export async function createContentTemplate(payload: ContentTemplatePayload) {
  const res = await fetch("https://content.twilio.com/v1/Content", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getContentApiAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Content API error: ${res.status}`)
  }

  return res.json() as Promise<{ sid: string; friendly_name: string }>
}

/**
 * Submit a content template for WhatsApp approval
 */
export async function submitForWhatsAppApproval(
  contentSid: string,
  category: string,
  templateName?: string
) {
  const mappedCategory = mapCategory(category)

  // WhatsApp requires: lowercase alphanumeric and underscores only
  const rawName = templateName?.trim() || contentSid
  const sanitizedName = rawName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    || `template_${contentSid.replace(/[^a-z0-9]/gi, "").slice(-10)}` // Fallback if sanitization results in empty string

  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${getContentApiAuth()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: sanitizedName,
        category: mappedCategory,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Approval submission error: ${res.status}`)
  }

  return res.json()
}

/**
 * Check approval status for a content template
 */
export async function checkApprovalStatus(contentSid: string) {
  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${getContentApiAuth()}`,
      },
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Approval status error: ${res.status}`)
  }

  const data = await res.json()
  return {
    status: data.whatsapp?.status || "unknown",
    rejectionReason: data.whatsapp?.rejection_reason || null,
  }
}

/**
 * Send a campaign message (immediate or scheduled)
 */
export async function sendCampaignMessage(params: {
  to: string
  from: string
  contentSid: string
  contentVariables?: Record<string, string>
  scheduledAt?: Date
  statusCallbackUrl?: string
}) {
  const { to, from, contentSid, contentVariables, scheduledAt, statusCallbackUrl } = params
  const client = getClient()

  const messageParams: Record<string, any> = {
    to: `whatsapp:${to}`,
    from: `whatsapp:${from}`,
    contentSid,
    messagingServiceSid,
  }

  if (contentVariables && Object.keys(contentVariables).length > 0) {
    messageParams.contentVariables = JSON.stringify(contentVariables)
  }

  if (scheduledAt) {
    messageParams.sendAt = scheduledAt.toISOString()
    messageParams.scheduleType = "fixed"
  }

  if (statusCallbackUrl) {
    messageParams.statusCallback = statusCallbackUrl
  }

  const message = await client.messages.create(messageParams)

  return {
    sid: message.sid,
    status: message.status,
  }
}

/**
 * Cancel a scheduled message
 */
export async function cancelScheduledMessage(messageSid: string) {
  const client = getClient()
  const message = await client.messages(messageSid).update({ status: "canceled" })
  return { sid: message.sid, status: message.status }
}

function mapCategory(category: string): string {
  const map: Record<string, string> = {
    MARKETING: "MARKETING",
    UTILITY: "UTILITY",
    AUTHENTICATION: "AUTHENTICATION",
    ORDER_STATUS: "UTILITY",
    ORDER_UPDATE: "UTILITY",
  }
  return map[category] || "MARKETING"
}
