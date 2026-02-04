import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { campaignDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")
  const status = searchParams.get("status") || undefined

  const result = await campaignDb.listCampaigns(restaurant.id, {
    limit,
    offset,
    status,
  })

  return NextResponse.json({
    campaigns: result.campaigns,
    pagination: {
      total: result.total,
      limit,
      offset,
      hasMore: result.hasMore,
    },
  })
}

export async function POST(request: NextRequest) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, templateId, recipients, scheduledAt } = body

  if (!name || !templateId || !recipients?.length) {
    return NextResponse.json(
      { error: "name, templateId, and recipients are required" },
      { status: 400 }
    )
  }

  const campaign = await campaignDb.createCampaign({
    restaurantId: restaurant.id,
    name,
    templateId,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    recipients,
  })

  // If template is pending approval, set campaign to WAITING_APPROVAL
  if (campaign.template?.status === "PENDING") {
    await campaignDb.updateCampaignStatus(campaign.id, "WAITING_APPROVAL")
    campaign.status = "WAITING_APPROVAL"
  }

  return NextResponse.json({ campaign }, { status: 201 })
}
