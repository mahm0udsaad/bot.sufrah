import prisma from "./prisma"

// Keep compatibility with existing raw SQL usage
export const sql = prisma.$queryRaw.bind(prisma)

export const db = {
  sql,

  // Users
  async getUserByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone } })
  },

  async createUserWithRestaurant(data: {
    phone: string
    verification_code?: string
    verification_expires_at?: Date
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: data.phone,
          name: "Restaurant Owner",
          verification_code: data.verification_code ?? null,
          verification_expires_at: data.verification_expires_at ?? null,
        },
      })

      await tx.restaurant.create({
        data: {
          userId: user.id,
          name: "My Restaurant",
          description: "A new restaurant ready to serve customers",
          phone: data.phone,
          whatsappNumber: data.phone,
          address: "123 Main Street",
          isActive: true,
        },
      })

      return user
    })
  },

  async createUser(data: {
    phone: string
    name?: string
    email?: string
    verification_code?: string
    verification_expires_at?: Date
  }) {
    return prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name ?? null,
        email: data.email ?? null,
        verification_code: data.verification_code ?? null,
        verification_expires_at: data.verification_expires_at ?? null,
      },
    })
  },

  async updateUser(
    id: string,
    data: Partial<{
      name: string
      email: string
      is_verified: boolean
      verification_code: string | null
      verification_expires_at: Date | null
    }>,
  ) {
    return prisma.user.update({
      where: { id },
      data,
    })
  },

  // Restaurants
  async getPrimaryRestaurantByUserId(userId: string) {
    return prisma.restaurant.findFirst({ where: { userId } })
  },

  async getRestaurantById(restaurantId: string) {
    return prisma.restaurant.findUnique({ where: { id: restaurantId } })
  },

  async updateRestaurant(
    restaurantId: string,
    data: Partial<{
      name: string
      description: string
      phone: string
      whatsappNumber: string | null
      address: string
      isActive: boolean
      externalMerchantId: string | null
    }>,
  ) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    })
  },

  // Conversations
  async listConversations(restaurantId: string, take = 50, cursorId?: string) {
    return prisma.conversation.findMany({
      where: { restaurantId },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
    })
  },

  async getConversation(restaurantId: string, conversationId: string) {
    return prisma.conversation.findFirst({ where: { id: conversationId, restaurantId } })
  },

  async createConversation(data: {
    restaurantId: string
    customerWa: string
    lastMessageAt?: Date
    status?: "OPEN" | "CLOSED"
  }) {
    return prisma.conversation.create({
      data: {
        restaurantId: data.restaurantId,
        customerWa: data.customerWa,
        lastMessageAt: data.lastMessageAt ?? new Date(),
        status: data.status ?? "OPEN",
      },
    })
  },

  async touchConversation(conversationId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })
  },

  async closeConversation(conversationId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "CLOSED" },
    })
  },

  // Messages
  async listMessages(restaurantId: string, conversationId: string, take = 100) {
    return prisma.message.findMany({
      where: { restaurantId, conversationId },
      orderBy: { createdAt: "asc" },
      take,
    })
  },

  async createMessage(data: {
    restaurantId: string
    conversationId: string
    direction: "IN" | "OUT"
    body: string
    waSid?: string
    mediaUrl?: string
  }) {
    const message = await prisma.message.create({
      data: {
        restaurantId: data.restaurantId,
        conversationId: data.conversationId,
        direction: data.direction,
        body: data.body,
        waSid: data.waSid ?? null,
        mediaUrl: data.mediaUrl ?? null,
      },
    })

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: new Date() },
    })

    return message
  },

  // Orders
  async listOrders(restaurantId: string, take = 50) {
    return prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        items: true,
      },
    })
  },

  async getOrder(restaurantId: string, orderId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true },
    })
  },

  async createOrder(data: {
    restaurantId: string
    conversationId?: string | null
    status?: OrderStatus
    totalCents?: number
    currency?: string
    meta?: Record<string, unknown>
    items?: Array<{ name: string; qty: number; unitCents: number; totalCents: number }>
  }) {
    return prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        conversationId: data.conversationId ?? null,
        status: data.status ?? "DRAFT",
        totalCents: data.totalCents ?? 0,
        currency: data.currency ?? "SAR",
        meta: data.meta ?? null,
        items: data.items
          ? {
              create: data.items.map((item) => ({
                name: item.name,
                qty: item.qty,
                unitCents: item.unitCents,
                totalCents: item.totalCents,
              })),
            }
          : undefined,
      },
      include: { items: true },
    })
  },

  async updateOrder(
    restaurantId: string,
    orderId: string,
    data: Partial<{
      status: OrderStatus
      totalCents: number
      currency: string
      meta: Record<string, unknown> | null
    }>,
  ) {
    return prisma.order.update({
      where: { id: orderId, restaurantId },
      data,
      include: { items: true },
    })
  },

  // Usage tracking
  async logUsage(restaurantId: string, actionType: string, metadata?: Record<string, unknown>) {
    return prisma.usageLog.create({
      data: {
        restaurantId,
        action: actionType,
        details: metadata ?? {},
      },
    })
  },
}

export type OrderStatus = "DRAFT" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
