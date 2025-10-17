import prisma from "./prisma"
import { randomUUID } from "crypto"

// Keep compatibility with existing raw SQL usage
export const sql = prisma.$queryRaw.bind(prisma)

/**
 * Normalize phone number to digits-only format (no +, no whatsapp:)
 * Used to match phone numbers across different formats
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "").replace(/^\+/, "")
}

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
    return prisma.$transaction(async (tx: any) => {
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
    customerName?: string | null
    lastMessageAt?: Date
    status?: "active" | "closed"
  }) {
    return prisma.conversation.create({
      data: {
        restaurantId: data.restaurantId,
        customerWa: normalizePhone(data.customerWa),
        customerName: data.customerName ?? null,
        lastMessageAt: data.lastMessageAt ?? new Date(),
        status: data.status ?? "active",
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
      data: { status: "closed" },
    })
  },

  async updateConversation(
    conversationId: string,
    data: Partial<{
      status: "active" | "closed"
      isBotActive: boolean
      lastMessageAt: Date
      unreadCount: number
    }>,
  ) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data,
    })
  },

  /**
   * Find or create a conversation for a customer
   * @param restaurantId - Restaurant ID
   * @param customerPhoneRaw - Customer phone (will be normalized)
   * @param customerName - Optional customer name
   * @returns Existing or newly created conversation
   */
  async findOrCreateConversation(
    restaurantId: string,
    customerPhoneRaw: string,
    customerName?: string | null,
  ) {
    const customerWa = normalizePhone(customerPhoneRaw)
    
    const existing = await prisma.conversation.findUnique({
      where: { restaurantId_customerWa: { restaurantId, customerWa } },
    })

    if (existing) {
      return existing
    }

    return this.createConversation({
      restaurantId,
      customerWa,
      customerName,
      status: "active",
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

  /**
   * List messages by conversation ID with optional pagination
   * @param conversationId - Database conversation ID (cuid)
   * @param opts - Options including limit and before cursor for pagination
   * @returns Messages in ascending order by createdAt
   */
  async listMessagesByConversationId(
    conversationId: string,
    opts: { limit?: number; before?: Date } = {},
  ) {
    const limit = opts.limit ?? 100
    const where: any = { conversationId }
    if (opts.before) {
      where.createdAt = { lt: opts.before }
    }

    return prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    })
  },

  /**
   * Resolve conversation by restaurant + phone, then list messages
   * @param restaurantId - Restaurant ID for multi-tenancy
   * @param customerPhoneRaw - Customer phone (will be normalized)
   * @param opts - Options including limit and before cursor
   * @returns Messages in ascending order, or empty array if conversation not found
   */
  async listMessagesByRestaurantAndPhone(
    restaurantId: string,
    customerPhoneRaw: string,
    opts: { limit?: number; before?: Date } = {},
  ) {
    const customerWa = normalizePhone(customerPhoneRaw)
    const conv = await prisma.conversation.findUnique({
      where: { restaurantId_customerWa: { restaurantId, customerWa } },
      select: { id: true },
    })
    if (!conv) return []
    return this.listMessagesByConversationId(conv.id, opts)
  },

  /**
   * Pagination-friendly message retrieval (load older messages)
   * Fetches in descending order, then reverses for UI consumption
   * @param conversationId - Conversation ID
   * @param pageSize - Number of messages to fetch
   * @param before - Cursor date to fetch messages before
   * @returns Messages in ascending order (chronological)
   */
  async listMessagesPage(conversationId: string, pageSize = 50, before?: Date) {
    const rows = await prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
    })
    return rows.reverse()
  },

  /**
   * Get recent messages for a restaurant (timeline/feed view)
   * @param restaurantId - Restaurant ID
   * @param limit - Maximum number of messages to return
   * @returns Messages in descending order (newest first)
   */
  async getRecentMessages(restaurantId: string, limit = 50) {
    return prisma.message.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit,
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
        messageType: "text",
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
    orderReference?: string
    status?: OrderStatus
    orderType?: string
    paymentMethod?: string
    totalCents?: number
    currency?: string
    meta?: Record<string, unknown>
    items?: Array<{ name: string; qty: number; unitCents: number; totalCents: number }>
  }) {
    return prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        conversationId: data.conversationId ?? null,
        orderReference: data.orderReference ?? null,
        status: data.status ?? "DRAFT",
        orderType: data.orderType ?? null,
        paymentMethod: data.paymentMethod ?? null,
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
      orderReference: string
      status: OrderStatus
      orderType: string
      paymentMethod: string
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

  async getOrderByReference(restaurantId: string, orderReference: string) {
    return prisma.order.findFirst({
      where: { restaurantId, orderReference },
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

  // Files
  async createFile(data: {
    fileName: string
    mimeType: string
    fileSize: number
    url: string
    bucket?: string
    key?: string
    userId?: string
  }) {
    // If Files model exists, write to it; else, store in UsageLog as fallback
    try {
      // @ts-ignore - model may not exist yet until migration
      return await prisma.file.create({
        data: {
          fileName: data.fileName,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
          url: data.url,
          bucket: data.bucket ?? null,
          key: data.key ?? null,
          userId: data.userId ?? null,
        },
      })
    } catch (err) {
      console.warn("File model not available; skipping DB write for uploaded file", err)
      return null as unknown as any
    }
  },
}

export type OrderStatus = "DRAFT" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
