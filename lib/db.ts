import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

export const sql = neon(process.env.DATABASE_URL)

// Database query helpers
export const db = {
  sql, // Export sql for direct queries

  // Users
  async getUserByPhone(phone: string) {
    const [user] = await sql`
      SELECT * FROM users WHERE phone = ${phone}
    `
    return user
  },

  async createUserWithRestaurant(data: {
    phone: string
    verification_code?: string
    verification_expires_at?: Date
  }) {
    // Create user first
    const [user] = await sql`
      INSERT INTO users (phone, name, verification_code, verification_expires_at)
      VALUES (${data.phone}, ${"Restaurant Owner"}, ${data.verification_code || null}, ${data.verification_expires_at || null})
      RETURNING *
    `

    // Create restaurant profile with only existing columns
    await sql`
      INSERT INTO restaurant_profiles (
        user_id, name, description, phone, whatsapp_number, address, is_active
      )
      VALUES (
        ${user.id}, 
        ${"My Restaurant"}, 
        ${"A new restaurant ready to serve customers"}, 
        ${data.phone}, 
        ${data.phone},
        ${"123 Main Street"}, 
        ${true}
      )
    `

    return user
  },

  async createUser(data: {
    phone: string
    name?: string
    email?: string
    verification_code?: string
    verification_expires_at?: Date
  }) {
    const [user] = await sql`
      INSERT INTO users (phone, name, email, verification_code, verification_expires_at)
      VALUES (${data.phone}, ${data.name || null}, ${data.email || null}, ${data.verification_code || null}, ${data.verification_expires_at || null})
      RETURNING *
    `
    return user
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
    const updates = Object.entries(data).filter(([_, value]) => value !== undefined)

    if (updates.length === 0) {
      throw new Error("No valid fields to update")
    }

    // Build SET clauses dynamically using tagged templates
    let setClause = ""
    const values: any[] = []

    updates.forEach(([key, value], index) => {
      if (index > 0) setClause += ", "
      setClause += `${key} = $${index + 1}`
      values.push(value)
    })

    values.push(id) // Add id as the last parameter

    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`

    const [user] = await sql.query(query, values)
    return user
  },

  // Conversations
  async getConversations(userId: string, limit = 50) {
    return await sql`
      SELECT c.*, 
             m.content as last_message,
             m.sent_at as last_message_at
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.user_id = ${userId}
      ORDER BY c.last_message_at DESC
      LIMIT ${limit}
    `
  },

  async getConversation(id: string) {
    const [conversation] = await sql`
      SELECT * FROM conversations WHERE id = ${id}
    `
    return conversation
  },

  async createConversation(data: {
    user_id: string
    customer_phone: string
    customer_name?: string
  }) {
    const [conversation] = await sql`
      INSERT INTO conversations (user_id, customer_phone, customer_name, window_expires_at)
      VALUES (${data.user_id}, ${data.customer_phone}, ${data.customer_name || null}, NOW() + INTERVAL '24 hours')
      RETURNING *
    `
    return conversation
  },

  // Messages
  async getMessages(conversationId: string, limit = 100) {
    return await sql`
      SELECT * FROM messages 
      WHERE conversation_id = ${conversationId}
      ORDER BY sent_at ASC
      LIMIT ${limit}
    `
  },

  async createMessage(data: {
    conversation_id: string
    sender_type: "customer" | "bot" | "agent"
    content: string
    message_type?: string
    template_id?: string
  }) {
    const [message] = await sql`
      INSERT INTO messages (conversation_id, sender_type, content, message_type, template_id)
      VALUES (${data.conversation_id}, ${data.sender_type}, ${data.content}, ${data.message_type || "text"}, ${data.template_id || null})
      RETURNING *
    `

    // Update conversation last_message_at
    await sql`
      UPDATE conversations 
      SET last_message_at = NOW()
      WHERE id = ${data.conversation_id}
    `

    return message
  },

  // Templates
  async getTemplates(userId: string) {
    return await sql`
      SELECT * FROM templates 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
  },

  async createTemplate(data: {
    user_id: string
    name: string
    category: string
    body_text: string
    header_type?: string
    header_content?: string
    footer_text?: string
  }) {
    const [template] = await sql`
      INSERT INTO templates (user_id, name, category, body_text, header_type, header_content, footer_text)
      VALUES (${data.user_id}, ${data.name}, ${data.category}, ${data.body_text}, ${data.header_type || null}, ${data.header_content || null}, ${data.footer_text || null})
      RETURNING *
    `
    return template
  },

  // Orders
  async getOrders(userId: string, limit = 50) {
    return await sql`
      SELECT o.*, c.customer_name
      FROM orders o
      LEFT JOIN conversations c ON c.id = o.conversation_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE u.id = ${userId} OR o.customer_phone IN (
        SELECT DISTINCT customer_phone FROM conversations WHERE user_id = ${userId}
      )
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `
  },

  async createOrder(data: {
    conversation_id?: string
    customer_phone: string
    customer_name?: string
    items: any[]
    total_amount: number
    delivery_address?: string
  }) {
    const [order] = await sql`
      INSERT INTO orders (conversation_id, customer_phone, customer_name, items, total_amount, delivery_address)
      VALUES (${data.conversation_id || null}, ${data.customer_phone}, ${data.customer_name || null}, ${JSON.stringify(data.items)}, ${data.total_amount}, ${data.delivery_address || null})
      RETURNING *
    `
    return order
  },

  // Analytics
  async getDashboardStats(userId: string) {
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM conversations WHERE user_id = ${userId} AND status = 'active') as active_conversations,
        (SELECT COUNT(*) FROM orders o LEFT JOIN conversations c ON c.id = o.conversation_id WHERE c.user_id = ${userId} AND o.created_at >= CURRENT_DATE) as todays_orders,
        (SELECT COUNT(*) FROM messages m LEFT JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ${userId} AND m.sent_at >= CURRENT_DATE) as messages_today,
        (SELECT COUNT(*) FROM templates WHERE user_id = ${userId} AND status = 'approved') as active_templates
    `
    return stats
  },

  // Usage tracking
  async logUsage(userId: string, actionType: string, resourceId?: string, metadata?: any) {
    // Get the restaurant_id for this user
    const restaurantProfile = await this.getRestaurantProfile(userId)
    const restaurantId = restaurantProfile?.id

    if (!restaurantId) {
      console.warn(`[v0] No restaurant profile found for user ${userId}, skipping usage log`)
      return
    }

    await sql`
      INSERT INTO usage_logs (restaurant_id, action, details)
      VALUES (${restaurantId}, ${actionType}, ${JSON.stringify({
        resource_id: resourceId,
        user_id: userId,
        ...metadata,
      })})
    `
  },

  async getRestaurantProfile(userId: string) {
    const [profile] = await sql`
      SELECT * FROM restaurant_profiles WHERE user_id = ${userId}
    `
    return profile
  },

  async updateRestaurantProfile(
    userId: string,
    data: Partial<{
      name: string
      description: string
      phone: string
      whatsapp_number: string
      address: string
      is_active: boolean
    }>,
  ) {
    const updates = Object.entries(data).filter(([_, value]) => value !== undefined)
    if (updates.length === 0) {
      throw new Error("No valid fields to update for restaurant profile")
    }

    let setClause = ""
    const values: any[] = []
    updates.forEach(([key, value], index) => {
      if (index > 0) setClause += ", "
      setClause += `${key} = $${index + 1}`
      values.push(value)
    })

    values.push(userId)
    const query = `UPDATE restaurant_profiles SET ${setClause}, updated_at = NOW() WHERE user_id = $${values.length} RETURNING *`
    const [profile] = await sql.query(query, values)
    return profile
  },
}
