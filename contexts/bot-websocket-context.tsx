"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

const BOT_WS_URL = process.env.BOT_WS_URL || "wss://bot.sufrah.sa/ws"
const BOT_API_URL = process.env.BOT_API_URL || "https://bot.sufrah.sa/api"

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
  type: "connection" | "conversation.bootstrap" | "message.created" | "conversation.updated" | "bot.status"
  data: any
}

type ConversationHandler = (conversation: BotConversation) => void
type MessageHandler = (message: BotMessage) => void
type StatusHandler = (status: BotStatusData) => void
type BootstrapHandler = (conversations: BotConversation[]) => void

interface BotWebSocketContextValue {
  status: "idle" | "connecting" | "connected" | "error"
  error: string | null
  botEnabled: boolean
  conversations: BotConversation[]
  subscribeToBootstrap: (handler: BootstrapHandler) => () => void
  subscribeToMessages: (handler: MessageHandler) => () => void
  subscribeToConversationUpdates: (handler: ConversationHandler) => () => void
  subscribeToStatusUpdates: (handler: StatusHandler) => () => void
  fetchConversations: () => Promise<BotConversation[]>
  fetchMessages: (conversationId: string) => Promise<BotMessage[]>
  sendMessage: (conversationId: string, message: string) => Promise<void>
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
              console.log("Received conversation bootstrap:", message.data.length, "conversations")
              const bootstrapConvs = message.data as BotConversation[]
              setConversations(bootstrapConvs)
              bootstrapHandlers.current.forEach((handler) => handler(bootstrapConvs))
              break
              
            case "message.created":
              const newMessage = message.data as BotMessage
              messageHandlers.current.forEach((handler) => handler(newMessage))
              break
              
            case "conversation.updated":
              const updatedConv = message.data as BotConversation
              setConversations((prev) => {
                const index = prev.findIndex((c) => c.id === updatedConv.id)
                if (index >= 0) {
                  const updated = [...prev]
                  updated[index] = { ...updated[index], ...updatedConv }
                  return updated.sort((a, b) => 
                    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                  )
                } else {
                  return [updatedConv, ...prev].sort((a, b) => 
                    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                  )
                }
              })
              conversationHandlers.current.forEach((handler) => handler(updatedConv))
              break
              
            case "bot.status":
              const statusData = message.data as BotStatusData
              setBotEnabled(statusData.enabled)
              statusHandlers.current.forEach((handler) => handler(statusData))
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

  // REST API methods
  const fetchConversations = async (): Promise<BotConversation[]> => {
    const res = await fetch(`${BOT_API_URL}/conversations`)
    if (!res.ok) {
      throw new Error("Failed to fetch conversations")
    }
    return res.json()
  }

  const fetchMessages = async (conversationId: string): Promise<BotMessage[]> => {
    const res = await fetch(`${BOT_API_URL}/conversations/${encodeURIComponent(conversationId)}/messages`)
    if (!res.ok) {
      throw new Error("Failed to fetch messages")
    }
    return res.json()
  }

  const sendMessage = async (conversationId: string, message: string): Promise<void> => {
    const res = await fetch(`${BOT_API_URL}/conversations/${encodeURIComponent(conversationId)}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) {
      throw new Error("Failed to send message")
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

  const subscribeToBootstrap = (handler: BootstrapHandler) => {
    bootstrapHandlers.current.add(handler)
    return () => {
      bootstrapHandlers.current.delete(handler)
    }
  }

  const subscribeToMessages = (handler: MessageHandler) => {
    messageHandlers.current.add(handler)
    return () => {
      messageHandlers.current.delete(handler)
    }
  }

  const subscribeToConversationUpdates = (handler: ConversationHandler) => {
    conversationHandlers.current.add(handler)
    return () => {
      conversationHandlers.current.delete(handler)
    }
  }

  const subscribeToStatusUpdates = (handler: StatusHandler) => {
    statusHandlers.current.add(handler)
    return () => {
      statusHandlers.current.delete(handler)
    }
  }

  return (
    <BotWebSocketContext.Provider
      value={{
        status,
        error,
        botEnabled,
        conversations,
        subscribeToBootstrap,
        subscribeToMessages,
        subscribeToConversationUpdates,
        subscribeToStatusUpdates,
        fetchConversations,
        fetchMessages,
        sendMessage,
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

