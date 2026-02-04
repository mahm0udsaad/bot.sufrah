import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ""
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ""

function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) return false
  const password = authHeader.replace("Bearer ", "").trim()
  return password === ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "غير مصرح - Unauthorized" }, { status: 401 })
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: "Twilio credentials are not configured" },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const channel = searchParams.get("channel") || "whatsapp"

    const url = `https://messaging.twilio.com/v2/Channels/Senders?Channel=${encodeURIComponent(channel)}`
    const basicAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")

    const twilioResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const text = await twilioResponse.text()
    let body: any = {}
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      // non-JSON body; return as-is for debugging
      body = { raw: text }
    }

    if (!twilioResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Twilio senders", details: body },
        { status: twilioResponse.status },
      )
    }

    const items = Array.isArray(body?.senders)
      ? body.senders
      : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body)
      ? body
      : []

    const senders = items.map((item: any) => {
      const sid = item?.sid || item?.Sid || item?.sender_sid || item?.SenderSid
      const senderId = item?.sender_id || item?.SenderId || item?.address || item?.Address
      const configuration = item?.configuration || item?.Configuration || {}
      const profile = item?.profile || item?.Profile || {}
      const status = item?.status || item?.Status
      const channelValue = item?.channel || item?.Channel || channel
      return {
        sid,
        sender_id: senderId,
        channel: channelValue,
        status,
        configuration,
        profile,
      }
    })

    return NextResponse.json({ senders })
  } catch (error: any) {
    console.error("[admin/twilio/senders] Error:", error)
    return NextResponse.json(
      { error: "Server error while fetching Twilio senders" },
      { status: 500 },
    )
  }
}


