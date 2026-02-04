import { NextRequest, NextResponse } from "next/server"
import { campaignDb } from "@/lib/db"

/**
 * Twilio status callback webhook for campaign messages.
 * Twilio sends POST with form-urlencoded data.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const messageSid = formData.get("MessageSid") as string
  const messageStatus = formData.get("MessageStatus") as string

  if (!messageSid || !messageStatus) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const recipient = await campaignDb.findRecipientByWaSid(messageSid)
  if (!recipient) {
    // Not a campaign message, ignore
    return NextResponse.json({ ok: true })
  }

  if (messageStatus === "delivered" || messageStatus === "read") {
    await campaignDb.updateRecipientStatus(recipient.id, "DELIVERED")
    await campaignDb.incrementCampaignCounter(recipient.campaignId, "deliveredCount")
  } else if (messageStatus === "failed" || messageStatus === "undelivered") {
    const errorCode = formData.get("ErrorCode") as string
    await campaignDb.updateRecipientStatus(recipient.id, "FAILED", {
      errorMessage: `${messageStatus}: ${errorCode || "unknown"}`,
    })
    await campaignDb.incrementCampaignCounter(recipient.campaignId, "failedCount")
  }

  return NextResponse.json({ ok: true })
}
