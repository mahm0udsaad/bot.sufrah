interface Conversation {
  id: string
  customer_phone: string
  customer_name: string
  status: "active" | "closed"
  last_message_at: string
  unread_count: number
  is_bot_active: boolean
}

interface Message {
  id: string
  conversation_id: string
  from_phone: string
  to_phone: string
  message_type: "text" | "image" | "document" | "audio"
  content: string
  media_url: string | null
  timestamp: string
  is_from_customer: boolean
}

interface BotStatus {
  enabled: boolean
}

class BotApiClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor() {
    this.baseUrl = "https://bot.sufrah.sa"
    this.headers = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    }
  }

  async fetchConversations(): Promise<Conversation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations`, {
        headers: this.headers,
      })

      if (!response.ok) {
        console.warn("[v0] Bot API unavailable, using fallback data")
        return this.getFallbackConversations()
      }

      return await response.json()
    } catch (error) {
      console.warn("[v0] Bot API error, using fallback:", error)
      return this.getFallbackConversations()
    }
  }

  async fetchMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}/messages`, {
        headers: this.headers,
      })

      if (!response.ok) {
        console.warn("[v0] Bot API unavailable, using fallback messages")
        return this.getFallbackMessages(conversationId)
      }

      return await response.json()
    } catch (error) {
      console.warn("[v0] Bot API error, using fallback:", error)
      return this.getFallbackMessages(conversationId)
    }
  }

  async sendMessage(conversationId: string, message: string): Promise<Message> {
    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}/send`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const result = await response.json()
      return result.message
    } catch (error) {
      console.error("[v0] Failed to send message:", error)
      throw error
    }
  }

  async toggleBot(enabled: boolean): Promise<BotStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/toggle`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to toggle bot")
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] Failed to toggle bot:", error)
      throw error
    }
  }
  
  connectWebSocket(): WebSocket | null {
    try {
      const ws = new WebSocket(`wss://bot.sufrah.sa/ws`)

      ws.onopen = () => {
        console.log("[v0] WebSocket connected to bot server")
      } 

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("[v0] WebSocket message:", data)
        } catch (error) {
          console.log("[v0] WebSocket ping/pong:", event.data)
        }
      }

      ws.onerror = (error) => {
        console.error("[v0] WebSocket error:", error)
      }

      ws.onclose = () => {
        console.log("[v0] WebSocket disconnected")
      }

      return ws
    } catch (error) {
      console.error("[v0] Failed to connect WebSocket:", error)
      return null
    }
  }

  // Fallback data for when bot API is unavailable
  private getFallbackConversations(): Conversation[] {
    return [
      {
        id: "conv-1",
        customer_phone: "+201234567890",
        customer_name: "Ahmed Hassan",
        status: "active",
        last_message_at: new Date().toISOString(),
        unread_count: 2,
        is_bot_active: true,
      },
      {
        id: "conv-2",
        customer_phone: "+201987654321",
        customer_name: "Sara Mohamed",
        status: "active",
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 0,
        is_bot_active: true,
      },
    ]
  }

  private getFallbackMessages(conversationId: string): Message[] {
    return [
      {
        id: "msg-1",
        conversation_id: conversationId,
        from_phone: "+201234567890",
        to_phone: "+201111111111",
        message_type: "text",
        content: "Hello! I would like to order some food",
        media_url: null,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        is_from_customer: true,
      },
      {
        id: "msg-2",
        conversation_id: conversationId,
        from_phone: "+201111111111",
        to_phone: "+201234567890",
        message_type: "text",
        content: "Welcome to Sufrah Restaurant! 🍽️ What would you like to order today?",
        media_url: null,
        timestamp: new Date(Date.now() - 1700000).toISOString(),
        is_from_customer: false,
      },
    ]
  }
}

export const botApi = new BotApiClient()
export type { Conversation, Message, BotStatus }
