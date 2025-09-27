interface Order {
  order_id: string
  conversation_id: string
  items: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  total: number
  currency: string
  payment_method: "online" | "cash"
  delivery_type: "delivery" | "pickup"
  delivery_address?: string
  branch?: {
    id: string
    name: string
  }
  status: "placed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled"
  payment_link?: string
  delivery_eta?: string
}

interface RestaurantProfile {
  id: string
  name: string
  address: string
  phone: string
  branches: Array<{
    id: string
    name: string
    address: string
  }>
  plan: string
}

interface PaymentLink {
  url: string
  expires_at: string
}

class OrderApiClient {
  // TODO: Replace with main Order System API
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    console.log("[v0] Creating order (stub):", orderData)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      order_id: `ORD-${Date.now()}`,
      conversation_id: orderData.conversation_id || "",
      items: orderData.items || [],
      total: orderData.total || 0,
      currency: "SAR",
      payment_method: orderData.payment_method || "cash",
      delivery_type: orderData.delivery_type || "delivery",
      delivery_address: orderData.delivery_address,
      branch: {
        id: "branch_central",
        name: "فرع المركز",
      },
      status: "placed",
      payment_link: orderData.payment_method === "online" ? "https://payment.example.com/pay/123" : undefined,
    }
  }

  // TODO: Replace with main Order System API
  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    console.log("[v0] Updating order (stub):", orderId, updates)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Return dummy updated order
    return {
      order_id: orderId,
      conversation_id: "conv-1",
      items: [
        { name: "Chicken Shawarma", quantity: 1, unit_price: 25 },
        { name: "French Fries", quantity: 1, unit_price: 15 },
      ],
      total: 40,
      currency: "SAR",
      payment_method: "cash",
      delivery_type: "delivery",
      status: updates.status || "preparing",
      delivery_eta: updates.delivery_eta,
      branch: {
        id: "branch_central",
        name: "فرع المركز",
      },
    }
  }

  // TODO: Replace with main Order System API
  async getOrder(orderId: string): Promise<Order | null> {
    console.log("[v0] Getting order (stub):", orderId)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Return dummy order data
    return {
      order_id: orderId,
      conversation_id: "conv-1",
      items: [
        { name: "Chicken Shawarma", quantity: 1, unit_price: 25 },
        { name: "French Fries", quantity: 1, unit_price: 15 },
      ],
      total: 40,
      currency: "SAR",
      payment_method: "cash",
      delivery_type: "delivery",
      status: "preparing",
      branch: {
        id: "branch_central",
        name: "فرع المركز",
      },
    }
  }

  // TODO: Replace with main Order System API
  async getRestaurantProfile(): Promise<RestaurantProfile> {
    console.log("[v0] Getting restaurant profile (stub)")

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return {
      id: "rest-1",
      name: "Sufrah Restaurant",
      address: "123 Main Street, Cairo, Egypt",
      phone: "+201111111111",
      branches: [
        {
          id: "branch_central",
          name: "فرع المركز",
          address: "123 Main Street, Cairo, Egypt",
        },
        {
          id: "branch_north",
          name: "فرع الشمال",
          address: "456 North Avenue, Cairo, Egypt",
        },
      ],
      plan: "premium",
    }
  }

  // TODO: Replace with main Order System API
  async createPaymentLink(orderId: string, amount: number): Promise<PaymentLink> {
    console.log("[v0] Creating payment link (stub):", orderId, amount)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      url: `https://payment.example.com/pay/${orderId}`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }
  }
}

export const orderApi = new OrderApiClient()
export type { Order, RestaurantProfile, PaymentLink }
