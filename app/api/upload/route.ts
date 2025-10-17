import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { uploadToMinio } from "@/lib/minio"
import { db } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function getUserId() {
  try {
    const cookieStore = await cookies()
    // Prefer existing session cookie used by /api/auth/me
    const userPhone = cookieStore.get("user-phone")?.value
    if (userPhone) {
      const user = await db.getUserByPhone(userPhone)
      return user?.id ?? null
    }

    // Fallback to JWT cookie if present
    const token = cookieStore.get("auth-token")?.value
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      return (payload.userId as string) ?? null
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""

    let buffer: Buffer
    let fileName: string
    let mimeType: string | undefined
    let fileSize: number

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file") as File | null
      if (!file) {
        return NextResponse.json({ success: false, message: "file is required" }, { status: 400 })
      }
      fileName = (form.get("fileName") as string) || file.name
      mimeType = file.type
      const arrayBuf = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuf)
      fileSize = buffer.length
    } else if (contentType.includes("application/json")) {
      const body = await request.json()
      const base64 = body?.base64 as string | undefined
      fileName = body?.fileName as string
      mimeType = body?.mimeType as string | undefined
      if (!base64 || !fileName) {
        return NextResponse.json({ success: false, message: "base64 and fileName are required" }, { status: 400 })
      }
      buffer = Buffer.from(base64, "base64")
      fileSize = buffer.length
    } else {
      return NextResponse.json({ success: false, message: "Unsupported content-type" }, { status: 415 })
    }

    const { url, key, bucket } = await uploadToMinio({
      originalName: fileName,
      contentType: mimeType,
      buffer,
      makePublic: true,
    })

    // Persist metadata
    await db.createFile?.({
      fileName,
      mimeType: mimeType ?? "application/octet-stream",
      fileSize,
      url,
      bucket,
      key,
      userId,
    })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Upload API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}


