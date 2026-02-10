import prisma from "@/lib/prisma"
import { campaignDb } from "@/lib/db"
import { fetchMerchantClients, type ExternalClientData } from "@/lib/merchants"

export type ClientContactSource = "bot" | "sufrah" | "both"

export type ClientContact = {
  customerWa: string
  customerName: string | null
  source: ClientContactSource
}

type ContactAccumulator = {
  customerWa: string
  customerName: string | null
  fromBot: boolean
  fromSufrah: boolean
}

export type ExternalClientQuery = {
  filter?: string
  sorting?: string
  skipCount?: number
  maxResultCount?: number
}

export function normalizeClientPhone(raw: string): string {
  if (!raw) return ""
  let value = raw.trim()
  if (!value) return ""
  value = value.replace(/^whatsapp:/i, "")
  value = value.replace(/[^\d+]/g, "")
  if (value.startsWith("00")) value = value.slice(2)
  if (value.startsWith("+")) value = value.slice(1)
  value = value.replace(/[^\d]/g, "")
  return value
}

export function validateClientPhone(raw: string): { valid: boolean; phone: string; error?: string } {
  const phone = normalizeClientPhone(raw)
  if (!phone) return { valid: false, phone, error: "Number is empty" }
  if (!/^\d{8,15}$/.test(phone)) {
    return { valid: false, phone, error: "Invalid number. Expected 8-15 digits." }
  }
  return { valid: true, phone }
}

function getClientPhone(client: ExternalClientData): string {
  const candidate =
    client.whatsappNumber ||
    client.phoneNumber ||
    client.mobileNumber ||
    client.customerPhone ||
    client.phone ||
    ""
  return typeof candidate === "string" ? normalizeClientPhone(candidate) : ""
}

function getClientName(client: ExternalClientData): string | null {
  const candidate =
    client.name ||
    client.fullName ||
    client.clientName ||
    client.displayName ||
    null

  if (typeof candidate !== "string") return null
  const trimmed = candidate.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function getMergedClientContacts(params: {
  restaurantId: string
  externalMerchantId?: string | null
  externalQuery?: ExternalClientQuery
}): Promise<ClientContact[]> {
  const { restaurantId, externalMerchantId, externalQuery } = params

  const dbContacts = await campaignDb.getCustomerContacts(restaurantId)
  let importedContacts: Array<{ phone: string; name: string }> = []
  const importedClientModel = (prisma as any).importedClientContact
  try {
    if (importedClientModel?.findMany) {
      importedContacts = await importedClientModel.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        select: { phone: true, name: true },
      })
    } else {
      console.warn("[client-contacts] Prisma client missing importedClientContact model; continuing without imported contacts")
    }
  } catch (error: any) {
    // Graceful fallback before migration is applied.
    const code = typeof error?.code === "string" ? error.code : ""
    const message = typeof error?.message === "string" ? error.message : ""
    const tableMissing =
      code === "P2021" ||
      message.includes('relation "ImportedClientContact" does not exist') ||
      message.includes("ImportedClientContact")

    if (!tableMissing) {
      throw error
    }
    console.warn("[client-contacts] ImportedClientContact table missing, continuing without imported contacts")
  }

  const merged = new Map<string, ContactAccumulator>()

  for (const contact of dbContacts) {
    const phone = normalizeClientPhone(contact.customerWa || "")
    if (!phone) continue
    merged.set(phone, {
      customerWa: phone,
      customerName: contact.customerName || null,
      fromBot: true,
      fromSufrah: false,
    })
  }

  // Imported contacts are internal/bot-side and should override name if provided
  for (const contact of importedContacts) {
    const phone = normalizeClientPhone(contact.phone || "")
    if (!phone) continue
    const existing = merged.get(phone)
    if (!existing) {
      merged.set(phone, {
        customerWa: phone,
        customerName: contact.name || null,
        fromBot: true,
        fromSufrah: false,
      })
      continue
    }

    merged.set(phone, {
      customerWa: existing.customerWa,
      customerName: contact.name || existing.customerName,
      fromBot: true,
      fromSufrah: existing.fromSufrah,
    })
  }

  if (externalMerchantId) {
    const external = await fetchMerchantClients(externalMerchantId, {
      filter: externalQuery?.filter,
      sorting: externalQuery?.sorting,
      skipCount: externalQuery?.skipCount,
      maxResultCount: externalQuery?.maxResultCount ?? 1000,
    })

    if (!external.success) {
      console.error("[client-contacts] Failed to fetch external clients:", external.error)
    } else {
      for (const client of external.data || []) {
        const phone = getClientPhone(client)
        if (!phone) continue

        const existing = merged.get(phone)
        const externalName = getClientName(client)
        if (!existing) {
          merged.set(phone, {
            customerWa: phone,
            customerName: externalName,
            fromBot: false,
            fromSufrah: true,
          })
          continue
        }

        merged.set(phone, {
          customerWa: existing.customerWa,
          customerName: existing.customerName || externalName,
          fromBot: existing.fromBot,
          fromSufrah: true,
        })
      }
    }
  }

  return Array.from(merged.values()).map((item) => ({
    customerWa: item.customerWa,
    customerName: item.customerName,
    source: item.fromBot && item.fromSufrah ? "both" : item.fromSufrah ? "sufrah" : "bot",
  }))
}
