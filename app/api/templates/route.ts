import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { db } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function getUserFromToken(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.userId as string
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const templates = await db.getTemplates(userId)

    // Add variables extraction for each template
    const templatesWithVariables = templates.map((template) => ({
      ...template,
      variables: extractVariables(template.body_text),
    }))

    return NextResponse.json(templatesWithVariables)
  } catch (error) {
    console.error("Templates API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { name, category, body_text, header_type, header_content, footer_text } = await request.json()

    if (!name || !category || !body_text) {
      return NextResponse.json(
        { success: false, message: "Name, category, and body text are required" },
        { status: 400 },
      )
    }

    const template = await db.createTemplate({
      user_id: userId,
      name,
      category,
      body_text,
      header_type,
      header_content,
      footer_text,
    })

    // Add variables to response
    const templateWithVariables = {
      ...template,
      variables: extractVariables(template.body_text),
    }

    return NextResponse.json(templateWithVariables)
  } catch (error) {
    console.error("Create template error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g)
  return matches ? matches.map((match) => match.slice(2, -2)) : []
}
