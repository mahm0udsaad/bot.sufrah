"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

interface RealtimeEvent {
  type: string
  payload: any
  channel?: string
}

type MessageHandler = (payload: any) => void

type SubscriptionMap = {
  message: Set<MessageHandler>
  order: Set<MessageHandler>
}

interface RealtimeContextValue {
  restaurantId: string | null
  status: "idle" | "connecting" | "connected" | "error"
  error: string | null
  subscribeToMessages: (handler: MessageHandler) => () => void
  subscribeToOrders: (handler: MessageHandler) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

const DEFAULT_WS_URL = "ws://localhost:4000"

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const subscriptions = useRef<SubscriptionMap>({ message: new Set(), order: new Set() })
  const retryAttemptRef = useRef(0)
  const tokenRef = useRef<string | null>(null)
  const wsUrlRef = useRef<string>(DEFAULT_WS_URL)

  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      try {
        setStatus("connecting")
        setError(null)

        const tokenRes = await fetch("/api/realtime/token", { method: "POST" })
        if (!tokenRes.ok) {
          throw new Error("Failed to fetch realtime token")
        }

        const tokenPayload = await tokenRes.json()

        if (!tokenPayload.success) {
          throw new Error(tokenPayload.message || "Realtime token request failed")
        }

        if (cancelled) {
          return
        }

        tokenRef.current = tokenPayload.token as string
        wsUrlRef.current = tokenPayload.wsUrl || DEFAULT_WS_URL
        setRestaurantId(tokenPayload.restaurantId as string)

        if (!wsUrlRef.current) {
          throw new Error("Missing realtime WebSocket URL. Set NEXT_PUBLIC_REALTIME_WS_URL or REALTIME_WS_URL")
        }

        const url = new URL(wsUrlRef.current)
        url.searchParams.set("token", tokenRef.current)

        const ws = new WebSocket(url.toString())
        socketRef.current = ws

        ws.onopen = () => {
          if (cancelled) {
            return
          }
          retryAttemptRef.current = 0
          setStatus("connected")
          setError(null)

          if (tokenPayload.restaurantId) {
            const channels = [
              `ws:restaurant:${tokenPayload.restaurantId}:messages`,
              `ws:restaurant:${tokenPayload.restaurantId}:orders`,
            ]
            ws.send(
              JSON.stringify({
                action: "subscribe",
                channels,
              }),
            )
          }
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as RealtimeEvent
            const eventType = data.type || data.payload?.type
            if (!eventType) {
              return
            }

            if (eventType.startsWith("message")) {
              subscriptions.current.message.forEach((handler) => handler(data.payload ?? data))
            }

            if (eventType.startsWith("order")) {
              subscriptions.current.order.forEach((handler) => handler(data.payload ?? data))
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

  return (
    <RealtimeContext.Provider
      value={{
        restaurantId,
        status,
        error,
        subscribeToMessages,
        subscribeToOrders,
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
