import { NextRequest, NextResponse } from "next/server"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""

/**
 * POST /api/admin/verify-password
 * Verify admin password for accessing admin panel
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور مطلوبة - Password required" },
        { status: 400 }
      )
    }

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة - Incorrect password" },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error("[admin/verify-password] Error:", error)
    return NextResponse.json(
      { success: false, error: "خطأ في الخادم - Server error" },
      { status: 500 }
    )
  }
}
