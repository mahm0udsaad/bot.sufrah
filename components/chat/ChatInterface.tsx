"use client"

import { useState, useEffect, useRef } from "react"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { ConversationList } from "./ConversationList"
import { MessageThread } from "./MessageThread"
import { BotToggle } from "./BotToggle"
import { OrderTracker } from "./OrderTracker"
import { BotStatusIndicator } from "./BotStatusIndicator"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export function ChatInterface() {
  const {
    status,
    error,
    conversations,
    subscribeToMessages,
    subscribeToConversationUpdates,
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendMedia,
    reconnect,
  } = useBotWebSocket()

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, BotMessage[]>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const isInitializedRef = useRef(false)

  // Load messages for selected conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (messages[conversationId] && messages[conversationId].length > 0) {
      return // Already loaded
    }

    setLoadingMessages(true)
    try {
      const fetchedMessages = await fetchMessages(conversationId)
      setMessages((prev) => ({
        ...prev,
        [conversationId]: fetchedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }))
    } catch (err) {
      console.error("Failed to load messages:", err)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    loadConversationMessages(conversationId)
  }

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    if (!selectedConversationId || !text.trim()) return

    setSendingMessage(true)
    try {
      await sendMessage(selectedConversationId, text)
      // Message will be added via WebSocket message.created event
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle sending media
  const handleSendMedia = async (file: File, caption?: string) => {
    if (!selectedConversationId) return
    await sendMedia(selectedConversationId, file, caption)
    // Message will arrive via WebSocket message.created
  }

  // Handle bot toggle for individual conversations
  const handleToggleConversationBot = async (conversationId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/toggle-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to toggle bot for conversation")
      }

      // The conversation will be updated via WebSocket events
      // No need to manually update state here
    } catch (error) {
      console.error("Failed to toggle conversation bot:", error)
      throw error
    }
  }

  // Subscribe to real-time message updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      setMessages((prev) => {
        const convMessages = prev[message.conversation_id] || []
        const exists = convMessages.some((m) => m.id === message.id)
        
        if (exists) {
          return prev
        }

        const updated = [...convMessages, message]
        updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        return {
          ...prev,
          [message.conversation_id]: updated,
        }
      })
    })

    return unsubscribe
  }, [subscribeToMessages])

  // Subscribe to conversation updates
  useEffect(() => {
    const unsubscribe = subscribeToConversationUpdates((conversation) => {
      // Conversation updates are handled in the context
      // Just log for debugging
      console.log("Conversation updated:", conversation.id)
    })

    return unsubscribe
  }, [subscribeToConversationUpdates])

  // Initial sync with REST API
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const syncConversations = async () => {
      try {
        await fetchConversations()
      } catch (err) {
        console.error("Failed to sync conversations:", err)
      }
    }

    // Wait a bit for WebSocket bootstrap, then sync
    setTimeout(syncConversations, 2000)
  }, [fetchConversations])

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)

  return (
    <div className="flex flex-col h-full gap-4" dir="rtl">
      {/* Header with Bot Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">محادثات واتساب</h1>
          <p className="text-sm text-muted-foreground">
            إدارة المحادثات مع العملاء في الوقت الفعلي
          </p>
        </div>
        <BotToggle />
      </div>

      {/* Connection Status */}
      {status === "connecting" && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>جارٍ الاتصال بالبوت...</AlertDescription>
        </Alert>
      )}
      
      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{error || "فشل الاتصال بالبوت"}</span>
            <Button variant="outline" size="sm" onClick={reconnect}>
              إعادة الاتصال
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Bot Status Overview */}
      <BotStatusIndicator variant="compact" className="lg:hidden" />

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Conversation List */}
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            onToggleBot={handleToggleConversationBot}
          />
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          {selectedConversation ? (
            <MessageThread
              conversation={selectedConversation}
              messages={messages[selectedConversation.id] || []}
              loading={loadingMessages}
              sending={sendingMessage}
              onSendMessage={handleSendMessage}
              onSendMedia={handleSendMedia}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-lg">اختر محادثة لعرض الرسائل</p>
                <p className="text-sm mt-2">
                  {conversations.length === 0
                    ? "لا توجد محادثات حالياً"
                    : `${conversations.length} محادثة متاحة`}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Right Sidebar: Bot Status & Orders */}
        <div className="lg:col-span-1 space-y-4 hidden lg:block">
          <BotStatusIndicator />
          <OrderTracker conversationId={selectedConversationId} />
        </div>
      </div>

      {/* Mobile Order Tracker */}
      {selectedConversationId && (
        <div className="lg:hidden">
          <OrderTracker conversationId={selectedConversationId} />
        </div>
      )}
    </div>
  )
}

