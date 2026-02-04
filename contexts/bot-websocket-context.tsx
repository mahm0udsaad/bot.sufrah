"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

const BOT_WS_URL = process.env.BOT_WS_URL || process.env.BOT_WS_URL || "wss://bot.sufrah.sa/ws"
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
  message_type: "text" | "image" | "document" | "audio" | "template" | string
  content: string // Now formatted by backend (e.g., "📋 new_order_notification")
  original_content?: string // Raw content (e.g., "HX4b088aa4afe1428c50a6b12026317ece")
  media_url: string | null
  timestamp: string
  is_from_customer: boolean
  // Template message support
  content_sid?: string
  variables?: Record<string, string>
  template_preview?: {
    sid: string
    friendlyName: string
    language: string
    body: string
    contentType: "text" | "quick-reply" | "card" | "list-picker" | string
    buttons: Array<{
      type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE" | string
      title: string
      id?: string
      url?: string
      phone_number?: string
    }>
  }
}

interface BotStatusData {
  enabled: boolean
}

interface WebSocketMessage {
  type:
    | "connection"
    | "conversation.bootstrap"
    | "message.created"
    | "message.sent"
    | "conversation.updated"
    | "bot.status"
    | "order.created"
    | "order.updated"
  data: any
  message?: any // For message.sent events
  conversation?: any // For message.sent events
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
  hasMoreConversations: boolean
  loadingConversations: boolean
  subscribeToBootstrap: (handler: BootstrapHandler) => () => void
  subscribeToMessages: (handler: MessageHandler) => () => void
  subscribeToConversationUpdates: (handler: ConversationHandler) => () => void
  subscribeToStatusUpdates: (handler: StatusHandler) => () => void
  subscribeToOrderEvents: (handler: OrderHandler) => () => void
  fetchConversations: () => Promise<BotConversation[]>
  fetchMoreConversations: () => Promise<BotConversation[]>
  fetchMessages: (conversationId: string) => Promise<BotMessage[]>
  sendMessage: (conversationId: string, message: string) => Promise<BotMessage>
  sendMedia: (conversationId: string, fileOrUrl: File | string, caption?: string) => Promise<BotMessage>
  toggleBot: (enabled: boolean) => Promise<void>
  reconnect: () => void
}

const BotWebSocketContext = createContext<BotWebSocketContextValue | null>(null)

/**
 * Deduplicate conversations by phone number
 * If multiple conversations exist for the same phone, keep only the most recent one
 */
function deduplicateConversationsByPhone(conversations: BotConversation[]): BotConversation[] {
  const phoneMap = new Map<string, BotConversation>()
  
  // Sort by last_message_at descending (most recent first)
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )
  
  // Keep only the first (most recent) conversation for each phone number
  for (const conv of sorted) {
    const phone = conv.customer_phone?.trim()
    if (phone && !phoneMap.has(phone)) {
      phoneMap.set(phone, conv)
    }
  }
  
  // Return deduplicated list, sorted by most recent
  return Array.from(phoneMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )
}

export function BotWebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [botEnabled, setBotEnabled] = useState(false)
  const [conversations, setConversations] = useState<BotConversation[]>([])
  const [hasMoreConversations, setHasMoreConversations] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const conversationOffsetRef = useRef(0)
  const CONVERSATIONS_PAGE_SIZE = 50

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
              // Only handle message.created to avoid duplicates
              // message.sent is redundant and causes duplicate messages
              {
                const m: any = message.data
                const normalizedType =
                  m.message_type ??
                  m.messageType ??
                  (m.templatePreview || m.template_preview ? "template" : (m.media_url || m.mediaUrl ? "document" : "text"))
                const normalized: BotMessage = {
                  id: m.id,
                  conversation_id: m.conversation_id ?? m.conversationId,
                  from_phone: m.from_phone ?? m.fromPhone ?? "",
                  to_phone: m.to_phone ?? m.toPhone ?? "",
                  message_type: normalizedType,
                  content: m.content ?? m.body ?? "",
                  original_content: m.original_content ?? m.originalContent ?? undefined,
                  media_url: m.media_url ?? m.mediaUrl ?? null,
                  timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
                  is_from_customer: typeof m.is_from_customer === "boolean" ? m.is_from_customer : (m.direction ?? "OUT") === "IN",
                  content_sid: m.contentSid ?? m.content_sid,
                  variables: m.variables ?? undefined,
                  template_preview: m.templatePreview ?? m.template_preview ?? undefined,
                }
                messageHandlers.current.forEach((handler) => handler(normalized))
                
                // Update conversation metadata to keep the list fresh
                setConversations((prev) => {
                  const index = prev.findIndex((cv) => cv.id === normalized.conversation_id)
                  if (index >= 0) {
                    const updated = [...prev]
                    updated[index] = {
                      ...updated[index],
                      last_message_at: normalized.timestamp,
                    }
                    // Re-sort by most recent message
                    return updated.sort(
                      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
                    )
                  }
                  return prev
                })
              }
              break
              
            case "message.sent":
              // Ignore message.sent to prevent duplicates
              // We already handle the message via message.created
              console.log("Ignoring message.sent event to prevent duplicate messages")
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
                  let updated: BotConversation[]
                  if (index >= 0) {
                    updated = [...prev]
                    updated[index] = { ...updated[index], ...updatedConv }
                  } else {
                    updated = [updatedConv, ...prev]
                  }
                  // Deduplicate and sort
                  return deduplicateConversationsByPhone(updated)
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

  // Simple smoke test helper in development to preview template messages rendering
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    // Trigger a mock message after mount to ensure renderer handles template preview
    const timeout = setTimeout(() => {
      const mockTemplateMessage: BotMessage = {
        id: "mock-tpl-1",
        conversation_id: "mock-conv",
        from_phone: "",
        to_phone: "",
        message_type: "template",
        content: "You have a new order made on Sufrah! 🎉",
        media_url: null,
        timestamp: new Date().toISOString(),
        is_from_customer: false,
        content_sid: "HX1234567890abcdef",
        variables: { "1": "Restaurant Name", "2": "Customer Name" },
        template_preview: {
          sid: "HX1234567890abcdef",
          friendlyName: "order_notification_with_button",
          language: "en",
          body: "You have a new order made on Sufrah! 🎉",
          contentType: "quick-reply",
          buttons: [
            { type: "QUICK_REPLY", title: "View Order Details", id: "view_order" },
          ],
        },
      }
      messageHandlers.current.forEach((handler) => handler(mockTemplateMessage))
    }, 0)
    return () => clearTimeout(timeout)
  }, [])

  const normalizeConversationData = (c: any): BotConversation => ({
    id: c.id,
    customer_phone: c.customer_phone ?? c.customerPhone ?? c.customerWa ?? "",
    customer_name: c.customer_name ?? c.customerName ?? null,
    status: (c.status ?? "active").toString().toLowerCase(),
    last_message_at: c.last_message_at ?? c.lastMessageAt ?? new Date().toISOString(),
    unread_count: c.unread_count ?? c.unreadCount ?? 0,
    is_bot_active: c.is_bot_active ?? c.isBotActive ?? true,
  })

  const fetchConversationsPage = async (offset: number, limit: number): Promise<BotConversation[]> => {
    const res = await fetch(`/api/conversations/db?offset=${offset}&limit=${limit}`, { cache: "no-store" })
    if (!res.ok) {
      console.warn("Database-backed API not available, trying legacy endpoint")
      const fallbackRes = await fetch(`/api/conversations?take=${limit}`, { cache: "no-store" })
      if (!fallbackRes.ok) {
        throw new Error("Failed to fetch conversations")
      }
      const fallbackPayload = await fallbackRes.json()
      const fallbackList: any[] = fallbackPayload.conversations || fallbackPayload || []
      return fallbackList.map(normalizeConversationData)
    }
    const payload = await res.json()
    const list: any[] = payload.conversations || payload || []
    return list.map(normalizeConversationData)
  }

  // REST API methods - ✅ USE DATABASE-BACKED ENDPOINTS
  const fetchConversations = async (): Promise<BotConversation[]> => {
    setLoadingConversations(true)
    try {
      const normalized = await fetchConversationsPage(0, CONVERSATIONS_PAGE_SIZE)
      const deduplicated = deduplicateConversationsByPhone(normalized)
      setConversations(deduplicated)
      conversationOffsetRef.current = normalized.length
      setHasMoreConversations(normalized.length >= CONVERSATIONS_PAGE_SIZE)
      return deduplicated
    } finally {
      setLoadingConversations(false)
    }
  }

  const fetchMoreConversations = async (): Promise<BotConversation[]> => {
    if (!hasMoreConversations || loadingConversations) return conversations
    setLoadingConversations(true)
    try {
      const normalized = await fetchConversationsPage(conversationOffsetRef.current, CONVERSATIONS_PAGE_SIZE)
      if (normalized.length < CONVERSATIONS_PAGE_SIZE) {
        setHasMoreConversations(false)
      }
      conversationOffsetRef.current += normalized.length
      const merged = [...conversations, ...normalized]
      const deduplicated = deduplicateConversationsByPhone(merged)
      setConversations(deduplicated)
      return deduplicated
    } finally {
      setLoadingConversations(false)
    }
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
        message_type:
          m.message_type ??
          m.messageType ??
          (m.templatePreview || m.template_preview ? "template" : (m.media_url || m.mediaUrl ? "document" : "text")),
        content: m.content ?? m.body ?? "",
        original_content: m.original_content ?? m.originalContent ?? undefined,
        media_url: m.media_url ?? m.mediaUrl ?? null,
        timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
        is_from_customer:
          typeof m.is_from_customer === "boolean"
            ? m.is_from_customer
            : ["IN", "INBOUND", "CUSTOMER"].includes(
                String(m.direction ?? m.sender_type ?? "").trim().toUpperCase(),
              ),
        content_sid: m.contentSid ?? m.content_sid,
        variables: m.variables ?? undefined,
        template_preview: m.templatePreview ?? m.template_preview ?? undefined,
      }))
    }
    const payload = await res.json()
    const list: any[] = payload.messages || payload || []
    return list.map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id ?? m.conversationId,
      from_phone: m.from_phone ?? m.fromPhone ?? "",
      to_phone: m.to_phone ?? m.toPhone ?? "",
      message_type:
        m.message_type ??
        m.messageType ??
        (m.templatePreview || m.template_preview ? "template" : (m.media_url || m.mediaUrl ? "document" : "text")),
      content: m.content ?? m.body ?? "",
      original_content: m.original_content ?? m.originalContent ?? undefined,
      media_url: m.media_url ?? m.mediaUrl ?? null,
      timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
      is_from_customer:
        typeof m.is_from_customer === "boolean"
          ? m.is_from_customer
          : ["IN", "INBOUND", "CUSTOMER"].includes(
              String(m.direction ?? m.sender_type ?? "").trim().toUpperCase(),
            ),
      content_sid: m.contentSid ?? m.content_sid,
      variables: m.variables ?? undefined,
      template_preview: m.templatePreview ?? m.template_preview ?? undefined,
    }))
  }

  const sendMessage = async (conversationId: string, message: string): Promise<BotMessage> => {
    // Proxy through internal API to ensure auth and DB persistence
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, sender_type: "agent" }),
    })
    if (!res.ok) {
      throw new Error("Failed to send message")
    }
    
    const responseData = await res.json()
    const m = responseData.data?.message || responseData.message || responseData
    
    // Normalize the response to BotMessage format
    const normalizedMessage: BotMessage = {
      id: m.id,
      conversation_id: m.conversation_id ?? m.conversationId ?? conversationId,
      from_phone: m.from_phone ?? m.fromPhone ?? "",
      to_phone: m.to_phone ?? m.toPhone ?? "",
      message_type: m.message_type ?? m.messageType ?? "text",
      content: m.content ?? m.body ?? message,
      original_content: m.original_content ?? m.originalContent ?? undefined,
      media_url: m.media_url ?? m.mediaUrl ?? null,
      timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
      is_from_customer: false, // Sent by agent
      content_sid: m.contentSid ?? m.content_sid,
      variables: m.variables ?? undefined,
      template_preview: m.templatePreview ?? m.template_preview ?? undefined,
    }
    
    return normalizedMessage
  }

  const sendMedia = async (
    conversationId: string,
    fileOrUrl: File | string,
    caption?: string,
  ): Promise<BotMessage> => {
    // 1) If we received a File, upload it to storage to get a public URL
    let mediaUrl: string
    if (typeof fileOrUrl !== "string") {
      const uploadForm = new FormData()
      uploadForm.append("file", fileOrUrl)
      uploadForm.append("fileName", fileOrUrl.name)

      const uploadRes = await fetch(`/api/upload`, { method: "POST", body: uploadForm })
      if (!uploadRes.ok) {
        const uploadJson = await uploadRes.json()
        const errorMessage = uploadJson.message || "فشل رفع الملف"
        throw new Error(errorMessage)
      }
      const uploadJson = await uploadRes.json()
      if (!uploadJson.success || !uploadJson.url) {
        throw new Error(uploadJson.message || "فشل رفع الملف")
      }
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
      const errorJson = await res.json().catch(() => ({}))
      throw new Error(errorJson.message || "فشل إرسال الملف")
    }
    
    const responseData = await res.json()
    const m = responseData.data?.message || responseData.message || responseData
    
    // Normalize the response to BotMessage format
    const normalizedMessage: BotMessage = {
      id: m.id,
      conversation_id: m.conversation_id ?? m.conversationId ?? conversationId,
      from_phone: m.from_phone ?? m.fromPhone ?? "",
      to_phone: m.to_phone ?? m.toPhone ?? "",
      message_type: m.message_type ?? m.messageType ?? "image",
      content: m.content ?? m.body ?? caption ?? "🖼️ Media",
      original_content: m.original_content ?? m.originalContent ?? undefined,
      media_url: m.media_url ?? m.mediaUrl ?? mediaUrl,
      timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
      is_from_customer: false, // Sent by agent
      content_sid: m.contentSid ?? m.content_sid,
      variables: m.variables ?? undefined,
      template_preview: m.templatePreview ?? m.template_preview ?? undefined,
    }
    
    return normalizedMessage
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
        hasMoreConversations,
        loadingConversations,
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
        fetchMoreConversations,
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