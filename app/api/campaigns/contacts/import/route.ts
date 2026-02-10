import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import prisma from "@/lib/prisma"
import { validateClientPhone } from "@/lib/client-contacts"

type ParsedRow = {
  rowNumber: number
  name: string
  number: string
}

type ImportErrorRow = {
  row: number
  error: string
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let current = ""
  let i = 0
  let inQuotes = false

  while (i < line.length) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i++
      continue
    }
    if (ch === "," && !inQuotes) {
      out.push(current)
      current = ""
      i++
      continue
    }
    current += ch
    i++
  }

  out.push(current)
  return out.map((v) => v.trim())
}

function parseCsv(content: string): { rows: ParsedRow[]; errors: ImportErrorRow[] } {
  const cleaned = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = cleaned.split("\n")
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  const errors: ImportErrorRow[] = []

  if (nonEmptyLines.length === 0) {
    return { rows: [], errors: [{ row: 1, error: "CSV file is empty" }] }
  }

  const headerParts = parseCsvLine(nonEmptyLines[0]).map((v) => v.toLowerCase().trim())
  if (headerParts.length !== 2 || headerParts[0] !== "name" || headerParts[1] !== "number") {
    return {
      rows: [],
      errors: [{ row: 1, error: 'Invalid header. Expected exactly: "name,number"' }],
    }
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const raw = nonEmptyLines[i]
    const rowNumber = i + 1
    const parts = parseCsvLine(raw)
    if (parts.length !== 2) {
      errors.push({ row: rowNumber, error: "Expected exactly 2 columns: name, number" })
      continue
    }

    const name = parts[0].trim()
    const number = parts[1].trim()
    if (!name) {
      errors.push({ row: rowNumber, error: "Name is required" })
      continue
    }
    if (!number) {
      errors.push({ row: rowNumber, error: "Number is required" })
      continue
    }

    rows.push({ rowNumber, name, number })
  }

  return { rows, errors }
}

export async function POST(request: NextRequest) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const importedClientModel = (prisma as any).importedClientContact
  if (!importedClientModel?.findMany || !importedClientModel?.upsert) {
    return NextResponse.json(
      { error: "Import model not available. Run `npx prisma generate` and restart the app." },
      { status: 500 }
    )
  }

  const form = await request.formData()
  const file = form.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required in field `file`" }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported" }, { status: 400 })
  }

  const raw = await file.text()
  const parsed = parseCsv(raw)
  const errors: ImportErrorRow[] = [...parsed.errors]
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found", summary: { totalRows: 0, created: 0, updated: 0, errors: errors.length }, errors },
      { status: 400 }
    )
  }

  // Keep last occurrence for duplicate numbers in the same file
  const deduped = new Map<string, { name: string; rowNumber: number }>()
  let invalidCount = 0
  for (const row of parsed.rows) {
    const valid = validateClientPhone(row.number)
    if (!valid.valid) {
      invalidCount++
      errors.push({ row: row.rowNumber, error: valid.error || "Invalid number" })
      continue
    }
    deduped.set(valid.phone, { name: row.name, rowNumber: row.rowNumber })
  }

  const phones = Array.from(deduped.keys())
  if (phones.length === 0) {
    return NextResponse.json(
      {
        error: "No importable rows after validation",
        summary: { totalRows: parsed.rows.length, created: 0, updated: 0, errors: errors.length },
        errors,
      },
      { status: 400 }
    )
  }

  const existing = await importedClientModel.findMany({
    where: { restaurantId: restaurant.id, phone: { in: phones } },
    select: { phone: true },
  })
  const existingSet = new Set(existing.map((x) => x.phone))

  const upserts = phones.map((phone) =>
    importedClientModel.upsert({
      where: { restaurantId_phone: { restaurantId: restaurant.id, phone } },
      update: { name: deduped.get(phone)!.name },
      create: { restaurantId: restaurant.id, phone, name: deduped.get(phone)!.name },
    })
  )

  const updateConversationNames = phones.map((phone) =>
    prisma.conversation.updateMany({
      where: {
        restaurantId: restaurant.id,
        OR: [
          { customerWa: phone },
          { customerWa: `+${phone}` },
          { customerWa: `whatsapp:${phone}` },
          { customerWa: `whatsapp:+${phone}` },
        ],
      },
      data: { customerName: deduped.get(phone)!.name },
    })
  )

  await prisma.$transaction([...upserts, ...updateConversationNames])

  const created = phones.filter((phone) => !existingSet.has(phone)).length
  const updated = phones.length - created

  return NextResponse.json({
    success: true,
    summary: {
      totalRows: parsed.rows.length,
      created,
      updated,
      errors: errors.length,
      invalidRows: invalidCount,
    },
    errors,
  })
}
