"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { botApi, type Conversation, type Message, type BotStatus } from "@/lib/bot-api"

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await botApi.fetchConversations()
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  }
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return

    try {
      setLoading(true)
      setError(null)
      const data = await botApi.fetchMessages(conversationId)
      setMessages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages")
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return

      try {
        const message = await botApi.sendMessage(conversationId, content)
        setMessages((prev) => [...prev, message])
        return message
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message")
        throw err
      }
    },
    [conversationId],
  )

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  }
}

export function useBotStatus() {
  const [status, setStatus] = useState<BotStatus>({ enabled: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleBot = useCallback(async (enabled: boolean) => {
    try {
      setLoading(true)
      setError(null)
      const newStatus = await botApi.toggleBot(enabled)
      setStatus(newStatus)
      return newStatus
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle bot")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    status,
    loading,
    error,
    toggleBot,
  }
}

export function useBotWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = botApi.connectWebSocket()
    if (!ws) return

    wsRef.current = ws

    ws.onopen = () => {
      console.log("[v0] Bot WebSocket connected")
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("[v0] Bot WebSocket message:", data)
        setLastMessage(data)
      } catch (error) {
        // Handle ping/pong or other non-JSON messages
        if (event.data === "pong") {
          console.log("[v0] Bot WebSocket pong received")
        }
      }
    }

    ws.onclose = () => {
      console.log("[v0] Bot WebSocket disconnected")
      setConnected(false)
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000)
    }

    ws.onerror = (error) => {
      console.error("[v0] Bot WebSocket error:", error)
      setConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [])

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send("ping")
    }
  }, [])

  useEffect(() => {
    connect()

    // Set up ping interval
    const pingInterval = setInterval(sendPing, 30000) // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval)
      disconnect()
    }
  }, [connect, disconnect, sendPing])

  return {
    connected,
    lastMessage,
    connect,
    disconnect,
    sendPing,
  }
}
