import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { campaignDb } from "@/lib/db"
import { sendCampaignMessage } from "@/lib/twilio-campaigns"

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

  if (!["DRAFT", "SCHEDULED", "SENT", "FAILED", "CANCELLED"].includes(campaign.status)) {
    return NextResponse.json(
      { error: "Campaign cannot be sent in current status" },
      { status: 400 }
    )
  }

  const isResend = ["SENT", "FAILED", "CANCELLED"].includes(campaign.status)

  const contentSid = campaign.template.twilio_content_sid
  if (!contentSid) {
    return NextResponse.json(
      { error: "Template has not been submitted to WhatsApp yet" },
      { status: 400 }
    )
  }

  const botWhatsappNumber = campaign.restaurant?.bots?.whatsappNumber
  if (!botWhatsappNumber) {
    return NextResponse.json(
      { error: "Bot WhatsApp number not found for restaurant" },
      { status: 400 }
    )
  }

  // Build the base URL for status callbacks (must be publicly accessible HTTPS)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const isPublicUrl = baseUrl.startsWith("https://") && !baseUrl.includes("localhost")
  const statusCallbackUrl = isPublicUrl ? `${baseUrl}/api/campaigns/webhook` : undefined

  // Reset counters on resend
  if (isResend) {
    await campaignDb.updateCampaignStatus(campaign.id, "SENDING", {
      sentCount: 0,
      failedCount: 0,
      deliveredCount: 0,
      sentAt: null,
    })
    // Reset all recipient statuses
    for (const recipient of campaign.recipients) {
      await campaignDb.updateRecipientStatus(recipient.id, "PENDING", {
        waSid: null,
        errorMessage: null,
        sentAt: null,
      })
    }
  } else {
    await campaignDb.updateCampaignStatus(campaign.id, "SENDING")
  }

  let sentCount = 0
  let failedCount = 0

  for (const recipient of campaign.recipients) {
    try {
      const result = await sendCampaignMessage({
        to: recipient.phone,
        from: botWhatsappNumber,
        contentSid,
        scheduledAt: campaign.scheduledAt || undefined,
        statusCallbackUrl,
      })

      await campaignDb.updateRecipientStatus(recipient.id, "SENT", {
        waSid: result.sid,
        sentAt: new Date(),
      })
      sentCount++
    } catch (error: any) {
      await campaignDb.updateRecipientStatus(recipient.id, "FAILED", {
        errorMessage: error.message,
      })
      failedCount++
    }
  }

  const finalStatus = campaign.scheduledAt ? "SCHEDULED" : "SENT"
  await campaignDb.updateCampaignStatus(campaign.id, finalStatus, {
    sentCount,
    failedCount,
    sentAt: campaign.scheduledAt ? undefined : new Date(),
  })

  return NextResponse.json({
    success: true,
    sentCount,
    failedCount,
    status: finalStatus,
  })
}
