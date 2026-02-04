import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { campaignDb } from "@/lib/db"
import { cancelScheduledMessage } from "@/lib/twilio-campaigns"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const campaign = await campaignDb.getCampaign(restaurant.id, id)
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  if (!["SCHEDULED", "SENDING"].includes(campaign.status)) {
    return NextResponse.json(
      { error: "Only scheduled or sending campaigns can be cancelled" },
      { status: 400 }
    )
  }

  // Cancel each scheduled message
  let cancelledCount = 0
  for (const recipient of campaign.recipients) {
    if (recipient.waSid && recipient.status === "SENT") {
      try {
        await cancelScheduledMessage(recipient.waSid)
        cancelledCount++
      } catch {
        // Message may have already been sent
      }
    }
  }

  await campaignDb.updateCampaignStatus(campaign.id, "CANCELLED")

  return NextResponse.json({ success: true, cancelledCount })
}
