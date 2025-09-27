export interface ExternalOrderSystem {
  createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }>
  updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }>
  getOrderStatus(orderId: string): Promise<{ success: boolean; status?: string; error?: string }>
  cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }>
}

// Stub implementation for future integration
export class OrderSystemStub implements ExternalOrderSystem {
  private baseUrl: string
  private apiKey: string

  constructor(
    baseUrl: string = process.env.ORDER_SYSTEM_URL || "",
    apiKey: string = process.env.ORDER_SYSTEM_API_KEY || "",
  ) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async createOrder(orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // TODO: Replace with actual API call to external order system
      console.log("[ORDER_SYSTEM_STUB] Creating order:", orderData)

      // Simulate API call
      const response = await this.simulateApiCall("POST", "/orders", orderData)

      if (response.success) {
        return {
          success: true,
          orderId: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }
      }

      return { success: false, error: "Failed to create order in external system" }
    } catch (error) {
      console.error("Order creation failed:", error)
      return { success: false, error: "Network error" }
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Replace with actual API call
      console.log("[ORDER_SYSTEM_STUB] Updating order status:", { orderId, status })

      const response = await this.simulateApiCall("PATCH", `/orders/${orderId}`, { status })

      if (response.success) {
        return { success: true }
      }

      return { success: false, error: "Failed to update order status" }
    } catch (error) {
      console.error("Order status update failed:", error)
      return { success: false, error: "Network error" }
    }
  }

  async getOrderStatus(orderId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      // TODO: Replace with actual API call
      console.log("[ORDER_SYSTEM_STUB] Getting order status:", orderId)

      const response = await this.simulateApiCall("GET", `/orders/${orderId}`)

      if (response.success) {
        return { success: true, status: "confirmed" }
      }

      return { success: false, error: "Order not found" }
    } catch (error) {
      console.error("Get order status failed:", error)
      return { success: false, error: "Network error" }
    }
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Replace with actual API call
      console.log("[ORDER_SYSTEM_STUB] Cancelling order:", orderId)

      const response = await this.simulateApiCall("DELETE", `/orders/${orderId}`)

      if (response.success) {
        return { success: true }
      }

      return { success: false, error: "Failed to cancel order" }
    } catch (error) {
      console.error("Order cancellation failed:", error)
      return { success: false, error: "Network error" }
    }
  }

  private async simulateApiCall(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<{ success: boolean; data?: any }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

    // Simulate 95% success rate
    const success = Math.random() > 0.05

    return {
      success,
      data: success ? { id: `sim_${Date.now()}`, ...data } : null,
    }
  }
}

// Export singleton instance
export const orderSystem = new OrderSystemStub()

// Integration helper functions
export async function syncOrderWithExternalSystem(order: any) {
  try {
    const result = await orderSystem.createOrder({
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.delivery_address,
      },
      items: order.items,
      total: order.total_amount,
      currency: order.currency || "USD",
    })

    if (result.success && result.orderId) {
      // Update local order with external ID
      console.log(`Order synced with external system: ${result.orderId}`)
      return result.orderId
    }

    throw new Error(result.error || "Unknown error")
  } catch (error) {
    console.error("Failed to sync order with external system:", error)
    throw error
  }
}

export async function updateExternalOrderStatus(externalOrderId: string, status: string) {
  try {
    const result = await orderSystem.updateOrderStatus(externalOrderId, status)

    if (!result.success) {
      throw new Error(result.error || "Failed to update external order")
    }

    return true
  } catch (error) {
    console.error("Failed to update external order status:", error)
    throw error
  }
}
