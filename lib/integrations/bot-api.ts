const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || process.env.BOT_API_URL || "https://bot.sufrah.sa/api"
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || ""

const API_CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

function getCachedData(key: string) {
  const cached = API_CACHE.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any) {
  API_CACHE.set(key, { data, timestamp: Date.now() })
}

/**
 * Generate authentication headers for database-backed API calls
 * Uses Bearer token and restaurant ID for multi-tenancy
 */
function getAuthHeaders(restaurantId?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  }

  // Use Bearer token authentication as per new spec
  if (BOT_API_TOKEN) {
    headers["Authorization"] = `Bearer ${BOT_API_TOKEN}`
  }

  // Add restaurant ID for multi-tenancy support
  if (restaurantId) {
    headers["X-Restaurant-Id"] = restaurantId
  }

  return headers
}

export interface BotMessage {
  id: string
  conversation_id: string
  from_phone: string
  to_phone: string
  message_type: "text" | "image" | "document" | "audio"
  content: string
  media_url?: string
  timestamp: string
  is_from_customer: boolean
}

export interface BotConversation {
  id: string
  customer_phone: string
  customer_name?: string
  status: "active" | "closed"
  last_message_at: string
  unread_count: number
  is_bot_active: boolean
}

/**
 * Fetch conversations from DATABASE (not in-memory cache)
 * This ensures data persists across server restarts
 */
export async function fetchBotConversations(restaurantId?: string): Promise<BotConversation[]> {
  const cacheKey = `conversations-${restaurantId || "default"}`
  const cached = getCachedData(cacheKey)
  if (cached) {
    console.log("[bot-api] Using cached conversations data")
    return cached
  }

  try {
    // ✅ USE DATABASE-BACKED API: /api/db/conversations
    const params = new URLSearchParams({
      status: "active",
      limit: "50",
    })

    const response = await fetch(`${BOT_API_URL}/db/conversations?${params}`, {
      headers: getAuthHeaders(restaurantId),
    })

    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Normalize database response to match expected format
    const normalized = (Array.isArray(data) ? data : []).map((conv: any) => ({
      id: conv.id,
      customer_phone: conv.customerPhone || conv.customer_phone || conv.customerWa,
      customer_name: conv.customerName || conv.customer_name,
      status: conv.status || "active",
      last_message_at: conv.lastMessageAt || conv.last_message_at || new Date().toISOString(),
      unread_count: conv.unreadCount ?? conv.unread_count ?? 0,
      is_bot_active: conv.isBotActive ?? conv.is_bot_active ?? true,
    }))
    
    setCachedData(cacheKey, normalized)
    return normalized
  } catch (error: any) {
    console.error("[bot-api] Failed to fetch conversations from database:", error.message)
    // Return empty array instead of fallback data to avoid confusion
    return cached || []
  }
}

/**
 * Fetch messages from DATABASE (not in-memory cache)
 * This ensures message history persists across server restarts
 */
export async function fetchBotMessages(conversationId: string, restaurantId?: string): Promise<BotMessage[]> {
  const cacheKey = `messages-${conversationId}`
  const cached = getCachedData(cacheKey)
  if (cached) {
    console.log(`[bot-api] Using cached messages data for ${conversationId}`)
    return cached
  }

  try {
    // ✅ USE DATABASE-BACKED API: /api/db/conversations/:id/messages
    const params = new URLSearchParams({ limit: "100" })
    
    const response = await fetch(
      `${BOT_API_URL}/db/conversations/${encodeURIComponent(conversationId)}/messages?${params}`,
      { headers: getAuthHeaders(restaurantId) }
    )

    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Normalize database response to match expected format
    const normalized = (Array.isArray(data) ? data : []).map((msg: any) => ({
      id: msg.id,
      conversation_id: msg.conversationId || msg.conversation_id || conversationId,
      from_phone: msg.fromPhone || msg.from_phone || "",
      to_phone: msg.toPhone || msg.to_phone || "",
      message_type: msg.messageType || msg.message_type || "text",
      content: msg.content || msg.body || "",
      media_url: msg.mediaUrl || msg.media_url,
      timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
      is_from_customer: msg.direction === "IN" || msg.is_from_customer,
    }))
    
    setCachedData(cacheKey, normalized)
    return normalized
  } catch (error: any) {
    console.error(`[bot-api] Failed to fetch messages from database for ${conversationId}:`, error.message)
    // Return empty array instead of fallback data
    return cached || []
  }
}

export async function sendBotMessage(conversationId: string, message: string, restaurantId?: string): Promise<boolean> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/conversations/${conversationId}/send`, {
      method: "POST",
      headers: getAuthHeaders(restaurantId),
      body: JSON.stringify({ message }),
    })

    return response.ok
  } catch (error) {
    console.error("Failed to send bot message:", error)
    return false
  }
}

export async function sendBotMedia(
  conversationId: string,
  mediaUrl: string,
  caption?: string,
  restaurantId?: string
): Promise<boolean> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/conversations/${conversationId}/send-media`, {
      method: "POST",
      headers: getAuthHeaders(restaurantId),
      body: JSON.stringify({ mediaUrl, caption }),
    })

    return response.ok
  } catch (error) {
    console.error("Failed to send bot media:", error)
    return false
  }
}

export async function toggleBotStatus(enabled: boolean, restaurantId?: string): Promise<boolean> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/bot/toggle`, {
      method: "POST",
      headers: getAuthHeaders(restaurantId),
      body: JSON.stringify({ enabled }),
    })

    return response.ok
  } catch (error) {
    console.error("Failed to toggle bot status:", error)
    return false
  }
}

export async function toggleConversationBot(
  conversationId: string,
  enabled: boolean,
  restaurantId?: string
): Promise<boolean> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/conversations/${conversationId}/toggle-bot`, {
      method: "POST",
      headers: getAuthHeaders(restaurantId),
      body: JSON.stringify({ enabled }),
    })

    return response.ok
  } catch (error) {
    console.error("Failed to toggle conversation bot:", error)
    return false
  }
}

export class BotWebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private lastMessageHashes = new Map<string, string>()
  private messageBuffer = new Map<string, NodeJS.Timeout>()
  private globalMessageCount = 0
  private globalMessageWindow = Date.now()
  private readonly MAX_MESSAGES_PER_WINDOW = 5
  private readonly WINDOW_DURATION = 5000 // 5 seconds

  constructor(
    private onConversationUpdate: (conversation: BotConversation) => void,
    private onMessageUpdate: (message: BotMessage) => void,
    private onBotStatusUpdate: (status: { enabled: boolean }) => void,
  ) {}

  private createMessageHash(type: string, data: any): string {
    return `${type}:${JSON.stringify(data)}`
  }

  private isRateLimited(): boolean {
    const now = Date.now()

    // Reset window if enough time has passed
    if (now - this.globalMessageWindow > this.WINDOW_DURATION) {
      this.globalMessageCount = 0
      this.globalMessageWindow = now
    }

    // Check if we've exceeded the rate limit
    if (this.globalMessageCount >= this.MAX_MESSAGES_PER_WINDOW) {
      console.log(`[v0] Rate limiting WebSocket messages - ignoring spam`)
      return true
    }

    return false
  }

  private processMessage(type: string, data: any) {
    if (this.isRateLimited()) {
      return
    }

    const hash = this.createMessageHash(type, data)
    const key = `${type}:${data.id || "status"}`

    // Check if this exact message was already processed
    if (this.lastMessageHashes.get(key) === hash) {
      console.log(`[v0] Ignoring duplicate ${type} message`)
      return
    }

    // Clear existing timeout for this key
    const existingTimeout = this.messageBuffer.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    this.messageBuffer.set(
      key,
      setTimeout(() => {
        this.lastMessageHashes.set(key, hash)
        this.messageBuffer.delete(key)
        this.globalMessageCount++

        switch (type) {
          case "conversation.updated":
          case "conversation_update":
            console.log(`[v0] Processing conversation update:`, data)
            this.onConversationUpdate(data)
            break
          case "message.created":
          case "message.updated":
          case "message_update":
            console.log(`[v0] Processing message update:`, data)
            this.onMessageUpdate(data)
            break
          case "bot.status.updated":
          case "bot_status_update":
            console.log(`[v0] Processing bot status update:`, data)
            this.onBotStatusUpdate(data)
            break
        }
      }, 2000),
    ) // 2 second debounce to handle aggressive bot spam
  }

  connect() {
    try {
      const wsUrl = BOT_API_URL.replace("https://", "wss://").replace("http://", "ws://")
      this.ws = new WebSocket(`${wsUrl}/ws?token=${BOT_API_TOKEN}`)

      this.ws.onopen = () => {
        console.log("[v0] WebSocket connected to bot API")
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          if (event.data === "pong") {
            console.log("[v0] Bot WebSocket pong received")
            return
          }

          const data = JSON.parse(event.data)
          console.log("[v0] Bot WebSocket message:", data)

          if (data.type && data.data) {
            this.processMessage(data.type, data.data)
          } else {
            // Handle legacy format
            this.processMessage(data.type, data.conversation || data.message || data.status)
          }
        } catch (error) {
          console.error("[v0] Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = () => {
        console.log("[v0] WebSocket disconnected")
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error("[v0] WebSocket error:", error)
      }
    } catch (error) {
      console.error("[v0] Failed to connect WebSocket:", error)
      this.reconnect()
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`[v0] Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  disconnect() {
    this.messageBuffer.forEach((timeout) => clearTimeout(timeout))
    this.messageBuffer.clear()
    this.lastMessageHashes.clear()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
