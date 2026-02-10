import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { getMergedClientContacts, type ClientContact } from "@/lib/client-contacts"

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(contacts: ClientContact[]) {
  const lines = ["name,number"]
  for (const contact of contacts) {
    const name = contact.customerName || ""
    const number = contact.customerWa || ""
    lines.push(`${csvEscape(name)},${csvEscape(number)}`)
  }
  return lines.join("\n")
}

export async function GET(request: NextRequest) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const scope = (params.get("scope") || "all").toLowerCase()

  if (!["all", "bot", "sufrah"].includes(scope)) {
    return NextResponse.json({ error: "Invalid scope. Use all|bot|sufrah" }, { status: 400 })
  }

  const contacts = await getMergedClientContacts({
    restaurantId: restaurant.id,
    externalMerchantId: restaurant.externalMerchantId,
  })

  const filtered = contacts.filter((c) => {
    if (scope === "all") return true
    if (scope === "bot") return c.source === "bot" || c.source === "both"
    return c.source === "sufrah" || c.source === "both"
  })

  const csv = buildCsv(filtered)
  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${scope}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}

