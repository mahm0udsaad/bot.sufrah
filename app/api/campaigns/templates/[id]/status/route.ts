import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/server-auth"
import prisma from "@/lib/prisma"
import { checkApprovalStatus } from "@/lib/twilio-campaigns"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const template = await prisma.template.findFirst({
    where: { id, user_id: user.id },
  })

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  if (!template.twilio_content_sid) {
    return NextResponse.json({
      status: template.status || "draft",
      message: "Template has not been submitted yet",
    })
  }

  try {
    const approval = await checkApprovalStatus(template.twilio_content_sid)

    // Map Twilio status to our status
    let newStatus = template.status
    if (approval.status === "approved") newStatus = "APPROVED"
    else if (approval.status === "rejected") newStatus = "REJECTED"
    else if (["received", "pending"].includes(approval.status)) newStatus = "PENDING"

    // Update if changed
    if (newStatus !== template.status) {
      await prisma.template.update({
        where: { id },
        data: { status: newStatus },
      })

      // Cascade status change to campaigns using this template
      if (newStatus === "APPROVED") {
        await prisma.campaign.updateMany({
          where: { templateId: id, status: "WAITING_APPROVAL" },
          data: { status: "DRAFT" },
        })
      } else if (newStatus === "REJECTED") {
        await prisma.campaign.updateMany({
          where: { templateId: id, status: "WAITING_APPROVAL" },
          data: { status: "FAILED" },
        })
      }
    }

    return NextResponse.json({
      status: newStatus,
      twilioStatus: approval.status,
      rejectionReason: approval.rejectionReason,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
