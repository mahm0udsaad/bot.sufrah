import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedRestaurant } from "@/lib/server-auth"
import { campaignDb } from "@/lib/db"

export async function GET(
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

  return NextResponse.json({ campaign })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  await campaignDb.updateCampaign(restaurant.id, id, body)
  const campaign = await campaignDb.getCampaign(restaurant.id, id)

  return NextResponse.json({ campaign })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restaurant = await getAuthenticatedRestaurant(request)
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const result = await campaignDb.deleteCampaign(restaurant.id, id)
  if (result.count === 0) {
    return NextResponse.json(
      { error: "Campaign not found or cannot be deleted (must be DRAFT)" },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}
