import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"

// Paymob webhook types
interface PaymobWebhookData {
  type: string
  obj: {
    id: number
    pending: boolean
    amount_cents: number
    success: boolean
    is_auth: boolean
    is_capture: boolean
    is_standalone_payment: boolean
    is_voided: boolean
    is_refunded: boolean
    order: {
      id: number
      created_at: string
      delivery_needed: boolean
      merchant: {
        id: number
        created_at: string
        phones: string[]
        company_emails: string[]
        company_name: string
        state: string
        country: string
        city: string
        postal_code: string
        street: string
      }
      collector: any
      amount_cents: number
      shipping_data: any
      currency: string
      is_payment_locked: boolean
      is_return: boolean
      is_cancel: boolean
      is_returned: boolean
      is_canceled: boolean
      merchant_order_id: string | null
      wallet_notification: any
      paid_amount_cents: number
      notify_user_with_email: boolean
      items: Array<{
        name: string
        description: string
        amount_cents: number
        quantity: number
      }>
      url: string
      payment_method: string
    }
    created_at: string
    transaction_id: string | null
    currency: string
    source_data: any
    api_source: string
    terminal_id: any
    merchant_commission: number
    installment: any
    discount_details: any[]
    is_3d_secure: boolean
    integration_id: number
    profile_id: number
    is_live: boolean
    other_endpoint_reference: any
    refunded_amount_cents: number
    source_id: number
    currency_symbol: string
    hmac: string
  }
}

function verifyPaymobHmac(data: any, hmac: string): boolean {
  try {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET
    if (!hmacSecret) {
      console.warn("PAYMOB_HMAC_SECRET not configured")
      return true // Skip verification if secret not configured
    }

    // Create the string to hash according to Paymob documentation
    const {
      amount_cents,
      created_at,
      currency,
      error_occured,
      has_parent_transaction,
      id,
      integration_id,
      is_3d_secure,
      is_auth,
      is_capture,
      is_refunded,
      is_standalone_payment,
      is_voided,
      order,
      owner,
      pending,
      source_data_pan,
      source_data_sub_type,
      source_data_type,
      success
    } = data.obj

    const concatenatedString = [
      amount_cents,
      created_at,
      currency,
      error_occured,
      has_parent_transaction,
      id,
      integration_id,
      is_3d_secure,
      is_auth,
      is_capture,
      is_refunded,
      is_standalone_payment,
      is_voided,
      order?.id,
      owner,
      pending,
      source_data_pan,
      source_data_sub_type,
      source_data_type,
      success
    ].join('')

    const calculatedHmac = crypto
      .createHmac('sha512', hmacSecret)
      .update(concatenatedString)
      .digest('hex')

    return calculatedHmac === hmac
  } catch (error) {
    console.error("HMAC verification error:", error)
    return false
  }
}

async function updateOrderPaymentStatus(orderId: string, paymentData: any) {
  try {
    const { obj } = paymentData

    let paymentStatus = "PENDING"
    if (obj.success && !obj.pending) {
      paymentStatus = "PAID"
    } else if (obj.is_voided || obj.is_refunded) {
      paymentStatus = "REFUNDED"
    } else if (!obj.success && !obj.pending) {
      paymentStatus = "FAILED"
    }

    const existingOrder = await db.prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      console.warn(`Order ${orderId} not found for payment update`)
      return false
    }

    const updatedMeta = {
      ...(existingOrder.meta as object || {}),
      payment_status: paymentStatus,
      payment_transaction_id: obj.transaction_id,
      payment_amount_cents: obj.amount_cents,
      payment_currency: obj.currency,
      payment_method: obj.order?.payment_method,
      payment_updated_at: new Date().toISOString(),
      paymob_transaction_id: obj.id,
    }

    await db.prisma.order.update({
      where: { id: orderId },
      data: {
        meta: updatedMeta,
        updatedAt: new Date(),
      }
    })

    console.log(`Order ${orderId} payment status updated to ${paymentStatus}`)
    return true
  } catch (error) {
    console.error("Failed to update order payment status:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const webhookData: PaymobWebhookData = await request.json()
    
    console.log("Received Paymob webhook:", {
      type: webhookData.type,
      transaction_id: webhookData.obj?.id,
      order_id: webhookData.obj?.order?.merchant_order_id,
      success: webhookData.obj?.success,
      pending: webhookData.obj?.pending
    })

    // Verify HMAC if secret is configured
    if (!verifyPaymobHmac(webhookData, webhookData.obj?.hmac)) {
      console.error("Invalid HMAC signature")
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 })
    }

    // Handle different webhook types
    if (webhookData.type === "TRANSACTION") {
      const merchantOrderId = webhookData.obj?.order?.merchant_order_id
      
      if (merchantOrderId) {
        const success = await updateOrderPaymentStatus(merchantOrderId, webhookData)
        
        if (success) {
          return NextResponse.json({ success: true, message: "Payment status updated" })
        } else {
          return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 })
        }
      } else {
        console.warn("No merchant_order_id in webhook data")
        return NextResponse.json({ success: false, message: "Missing order ID" }, { status: 400 })
      }
    }

    // For other webhook types, just acknowledge receipt
    return NextResponse.json({ success: true, message: "Webhook received" })
    
  } catch (error) {
    console.error("Paymob webhook error:", error)
    return NextResponse.json({ success: false, message: "Webhook processing failed" }, { status: 500 })
  }
}
