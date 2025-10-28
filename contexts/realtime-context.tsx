"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

interface RealtimeEvent {
  type: string
  payload: any
  data?: any
  channel?: string
}

type MessageHandler = (payload: any) => void

type SubscriptionMap = {
  message: Set<MessageHandler>
  order: Set<MessageHandler>
  notification: Set<MessageHandler>
}

interface RealtimeContextValue {
  restaurantId: string | null
  status: "idle" | "connecting" | "connected" | "error"
  error: string | null
  subscribeToMessages: (handler: MessageHandler) => () => void
  subscribeToOrders: (handler: MessageHandler) => () => void
  subscribeToNotifications: (handler: MessageHandler) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

// Use bot service WebSocket - no authentication required
const BOT_WS_URL = process.env.BOT_WS_URL || "wss://bot.sufrah.sa/ws"

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const subscriptions = useRef<SubscriptionMap>({ message: new Set(), order: new Set(), notification: new Set() })
  const retryAttemptRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      try {
        setStatus("connecting")
        setError(null)

        // Get user info to set restaurantId for context
        // This is just for context tracking, not for authentication
        try {
          const userRes = await fetch("/api/auth/session")
          if (userRes.ok) {
            const userData = await userRes.json()
            const tenantId = userData.user?.tenantId || userData.user?.restaurant?.id
            if (tenantId && !cancelled) {
              setRestaurantId(tenantId)
            }
          }
        } catch (err) {
          console.warn("Could not fetch user session for realtime context:", err)
        }

        if (cancelled) {
          return
        }

        // Connect to bot service WebSocket - no authentication required
        const ws = new WebSocket(BOT_WS_URL)
        socketRef.current = ws

        ws.onopen = () => {
          if (cancelled) {
            return
          }
          retryAttemptRef.current = 0
          setStatus("connected")
          setError(null)
          console.log("Connected to bot WebSocket:", BOT_WS_URL)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as RealtimeEvent
            const eventType = data.type
            if (!eventType) {
              return
            }

            // Bot service emits events with { type: "event.name", data: {...} }
            if (eventType.startsWith("message")) {
              subscriptions.current.message.forEach((handler) => handler(data))
            }

            if (eventType.startsWith("order")) {
              subscriptions.current.order.forEach((handler) => handler(data))
            }

            if (eventType.startsWith("notification")) {
              subscriptions.current.notification.forEach((handler) => handler(data))
            }
          } catch (err) {
            console.error("Failed to process realtime message", err)
          }
        }

        ws.onerror = () => {
          if (cancelled) {
            return
          }
          setStatus("error")
          setError("Realtime connection error")
        }

        ws.onclose = () => {
          if (cancelled) {
            return
          }
          setStatus("error")
          const attempt = retryAttemptRef.current + 1
          retryAttemptRef.current = attempt
          const delay = Math.min(1000 * attempt, 10000)
          setTimeout(() => {
            if (!cancelled) {
              connect().catch((err) => console.error("Realtime reconnection failed", err))
            }
          }, delay)
        }
      } catch (err) {
        console.error("Realtime connection failed", err)
        if (cancelled) {
          return
        }
        setStatus("error")
        setError(err instanceof Error ? err.message : "Realtime connection failed")
        const attempt = retryAttemptRef.current + 1
        retryAttemptRef.current = attempt
        const delay = Math.min(1000 * attempt, 10000)
        setTimeout(() => {
          if (!cancelled) {
            connect().catch((error) => console.error("Realtime retry failed", error))
          }
        }, delay)
      }
    }

    void connect()

    return () => {
      cancelled = true
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  const subscribeToMessages = (handler: MessageHandler) => {
    subscriptions.current.message.add(handler)
    return () => {
      subscriptions.current.message.delete(handler)
    }
  }

  const subscribeToOrders = (handler: MessageHandler) => {
    subscriptions.current.order.add(handler)
    return () => {
      subscriptions.current.order.delete(handler)
    }
  }

  const subscribeToNotifications = (handler: MessageHandler) => {
    subscriptions.current.notification.add(handler)
    return () => {
      subscriptions.current.notification.delete(handler)
    }
  }

  return (
    <RealtimeContext.Provider
      value={{
        restaurantId,
        status,
        error,
        subscribeToMessages,
        subscribeToOrders,
        subscribeToNotifications,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}

/**
 * Safe version of useRealtime that returns null if provider is not available
 * Use this in components that can work with or without real-time updates
 */
export function useSafeRealtime() {
  const context = useContext(RealtimeContext)
  return context
}
