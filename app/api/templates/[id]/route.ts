import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import prisma from "@/lib/prisma"

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserFromToken(request)
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Verify template belongs to user
    const template = await prisma.template.findFirst({ where: { id, user_id: userId } })

    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 })
    }

    // Delete template
    await prisma.template.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "Template deleted successfully" })
  } catch (error) {
    console.error("Delete template error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
