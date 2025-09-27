"use client"

import { useEffect, useRef, useState } from "react"
import { BotWebSocketClient, type BotConversation, type BotMessage } from "@/lib/integrations/bot-api"

export function useBotWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [conversations, setConversations] = useState<BotConversation[]>([])
  const [botStatus, setBotStatus] = useState({ enabled: true })
  const wsClient = useRef<BotWebSocketClient | null>(null)

  useEffect(() => {
    wsClient.current = new BotWebSocketClient(
      // Handle conversation updates
      (conversation: BotConversation) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === conversation.id)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = conversation
            return updated
          } else {
            return [conversation, ...prev]
          }
        })
      },
      // Handle message updates
      (message: BotMessage) => {
        // Update conversation's last message time and unread count
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === message.conversation_id
              ? {
                  ...conv,
                  last_message_at: message.timestamp,
                  unread_count: message.is_from_customer ? conv.unread_count + 1 : conv.unread_count,
                }
              : conv,
          ),
        )
      },
      // Handle bot status updates
      (status: { enabled: boolean }) => {
        setBotStatus(status)
      },
    )

    wsClient.current.connect()
    setIsConnected(true)

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect()
        setIsConnected(false)
      }
    }
  }, [])

  return {
    isConnected,
    conversations,
    botStatus,
    updateConversations: setConversations,
  }
}
