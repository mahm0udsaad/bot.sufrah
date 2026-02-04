import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/server-auth"
import prisma from "@/lib/prisma"
import {
  buildContentPayload,
  createContentTemplate,
  submitForWhatsAppApproval,
  type TemplateType,
} from "@/lib/twilio-campaigns"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Accept optional overrides from the request body
  let bodyOverrides: Record<string, any> = {}
  try {
    bodyOverrides = await request.json()
  } catch {
    // No body, that's fine — will use DB template data
  }

  const template = await prisma.template.findFirst({
    where: { id, user_id: user.id },
  })

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  if (template.twilio_content_sid) {
    try {
      await submitForWhatsAppApproval(template.twilio_content_sid, template.category, template.name)
      await prisma.template.update({
        where: { id },
        data: { status: "PENDING" },
      })
      return NextResponse.json({
        success: true,
        contentSid: template.twilio_content_sid,
        message: "Re-submitted for approval",
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  try {
    // Build variables map
    const variables: Record<string, string> = {}
    const varArray = (template.variables as string[]) || []
    varArray.forEach((v, i) => {
      variables[String(i + 1)] = v
    })

    // Determine template type from header_type or body overrides
    const templateType: TemplateType = bodyOverrides.templateType || mapHeaderTypeToTemplateType(template.header_type)

    // Build the payload using the typed builder
    const dbButtons = template.buttons as any[]
    const buttons = bodyOverrides.actions?.length > 0 ? bodyOverrides.actions : (dbButtons?.length > 0 ? dbButtons : [])
    const payload = buildContentPayload({
      name: template.name,
      language: template.language || "ar",
      templateType,
      body: template.body_text,
      title: bodyOverrides.title || template.header_content || undefined,
      subtitle: bodyOverrides.subtitle || template.footer_text || undefined,
      mediaUrls: bodyOverrides.mediaUrls || (template.header_type === "image" || template.header_type === "video" || template.header_type === "document"
        ? [template.header_content].filter(Boolean) as string[]
        : undefined),
      actions: buttons.length > 0
        ? buttons.map((b: any) => ({
            type: b.type || "QUICK_REPLY",
            title: b.title || b.text || "",
            id: b.id,
            url: b.url,
            phone: b.phone,
            code: b.code,
          }))
        : undefined,
      cards: bodyOverrides.cards,
      catalogId: bodyOverrides.catalogId,
      catalogItems: bodyOverrides.catalogItems,
      thumbnailItemId: bodyOverrides.thumbnailItemId,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
    })

    // Step 1: Create in Twilio Content API
    const content = await createContentTemplate(payload)

    // Step 2: Submit for WhatsApp approval
    await submitForWhatsAppApproval(content.sid, template.category, template.name)

    // Step 3: Update DB
    await prisma.template.update({
      where: { id },
      data: {
        twilio_content_sid: content.sid,
        status: "PENDING",
        header_type: templateType,
      },
    })

    return NextResponse.json({
      success: true,
      contentSid: content.sid,
      message: "Template submitted for WhatsApp approval",
    })
  } catch (error: any) {
    console.error("[campaign-template-submit] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function mapHeaderTypeToTemplateType(headerType: string | null): TemplateType {
  switch (headerType) {
    case "image":
    case "video":
    case "document":
      return "twilio/media"
    case "twilio/call-to-action":
    case "twilio/quick-reply":
    case "twilio/card":
    case "twilio/carousel":
    case "twilio/catalog":
    case "twilio/media":
    case "twilio/text":
      return headerType as TemplateType
    default:
      return "twilio/text"
  }
}
