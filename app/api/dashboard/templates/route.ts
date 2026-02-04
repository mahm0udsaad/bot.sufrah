import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/server-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "50", 10)

    const templates = await prisma.template.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: limit,
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Dashboard templates API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { name, category, language, body_text, footer_text, variables } = await request.json()

    if (!name || !category || !body_text) {
      return NextResponse.json(
        { success: false, message: "Name, category, and body text are required" },
        { status: 400 }
      )
    }

    const template = await prisma.template.create({
      data: {
        user_id: user.id,
        name,
        category,
        language: language || "en",
        body_text,
        footer_text: footer_text || null,
        variables: variables || [],
        status: "draft",
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Create template error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
