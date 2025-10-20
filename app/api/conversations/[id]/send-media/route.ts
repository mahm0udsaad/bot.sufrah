import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const PAT = process.env.DASHBOARD_PAT || process.env.BOT_API_TOKEN
const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""
const BOT_API_KEY = process.env.BOT_API_KEY || ""

function extractToken(headerValue: string | null): string | null {
  if (!headerValue) return null
  const trimmed = headerValue.trim()
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim()
  }
  if (trimmed.toLowerCase().startsWith("apitoken ")) {
    return trimmed.slice(9).trim()
  }
  return trimmed
}

async function resolveRestaurantId(request: NextRequest): Promise<string | null> {
  // 1) Try Personal Access Token from headers
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("X-API-Key")
    const provided = extractToken(authHeader) || extractToken(apiKeyHeader)

    if (provided && PAT && provided === PAT) {
      const rid = request.headers.get("x-restaurant-id") || request.headers.get("X-Restaurant-Id")
      if (rid && rid.trim().length > 0) {
        return rid.trim()
      }
      return null
    }
  } catch {
    // fall through
  }

  // 2) Fallback: existing cookie session via user phone -> primary restaurant
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value
    if (!userPhone) return null
    const user = await db.getUserByPhone(userPhone)
    if (!user) return null
    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)
    return restaurant?.id ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    const { id: conversationId } = await params

    if (!restaurantId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getRestaurantById(restaurantId)
    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    // IMPORTANT: Bot API expects customer phone number in E.164 format, not DB conversation ID
    // Try to fetch the conversation to get the customer phone
    let customerPhone: string = conversationId
    try {
      const conversation = await db.getConversation(restaurant.id, conversationId)
      // If conversation exists in DB, use the customer phone from it
      // customerWa is the WhatsApp phone number field in the database
      if (conversation && conversation.customerWa) {
        customerPhone = conversation.customerWa
        console.log(`[send-media] Resolved conversation ${conversationId} to phone: ${customerPhone}`)
      }
    } catch (error) {
      // If conversation not found in DB, assume conversationId is already a phone number
      console.log(`[send-media] Conversation not in local DB, using conversationId as phone: ${conversationId}`)
    }

    // Normalize to E.164 format with leading '+' (required by Bot API)
    customerPhone = customerPhone.startsWith('+')
      ? customerPhone
      : `+${customerPhone.replace(/^\+?/, '')}`
    
    console.log(`[send-media] Using normalized phone: ${customerPhone}`)

    const contentType = request.headers.get("content-type") || ""

    // Generate auth headers for bot API
    const botHeaders: HeadersInit = {}
    if (PAT && restaurantId) {
      botHeaders["Authorization"] = `Bearer ${PAT}`
      botHeaders["X-Restaurant-Id"] = restaurantId
    } else if (BOT_API_TOKEN) {
      botHeaders["Authorization"] = `ApiToken ${BOT_API_TOKEN}`
    } else if (BOT_API_KEY) {
      botHeaders["X-API-Key"] = BOT_API_KEY
    }

    // Forward to bot API using customer phone number (not DB conversation ID)
    const url = `${BOT_API_URL.replace(/\/$/, "")}/conversations/${encodeURIComponent(customerPhone)}/send-media`

    if (contentType.includes("application/json")) {
      const body = await request.json()
      const mediaUrl: string | undefined = body?.mediaUrl || body?.mediaUrls?.[0]
      const caption: string | undefined = body?.caption
      const mediaType: string | undefined = body?.mediaType

      if (!mediaUrl) {
        return NextResponse.json({ success: false, message: "mediaUrl or mediaUrls is required" }, { status: 400 })
      }

      console.log(`[send-media] Attempting to send media to Bot API:`, {
        url,
        conversationId_DB: conversationId,
        customerPhone,
        mediaUrl,
        caption,
        mediaType,
        restaurantId
      })

      let res = await fetch(url, {
        method: "POST",
        headers: {
          ...botHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaUrl, caption, mediaType }),
      })

      console.log(`[send-media] Bot API /send-media response:`, {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      })

      // DO NOT fall back to /send - it's text-only and will return "Message is required"
      // If /send-media fails, it's either:
      // 1. Endpoint doesn't exist (404) - Bot API needs to be updated
      // 2. Wrong parameters (400) - Check phone format, restaurant ID, etc.
      // 3. Restaurant not found (404) - Wrong restaurant ID or not configured in Bot API

      if (!res.ok) {
        const text = await res.text()
        console.error(`[send-media] Bot API error (${res.status}):`, text)
        
        // Provide helpful error messages based on status
        let userMessage = "فشل إرسال الملف"
        let debugInfo: any = { status: res.status, error: text }
        
        if (res.status === 404) {
          userMessage = "خدمة إرسال الوسائط غير متوفرة في Bot API"
          debugInfo.hint = "Bot API may not have /send-media endpoint deployed. Check BOT_API_URL and API version."
        } else if (text.includes("Restaurant context not found")) {
          userMessage = "المطعم غير موجود في Bot API"
          debugInfo.hint = "The X-Restaurant-Id may not exist in Bot API's database, or restaurant lacks WhatsApp configuration."
          debugInfo.restaurantId = restaurantId
          debugInfo.phone = customerPhone
        }
        
        // Return 202 for 404/422 (per spec)
        if (res.status === 404 || res.status === 422) {
          return NextResponse.json({ 
            message: null,
            error: userMessage,
            debug: process.env.NODE_ENV === "development" ? debugInfo : undefined
          }, { status: 202 })
        }
        
        return NextResponse.json({ 
          success: false, 
          message: userMessage,
          debug: process.env.NODE_ENV === "development" ? debugInfo : undefined
        }, { status: res.status })
      }

      const payload = await res.json().catch(() => ({}))
      // Return spec-compliant response: { message: Message }
      return NextResponse.json({ message: payload.message || payload.data || null })
    }

    // Multipart form-data path - only accept mediaUrl, not direct file uploads
    const form = await request.formData()
    const file = form.get("file") as File | null
    
    // Reject direct file uploads as per API specification
    if (file) {
      return NextResponse.json({ 
        success: false, 
        message: "Direct file uploads not supported. Upload file to storage first and provide mediaUrl.",
        error: "Use POST /api/upload to upload the file, then send the returned URL via mediaUrl field."
      }, { status: 422 })
    }
    
    const mediaUrl = form.get("mediaUrl") as string | null
    const caption = form.get("caption") as string | null
    const mediaType = form.get("mediaType") as string | null

    if (!mediaUrl) {
      return NextResponse.json({ 
        success: false, 
        message: "mediaUrl is required in form-data" 
      }, { status: 400 })
    }

    let res = await fetch(url, {
      method: "POST",
      headers: {
        ...botHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mediaUrl, caption, mediaType }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[send-media] Bot API error (${res.status}):`, text)
      
      let userMessage = "فشل إرسال الملف"
      if (res.status === 404) {
        userMessage = "خدمة إرسال الوسائط غير متوفرة في Bot API"
      } else if (text.includes("Restaurant context not found")) {
        userMessage = "المطعم غير موجود في Bot API"
      }
      
      // Return 202 for 404/422 (per spec)
      if (res.status === 404 || res.status === 422) {
        return NextResponse.json({ 
          message: null,
          error: userMessage,
          debug: process.env.NODE_ENV === "development" ? text : undefined
        }, { status: 202 })
      }
      
      return NextResponse.json({ 
        success: false, 
        message: userMessage,
        debug: process.env.NODE_ENV === "development" ? text : undefined
      }, { status: res.status })
    }

    const payload = await res.json().catch(() => ({}))
    // Return spec-compliant response: { message: Message }
    return NextResponse.json({ message: payload.message || payload.data || null })
  } catch (error) {
    console.error("send-media API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}


