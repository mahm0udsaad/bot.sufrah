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

interface PaymentLinkRequest {
  orderId: string
  amount: number
  currency?: string
  customerPhone?: string
  customerName?: string
  description?: string
}

// This is a mock implementation - replace with actual Paymob API integration
async function createPaymobPaymentLink(orderData: PaymentLinkRequest): Promise<string> {
  try {
    // In a real implementation, you would:
    // 1. Get auth token from Paymob
    // 2. Create order in Paymob
    // 3. Create payment key
    // 4. Generate iframe URL
    
    const paymobApiKey = process.env.PAYMOB_API_KEY
    const paymobIntegrationId = process.env.PAYMOB_INTEGRATION_ID
    
    if (!paymobApiKey || !paymobIntegrationId) {
      throw new Error("Paymob configuration missing")
    }

    // Mock implementation - replace with actual Paymob API calls
    const mockPaymentUrl = `https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=mock_token_${Date.now()}`
    
    // Log for demonstration
    console.log("Creating payment link for order:", orderData)
    
    return mockPaymentUrl
  } catch (error) {
    console.error("Failed to create Paymob payment link:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request)

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(userId)

    if (!restaurant) {
      return NextResponse.json({ success: false, message: "Restaurant not found" }, { status: 404 })
    }

    const { orderId, amount, currency = "EGP", customerPhone, customerName, description } = await request.json() as PaymentLinkRequest

    if (!orderId || !amount) {
      return NextResponse.json({ success: false, message: "orderId and amount are required" }, { status: 400 })
    }

    // Find the order
    const order = await db.prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: restaurant.id,
      },
      include: {
        items: true
      }
    })

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
    }

    // Create payment link
    const paymentLink = await createPaymobPaymentLink({
      orderId,
      amount,
      currency,
      customerPhone,
      customerName,
      description: description || `Payment for order ${orderId.slice(0, 8)}`
    })

    // Update order with payment link
    const updatedMeta = {
      ...(order.meta as object || {}),
      payment_link: paymentLink,
      payment_link_created_at: new Date().toISOString(),
      payment_status: "PENDING"
    }

    await db.prisma.order.update({
      where: { id: orderId },
      data: {
        meta: updatedMeta,
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({ 
      success: true, 
      payment_link: paymentLink,
      order_id: orderId
    })
  } catch (error) {
    console.error("Payment link API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}