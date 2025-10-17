"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

const BOT_WS_URL = process.env.NEXT_PUBLIC_BOT_WS_URL || process.env.BOT_WS_URL || "wss://bot.sufrah.sa/ws"
const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || process.env.BOT_API_URL || "https://bot.sufrah.sa/api"

interface BotConversation {
  id: string
  customer_phone: string
  customer_name: string
  status: "active" | string
  last_message_at: string
  unread_count: number
  is_bot_active: boolean
}

interface BotMessage {
  id: string
  conversation_id: string
  from_phone: string
  to_phone: string
  message_type: "text" | "image" | "document" | "audio" | string
  content: string
  media_url: string | null
  timestamp: string
  is_from_customer: boolean
}

interface BotStatusData {
  enabled: boolean
}

interface WebSocketMessage {
  type:
    | "connection"
    | "conversation.bootstrap"
    | "message.created"
    | "conversation.updated"
    | "bot.status"
    | "order.created"
    | "order.updated"
  data: any
}

interface OrderItem {
  id: string
  name: string
  qty: number
  unitCents: number
  totalCents: number
}

interface OrderEventPayload {
  order: {
    id: string
    orderReference?: string | null
    status: string
    orderType?: string | null
    paymentMethod?: string | null
    totalCents: number
    currency: string
    createdAt: string
    items: OrderItem[]
  }
}

type ConversationHandler = (conversation: BotConversation) => void
type MessageHandler = (message: BotMessage) => void
type StatusHandler = (status: BotStatusData) => void
type BootstrapHandler = (conversations: BotConversation[]) => void
type OrderHandler = (payload: OrderEventPayload) => void

interface BotWebSocketContextValue {
  status: "idle" | "connecting" | "connected" | "error"
  error: string | null
  botEnabled: boolean
  conversations: BotConversation[]
  subscribeToBootstrap: (handler: BootstrapHandler) => () => void
  subscribeToMessages: (handler: MessageHandler) => () => void
  subscribeToConversationUpdates: (handler: ConversationHandler) => () => void
  subscribeToStatusUpdates: (handler: StatusHandler) => () => void
  subscribeToOrderEvents: (handler: OrderHandler) => () => void
  fetchConversations: () => Promise<BotConversation[]>
  fetchMessages: (conversationId: string) => Promise<BotMessage[]>
  sendMessage: (conversationId: string, message: string) => Promise<void>
  sendMedia: (conversationId: string, fileOrUrl: File | string, caption?: string) => Promise<void>
  toggleBot: (enabled: boolean) => Promise<void>
  reconnect: () => void
}

const BotWebSocketContext = createContext<BotWebSocketContextValue | null>(null)

export function BotWebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [botEnabled, setBotEnabled] = useState(false)
  const [conversations, setConversations] = useState<BotConversation[]>([])
  
  const socketRef = useRef<WebSocket | null>(null)
  const retryAttemptRef = useRef(0)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const bootstrapHandlers = useRef<Set<BootstrapHandler>>(new Set())
  const messageHandlers = useRef<Set<MessageHandler>>(new Set())
  const conversationHandlers = useRef<Set<ConversationHandler>>(new Set())
  const statusHandlers = useRef<Set<StatusHandler>>(new Set())
  const orderHandlers = useRef<Set<OrderHandler>>(new Set())

  const connect = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setStatus("connecting")
    setError(null)

    try {
      const ws = new WebSocket(BOT_WS_URL)
      socketRef.current = ws

      ws.onopen = () => {
        console.log("Bot WebSocket connected")
        retryAttemptRef.current = 0
        setStatus("connected")
        setError(null)

        // Start keepalive ping
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping")
          }
        }, 30000) // every 30 seconds
      }

      ws.onmessage = (event) => {
        if (event.data === "pong") {
          return
        }

        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case "connection":
              console.log("Bot connection established:", message.data)
              break
              
            case "conversation.bootstrap":
              // ⚠️ IGNORE BOOTSTRAP - It uses in-memory cache that clears on restart
              // We fetch from database instead via fetchConversations()
              console.log("Received conversation bootstrap (IGNORING - using database instead)")
              // Don't set conversations from bootstrap - we get them from database
              break
              
            case "message.created":
              // Normalize message payload to internal shape
              {
                const m: any = message.data
                const normalized: BotMessage = {
                  id: m.id,
                  conversation_id: m.conversation_id ?? m.conversationId,
                  from_phone: m.from_phone ?? m.fromPhone ?? "",
                  to_phone: m.to_phone ?? m.toPhone ?? "",
                  message_type: m.message_type ?? m.messageType ?? (m.media_url || m.mediaUrl ? "document" : "text"),
                  content: m.content ?? m.body ?? "",
                  media_url: m.media_url ?? m.mediaUrl ?? null,
                  timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
                  is_from_customer: typeof m.is_from_customer === "boolean" ? m.is_from_customer : (m.direction ?? "OUT") === "IN",
                }
                messageHandlers.current.forEach((handler) => handler(normalized))
              }
              break
              
            case "conversation.updated":
              {
                const c: any = message.data
                const updatedConv: BotConversation = {
                  id: c.id,
                  customer_phone: c.customer_phone ?? c.customerPhone ?? c.customerWa ?? "",
                  customer_name: c.customer_name ?? c.customerName ?? null,
                  status: (c.status ?? "active").toString().toLowerCase(),
                  last_message_at: c.last_message_at ?? c.lastMessageAt ?? new Date().toISOString(),
                  unread_count: c.unread_count ?? c.unreadCount ?? 0,
                  is_bot_active: c.is_bot_active ?? c.isBotActive ?? true,
                }
                setConversations((prev) => {
                  const index = prev.findIndex((cv) => cv.id === updatedConv.id)
                  if (index >= 0) {
                    const updated = [...prev]
                    updated[index] = { ...updated[index], ...updatedConv }
                    return updated.sort(
                      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
                    )
                  } else {
                    return [updatedConv, ...prev].sort(
                      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
                    )
                  }
                })
                conversationHandlers.current.forEach((handler) => handler(updatedConv))
              }
              break
              
            case "bot.status":
              const statusData = message.data as BotStatusData
              setBotEnabled(statusData.enabled)
              statusHandlers.current.forEach((handler) => handler(statusData))
              break

            case "order.created":
            case "order.updated":
              {
                const payload: OrderEventPayload = message.data?.order
                  ? { order: message.data.order }
                  : (message.data as OrderEventPayload)
                // Basic validation
                if (payload && payload.order && payload.order.id) {
                  orderHandlers.current.forEach((handler) => handler(payload))
                }
              }
              break
          }
        } catch (err) {
          console.error("Failed to process bot WebSocket message:", err)
        }
      }

      ws.onerror = (event) => {
        console.error("Bot WebSocket error:", event)
        setStatus("error")
        setError("اتصال البوت فشل")
      }

      ws.onclose = () => {
        console.log("Bot WebSocket closed")
        setStatus("error")
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Exponential backoff reconnection
        const attempt = retryAttemptRef.current + 1
        retryAttemptRef.current = attempt
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000)
        
        console.log(`Reconnecting in ${delay}ms (attempt ${attempt})`)
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    } catch (err) {
      console.error("Failed to create WebSocket:", err)
      setStatus("error")
      setError(err instanceof Error ? err.message : "فشل الاتصال بالبوت")
    }
  }

  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.close()
    }
    retryAttemptRef.current = 0
    connect()
  }

  useEffect(() => {
    connect()

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  // REST API methods - ✅ USE DATABASE-BACKED ENDPOINTS
  const fetchConversations = async (): Promise<BotConversation[]> => {
    // Fetch from database-backed API to ensure data persists across restarts
    const res = await fetch(`/api/conversations/db`, { cache: "no-store" })
    if (!res.ok) {
      // Fallback to old endpoint if new one not available yet
      console.warn("Database-backed API not available, trying legacy endpoint")
      const fallbackRes = await fetch(`/api/conversations`, { cache: "no-store" })
      if (!fallbackRes.ok) {
        throw new Error("Failed to fetch conversations")
      }
      const fallbackPayload = await fallbackRes.json()
      const fallbackList: any[] = fallbackPayload.conversations || fallbackPayload || []
      return fallbackList.map((c) => ({
        id: c.id,
        customer_phone: c.customer_phone ?? c.customerPhone ?? c.customerWa ?? "",
        customer_name: c.customer_name ?? c.customerName ?? null,
        status: (c.status ?? "active").toString().toLowerCase(),
        last_message_at: c.last_message_at ?? c.lastMessageAt ?? new Date().toISOString(),
        unread_count: c.unread_count ?? c.unreadCount ?? 0,
        is_bot_active: c.is_bot_active ?? c.isBotActive ?? true,
      }))
    }
    const payload = await res.json()
    const list: any[] = payload.conversations || payload || []
    return list.map((c) => ({
      id: c.id,
      customer_phone: c.customer_phone ?? c.customerPhone ?? c.customerWa ?? "",
      customer_name: c.customer_name ?? c.customerName ?? null,
      status: (c.status ?? "active").toString().toLowerCase(),
      last_message_at: c.last_message_at ?? c.lastMessageAt ?? new Date().toISOString(),
      unread_count: c.unread_count ?? c.unreadCount ?? 0,
      is_bot_active: c.is_bot_active ?? c.isBotActive ?? true,
    }))
  }

  const fetchMessages = async (conversationId: string): Promise<BotMessage[]> => {
    // ✅ USE DATABASE-BACKED API for message history
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/db`, { cache: "no-store" })
    if (!res.ok) {
      // Fallback to old endpoint if new one not available yet
      console.warn("Database-backed messages API not available, trying legacy endpoint")
      const fallbackRes = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, { cache: "no-store" })
      if (!fallbackRes.ok) {
        throw new Error("Failed to fetch messages")
      }
      const fallbackPayload = await fallbackRes.json()
      const fallbackList: any[] = fallbackPayload.messages || fallbackPayload || []
      return fallbackList.map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id ?? m.conversationId,
        from_phone: m.from_phone ?? m.fromPhone ?? "",
        to_phone: m.to_phone ?? m.toPhone ?? "",
        message_type: m.message_type ?? m.messageType ?? (m.media_url || m.mediaUrl ? "document" : "text"),
        content: m.content ?? m.body ?? "",
        media_url: m.media_url ?? m.mediaUrl ?? null,
        timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
        is_from_customer: typeof m.is_from_customer === "boolean" ? m.is_from_customer : (m.direction ?? "OUT") === "IN",
      }))
    }
    const payload = await res.json()
    const list: any[] = payload.messages || payload || []
    return list.map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id ?? m.conversationId,
      from_phone: m.from_phone ?? m.fromPhone ?? "",
      to_phone: m.to_phone ?? m.toPhone ?? "",
      message_type: m.message_type ?? m.messageType ?? (m.media_url || m.mediaUrl ? "document" : "text"),
      content: m.content ?? m.body ?? "",
      media_url: m.media_url ?? m.mediaUrl ?? null,
      timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
      is_from_customer: typeof m.is_from_customer === "boolean" ? m.is_from_customer : (m.direction ?? "OUT") === "IN",
    }))
  }

  const sendMessage = async (conversationId: string, message: string): Promise<void> => {
    // Proxy through internal API to ensure auth and DB persistence
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, sender_type: "agent" }),
    })
    if (!res.ok) {
      throw new Error("Failed to send message")
    }
  }

  const sendMedia = async (
    conversationId: string,
    fileOrUrl: File | string,
    caption?: string,
  ): Promise<void> => {
    // 1) If we received a File, upload it to storage to get a public URL
    let mediaUrl: string
    if (typeof fileOrUrl !== "string") {
      const uploadForm = new FormData()
      uploadForm.append("file", fileOrUrl)
      uploadForm.append("fileName", fileOrUrl.name)

      const uploadRes = await fetch(`/api/upload`, { method: "POST", body: uploadForm })
      if (!uploadRes.ok) {
        throw new Error("Failed to upload media")
      }
      const uploadJson = await uploadRes.json()
      mediaUrl = uploadJson.url
    } else {
      mediaUrl = fileOrUrl
    }

    // 2) Send media URL to conversation endpoint (same-origin proxy)
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/send-media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaUrl, caption }),
    })
    if (!res.ok) {
      throw new Error("Failed to send media")
    }
  }

  const toggleBot = async (enabled: boolean): Promise<void> => {
    const res = await fetch(`${BOT_API_URL}/bot/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    })
    if (!res.ok) {
      throw new Error("Failed to toggle bot")
    }
    const data = await res.json()
    setBotEnabled(data.enabled)
  }

  return (
    <BotWebSocketContext.Provider
      value={{
        status,
        error,
        botEnabled,
        conversations,
        subscribeToBootstrap: (handler) => {
          bootstrapHandlers.current.add(handler)
          return () => bootstrapHandlers.current.delete(handler)
        },
        subscribeToMessages: (handler) => {
          messageHandlers.current.add(handler)
          return () => messageHandlers.current.delete(handler)
        },
        subscribeToConversationUpdates: (handler) => {
          conversationHandlers.current.add(handler)
          return () => conversationHandlers.current.delete(handler)
        },
        subscribeToStatusUpdates: (handler) => {
          statusHandlers.current.add(handler)
          return () => statusHandlers.current.delete(handler)
        },
        subscribeToOrderEvents: (handler) => {
          orderHandlers.current.add(handler)
          return () => orderHandlers.current.delete(handler)
        },
        fetchConversations,
        fetchMessages,
        sendMessage,
        sendMedia,
        toggleBot,
        reconnect,
      }}
    >
      {children}
    </BotWebSocketContext.Provider>
  )
}

export function useBotWebSocket() {
  const context = useContext(BotWebSocketContext)
  if (!context) {
    throw new Error("useBotWebSocket must be used within a BotWebSocketProvider")
  }
  return context
}