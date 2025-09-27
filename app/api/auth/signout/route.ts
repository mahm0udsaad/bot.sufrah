import { NextResponse } from "next/server"

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    })

    response.cookies.delete({
      name: "user-phone",
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Sign-out error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
