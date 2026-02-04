import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import twilio from "twilio"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!

/**
 * GET /api/admin/billing?month=2026-01
 *
 * 1. Fetches actual WhatsApp costs from the main Twilio account's Usage Record API
 * 2. Counts per-restaurant messages from the DB (Message + CampaignRecipient tables)
 * 3. Allocates the real Twilio cost proportionally by message count per restaurant
 *
 * Twilio Usage Record API: https://www.twilio.com/docs/usage/api/usage-record
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month")

  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number)
    year = y
    month = m
  }

  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  try {
    // ── Step 1: Get actual costs from Twilio Usage Records API ──
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    const usageRecords = await client.usage.records.list({
      startDate: startDateStr,
      endDate: endDateStr,
    })

    // Filter WhatsApp categories with non-zero data
    const whatsappCategories: Record<
      string,
      { count: number; price: number; description: string }
    > = {}
    let twilioTotalCost = 0
    let twilioTotalMessages = 0

    for (const record of usageRecords) {
      const cat = record.category
      if (!cat.includes("whatsapp")) continue
      const price = parseFloat(record.price || "0")
      const count = parseInt(record.count || "0", 10)
      if (price === 0 && count === 0) continue

      whatsappCategories[cat] = {
        count,
        price,
        description: record.description || cat,
      }
      twilioTotalCost += price
      twilioTotalMessages += count
    }

    // The "channels-whatsapp" category is the aggregate (Twilio per-message fee)
    // Other categories like "channels-whatsapp-template-utility" are Meta fees
    // Total cost = sum of all whatsapp categories

    // ── Step 2: Get per-restaurant message counts from DB ──
    // Count conversation messages (Message table)
    const dbMessageCounts: any[] = await prisma.$queryRaw`
      SELECT
        r.id as restaurant_id,
        r.name as restaurant_name,
        COALESCE(SUM(CASE WHEN m.direction = 'IN' THEN 1 ELSE 0 END), 0)::int as inbound,
        COALESCE(SUM(CASE WHEN m.direction = 'OUT' THEN 1 ELSE 0 END), 0)::int as outbound,
        COUNT(m.id)::int as total
      FROM "RestaurantProfile" r
      LEFT JOIN "Message" m
        ON m.restaurant_id = r.id
        AND m.created_at >= ${startDate}
        AND m.created_at < ${endDate}
      WHERE r.status = 'ACTIVE'
      GROUP BY r.id, r.name
    `

    // Count campaign messages (CampaignRecipient table)
    const dbCampaignCounts: any[] = await prisma.$queryRaw`
      SELECT
        c.restaurant_id,
        COUNT(cr.id)::int as campaign_sent
      FROM "CampaignRecipient" cr
      JOIN "Campaign" c ON cr.campaign_id = c.id
      WHERE cr.status IN ('SENT', 'DELIVERED')
        AND cr.sent_at >= ${startDate}
        AND cr.sent_at < ${endDate}
      GROUP BY c.restaurant_id
    `

    const campaignMap = new Map<string, number>()
    for (const row of dbCampaignCounts) {
      campaignMap.set(row.restaurant_id, row.campaign_sent)
    }

    // ── Step 3: Allocate Twilio cost proportionally ──
    const restaurantData = dbMessageCounts.map((r) => {
      const campaignSent = campaignMap.get(r.restaurant_id) || 0
      const totalMessages = r.total + campaignSent
      return {
        restaurantId: r.restaurant_id,
        name: r.restaurant_name,
        inbound: r.inbound,
        outbound: r.outbound,
        campaignSent,
        totalMessages,
      }
    })

    const dbTotalMessages = restaurantData.reduce(
      (sum, r) => sum + r.totalMessages,
      0
    )

    // Proportional allocation: each restaurant's share of total Twilio cost
    const results = restaurantData
      .filter((r) => r.totalMessages > 0)
      .map((r) => {
        const share =
          dbTotalMessages > 0 ? r.totalMessages / dbTotalMessages : 0
        const allocatedCost = twilioTotalCost * share

        return {
          restaurantId: r.restaurantId,
          name: r.name,
          inbound: r.inbound,
          outbound: r.outbound,
          campaignSent: r.campaignSent,
          totalMessages: r.totalMessages,
          allocatedCost,
          sharePercent: share * 100,
        }
      })
      .sort((a, b) => b.allocatedCost - a.allocatedCost)

    return NextResponse.json({
      success: true,
      month: `${year}-${String(month).padStart(2, "0")}`,
      source: "twilio-usage-api",
      twilio: {
        totalCost: twilioTotalCost,
        totalMessages: twilioTotalMessages,
        categories: whatsappCategories,
      },
      restaurants: results,
      totals: {
        restaurants: results.length,
        dbMessages: dbTotalMessages,
        twilioMessages: twilioTotalMessages,
        cost: twilioTotalCost,
      },
    })
  } catch (error: any) {
    console.error("[admin/billing] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch billing data" },
      { status: 500 }
    )
  }
}
