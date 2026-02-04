"use client"

import { useState, useEffect, useRef } from "react"
import { useBotWebSocket } from "@/contexts/bot-websocket-context"
import { MessageThread } from "./MessageThread"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowRight, 
  Search, 
  MoreVertical, 
  Bot,
  MessageCircle,
  Users,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"

interface BotMessage {
  id: string
  conversation_id: string
  from_phone: string
  to_phone: string
  message_type: "text" | "image" | "document" | "audio" | "template" | string
  content: string
  original_content?: string
  media_url: string | null
  timestamp: string
  is_from_customer: boolean
  content_sid?: string
  variables?: Record<string, string>
  template_preview?: {
    sid: string
    friendlyName: string
    language: string
    body: string
    contentType: string
    buttons: Array<{
      type: string
      title: string
      id?: string
      url?: string
    }>
  }
}

export function ChatInterface() {
  const {
    status,
    error,
    conversations,
    hasMoreConversations,
    loadingConversations,
    subscribeToMessages,
    subscribeToConversationUpdates,
    fetchConversations,
    fetchMoreConversations,
    fetchMessages,
    sendMessage,
    sendMedia,
    reconnect,
  } = useBotWebSocket()

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, BotMessage[]>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showMobileMessages, setShowMobileMessages] = useState(false)
  const [togglingBot, setTogglingBot] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [optimisticBotStates, setOptimisticBotStates] = useState<Record<string, boolean>>({})
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [loadingRestaurant, setLoadingRestaurant] = useState(true)
  const [optimisticUnreadCounts, setOptimisticUnreadCounts] = useState<Record<string, number>>({})
  const [loadingOlderMessages, setLoadingOlderMessages] = useState<Record<string, boolean>>({})
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({})
  const isInitializedRef = useRef(false)
  const processedMessageIds = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousMessageCountRef = useRef<Record<string, number>>({})

  const normalizeFetchedMessage = (message: any): BotMessage => {
    const rawDirection = (message.direction || message.sender_type || "OUT").toString().trim().toUpperCase()
    const isFromCustomer =
      typeof message.is_from_customer === "boolean"
        ? message.is_from_customer
        : ["IN", "INBOUND", "CUSTOMER"].includes(rawDirection)

    return {
      id: message.id,
      conversation_id: message.conversation_id ?? message.conversationId,
      from_phone: message.from_phone ?? message.fromPhone ?? "",
      to_phone: message.to_phone ?? message.toPhone ?? "",
      message_type:
        message.message_type ??
        message.messageType ??
        (message.templatePreview || message.template_preview ? "template" : (message.media_url || message.mediaUrl ? "document" : "text")),
      content: message.content ?? message.body ?? "",
      original_content: message.original_content ?? message.originalContent ?? undefined,
      media_url: message.media_url ?? message.mediaUrl ?? null,
      timestamp: message.timestamp ?? message.createdAt ?? new Date().toISOString(),
      is_from_customer: isFromCustomer,
      content_sid: message.content_sid ?? message.contentSid,
      variables: message.variables ?? undefined,
      template_preview: message.template_preview ?? message.templatePreview ?? undefined,
    }
  }

  // Load messages for selected conversation with pagination
  const loadConversationMessages = async (conversationId: string, limit = 10) => {
    // Always load fresh messages when opening a conversation
    setLoadingMessages(true)
    setHasMoreMessages(prev => ({ ...prev, [conversationId]: true }))
    try {
      // Fetch last N messages (newest first, then reverse)
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages/db?limit=${limit}`, {
        cache: "no-store"
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch messages")
      }
      
      const payload = await res.json()
      const fetchedMessages: BotMessage[] = (payload.messages || []).map(normalizeFetchedMessage)
      
      // If we got fewer messages than requested, there are no more
      if (fetchedMessages.length < limit) {
        setHasMoreMessages(prev => ({ ...prev, [conversationId]: false }))
      }
      
      fetchedMessages.forEach((msg: BotMessage) => processedMessageIds.current.add(msg.id))
      
      setMessages((prev) => ({
        ...prev,
        [conversationId]: fetchedMessages.sort((a: BotMessage, b: BotMessage) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }))
    } catch (err) {
      console.error("Failed to load messages:", err)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Load older messages for infinite scroll
  const loadOlderMessages = async (conversationId: string) => {
    const currentMessages = messages[conversationId] || []
    if (currentMessages.length === 0 || loadingOlderMessages[conversationId]) return

    const oldestMessage = currentMessages[0]
    if (!oldestMessage) return

    setLoadingOlderMessages(prev => ({ ...prev, [conversationId]: true }))
    try {
      const beforeDate = new Date(oldestMessage.timestamp)
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages/db?limit=20&before=${beforeDate.toISOString()}`,
        { cache: "no-store" }
      )

      if (!res.ok) {
        throw new Error("Failed to load older messages")
      }

      const payload = await res.json()
      const olderMessages: BotMessage[] = (payload.messages || []).map(normalizeFetchedMessage)

      if (olderMessages.length === 0) {
        setHasMoreMessages(prev => ({ ...prev, [conversationId]: false }))
        return
      }

      // Merge with existing messages (prepend older messages)
      setMessages((prev) => {
        const existingMessages = prev[conversationId] || []
        const existingIds = new Set(existingMessages.map((m: BotMessage) => m.id))
        const newMessages = olderMessages.filter((m: BotMessage) => !existingIds.has(m.id))
        const merged = [...newMessages, ...existingMessages]
        return {
          ...prev,
          [conversationId]: merged.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
        }
      })
    } catch (err) {
      console.error("Failed to load older messages:", err)
    } finally {
      setLoadingOlderMessages(prev => ({ ...prev, [conversationId]: false }))
    }
  }

  // Mark conversation as read
  const markConversationAsRead = async (conversationId: string) => {
    try {
      // Optimistically update UI
      setOptimisticUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }))
      
      // Update backend
      await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/mark-read`, {
        method: "POST",
        cache: "no-store"
      })
      
      // Refresh conversations to sync with backend
      await fetchConversations()
    } catch (err) {
      console.error("Failed to mark conversation as read:", err)
      // Revert optimistic update on error
      setOptimisticUnreadCounts(prev => {
        const { [conversationId]: _, ...rest } = prev
        return rest
      })
    }
  }

  // Handle conversation selection
  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setShowMobileMessages(true)
    
    // Mark as read immediately
    await markConversationAsRead(conversationId)
    
    // Load last 10 messages
    await loadConversationMessages(conversationId, 10)
  }

  // Handle back to conversation list on mobile
  const handleBackToConversations = () => {
    setShowMobileMessages(false)
  }

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    if (!selectedConversationId || !text.trim()) return

    setSendingMessage(true)
    try {
      const sentMessage = await sendMessage(selectedConversationId, text)
      
      processedMessageIds.current.add(sentMessage.id)
      
      setMessages((prev) => {
        const convMessages = prev[selectedConversationId] || []
        const exists = convMessages.some((m) => m.id === sentMessage.id)
        
        if (exists) {
          return prev
        }

        const updated = [...convMessages, sentMessage]
        updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        return {
          ...prev,
          [selectedConversationId]: updated,
        }
      })
    } catch (err) {
      console.error("Failed to send message:", err)
      toast.error("فشل إرسال الرسالة")
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle sending media
  const handleSendMedia = async (file: File, caption?: string) => {
    if (!selectedConversationId) return
    
    try {
      const sentMessage = await sendMedia(selectedConversationId, file, caption)
      
      processedMessageIds.current.add(sentMessage.id)
      
      setMessages((prev) => {
        const convMessages = prev[selectedConversationId] || []
        const exists = convMessages.some((m) => m.id === sentMessage.id)
        
        if (exists) {
          return prev
        }

        const updated = [...convMessages, sentMessage]
        updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        return {
          ...prev,
          [selectedConversationId]: updated,
        }
      })
    } catch (err) {
      console.error("Failed to send media:", err)
      throw err
    }
  }

  // Handle bot toggle for individual conversations with optimistic update
  const handleToggleConversationBot = async (conversationId: string, enabled: boolean) => {
    // Optimistic update - immediately update UI
    setOptimisticBotStates(prev => ({ ...prev, [conversationId]: enabled }))
    setTogglingBot(true)
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/toggle-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to toggle bot for conversation")
      }

      // Success - refresh conversations to get the updated state
      toast.success(enabled ? "تم تشغيل البوت للمحادثة" : "تم إيقاف البوت للمحادثة")
      
      // Refresh conversations from API to get real updated state
      await fetchConversations()
      
      // Now clear the optimistic state since we have the real data
      setOptimisticBotStates(prev => {
        const { [conversationId]: _, ...rest } = prev
        return rest
      })
    } catch (error) {
      console.error("Failed to toggle conversation bot:", error)
      toast.error("فشل تغيير حالة البوت")
      
      // Revert optimistic update on error
      setOptimisticBotStates(prev => {
        const { [conversationId]: _, ...rest } = prev
        return rest
      })
      
      throw error
    } finally {
      setTogglingBot(false)
    }
  }

  // Initialize audio notification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.wav')
      audioRef.current.volume = 0.5
    }
  }, [])

  // Play notification sound for incoming customer messages
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((err) => {
        console.log('Could not play notification sound:', err)
      })
    }
  }

  // Subscribe to real-time message updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      if (processedMessageIds.current.has(message.id)) {
        console.log(`Skipping duplicate message ${message.id} from WebSocket (already processed via optimistic update)`)
        return
      }
      
      setMessages((prev) => {
        const convMessages = prev[message.conversation_id] || []
        const exists = convMessages.some((m) => m.id === message.id)
        
        if (exists) {
          return prev
        }

        const updated = [...convMessages, message]
        updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        // Play notification sound for incoming customer messages
        if (message.is_from_customer) {
          playNotificationSound()
        }

        return {
          ...prev,
          [message.conversation_id]: updated,
        }
      })
    })

    return unsubscribe
  }, [subscribeToMessages])

  // Subscribe to conversation updates and clear optimistic states when real update arrives
  useEffect(() => {
    const unsubscribe = subscribeToConversationUpdates((conversation) => {
      console.log("Conversation updated:", conversation.id, "bot_active:", conversation.is_bot_active)
      
      // If we have an optimistic state for this conversation, check if the real state matches
      setOptimisticBotStates(prev => {
        if (conversation.id in prev) {
          // Real update arrived, clear the optimistic state
          const { [conversation.id]: _, ...rest } = prev
          return rest
        }
        return prev
      })
    })

    return unsubscribe
  }, [subscribeToConversationUpdates])

  // Load restaurant name for filtering confidential conversations
  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const res = await fetch("/api/restaurant/profile", { cache: "no-store" })
        if (res.ok) {
          const restaurant = await res.json()
          setRestaurantName(restaurant.name || null)
        }
      } catch (err) {
        console.error("Failed to load restaurant:", err)
      } finally {
        setLoadingRestaurant(false)
      }
    }
    loadRestaurant()
  }, [])

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

    setTimeout(syncConversations, 2000)
  }, [fetchConversations])

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)
  
  // Helper to get bot status with optimistic updates
  const getBotStatus = (conversationId: string) => {
    if (conversationId in optimisticBotStates) {
      return optimisticBotStates[conversationId]
    }
    const conv = conversations.find(c => c.id === conversationId)
    return conv?.is_bot_active || false
  }
  
  // Filter conversations: exclude confidential ones (where customer_name matches restaurant name)
  // and apply search query
  const filteredConversations = conversations.filter(conv => {
    // Exclude confidential conversations (restaurant name matches customer name)
    if (restaurantName && conv.customer_name && 
        conv.customer_name.toLowerCase().trim() === restaurantName.toLowerCase().trim()) {
      return false
    }
    
    // Apply search filter
    const query = searchQuery.toLowerCase()
    return (
      conv.customer_name?.toLowerCase().includes(query) ||
      conv.customer_phone.includes(query)
    )
  })

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ar })
    } catch {
      return timestamp
    }
  }

  // Get statistics for header (excluding confidential conversations)
  const visibleConversations = conversations.filter(conv => {
    if (restaurantName && conv.customer_name && 
        conv.customer_name.toLowerCase().trim() === restaurantName.toLowerCase().trim()) {
      return false
    }
    return true
  })
  
  const stats = {
    total: visibleConversations.length,
    unread: visibleConversations.reduce((sum, conv) => {
      const unread = optimisticUnreadCounts[conv.id] ?? conv.unread_count ?? 0
      return sum + Math.max(0, unread)
    }, 0),
    active: visibleConversations.filter(c => c.is_bot_active).length,
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Left Sidebar - Conversation List */}
      <div className={cn(
        "w-full md:w-[380px] lg:w-[420px] bg-white flex flex-col shadow-xl border-l border-gray-200",
        showMobileMessages && "hidden md:flex"
      )}>
        {/* Modern Header with Stats - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
        <div>
                <h1 className="text-white text-lg font-semibold">المحادثات</h1>
                <p className="text-white/80 text-xs">{stats.total} محادثة نشطة</p>
              </div>
            </div>
            
            {/* Bot Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm",
                stats.active > 0 
                  ? "bg-green-500/20 border border-green-400/30" 
                  : "bg-red-500/20 border border-red-400/30"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  stats.active > 0 ? "bg-green-400" : "bg-red-400"
                )} />
                <Bot className={cn(
                  "w-4 h-4",
                  stats.active > 0 ? "text-green-100" : "text-red-100"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  stats.active > 0 ? "text-green-50" : "text-red-50"
                )}>
                  {stats.active > 0 ? "البوت نشط" : "البوت متوقف"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              <div className="text-white/70 text-[10px] font-medium">الإجمالي</div>
              {loadingRestaurant ? (
                <Skeleton className="h-6 w-8 bg-white/20" />
              ) : (
                <div className="text-white text-lg font-bold">{stats.total}</div>
              )}
            </div>
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              <div className="text-white/70 text-[10px] font-medium">غير مقروء</div>
              {loadingRestaurant ? (
                <Skeleton className="h-6 w-8 bg-white/20" />
              ) : (
                <div className="text-white text-lg font-bold">{stats.unread}</div>
              )}
            </div>
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              <div className="text-white/70 text-[10px] font-medium">بوت نشط</div>
              {loadingRestaurant ? (
                <Skeleton className="h-6 w-8 bg-white/20" />
              ) : (
                <div className="text-white text-lg font-bold">{stats.active}</div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Search - Fixed */}
        <div className="flex-shrink-0 px-3 py-3 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن محادثة..."
              className="w-full bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-10 h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent shadow-sm"
            />
          </div>
      </div>

        {/* Conversation List with enhanced styling - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingRestaurant || conversations.length === 0 ? (
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-semibold text-lg mb-2">لا توجد محادثات</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                {searchQuery ? "لم يتم العثور على نتائج" : "ستظهر محادثاتك هنا عند بدء التواصل مع العملاء"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation.id
                const unreadCount = optimisticUnreadCounts[conversation.id] ?? conversation.unread_count ?? 0
                const hasUnread = unreadCount > 0

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={cn(
                      "w-full p-4 text-right transition-all duration-200 hover:bg-gray-50 group relative",
                      isSelected && "bg-indigo-50 hover:bg-indigo-50 border-r-4 border-indigo-600"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with status indicator */}
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md",
                          isSelected ? "bg-indigo-600" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                        )}>
                          {conversation.customer_name?.charAt(0) || "؟"}
                        </div>
                        {/* Online status dot */}
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={cn(
                            "font-semibold text-base truncate",
                            hasUnread ? "text-gray-900" : "text-gray-700"
                          )}>
                            {conversation.customer_name || conversation.customer_phone}
                          </h3>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTimeAgo(conversation.last_message_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-500 truncate flex-1" dir="ltr">
                            {conversation.customer_phone}
                          </p>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {conversation.is_bot_active && (
                              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                <Bot className="h-3 w-3" />
                                <span className="text-[10px] font-medium">AI</span>
                              </div>
                            )}
                            {hasUnread && (
                              <div className="bg-indigo-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                {unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>

                    {/* Hover indicator */}
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-indigo-600 rounded-r-full transition-all duration-200",
                      !isSelected && "group-hover:h-8"
                    )} />
                  </button>
                )
              })}

              {/* Load More Conversations */}
              {hasMoreConversations && !searchQuery && (
                <div className="p-3">
                  <Button
                    variant="outline"
                    className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => fetchMoreConversations()}
                    disabled={loadingConversations}
                  >
                    {loadingConversations ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : null}
                    {loadingConversations ? "جاري التحميل..." : "تحميل المزيد"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Message Thread */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !showMobileMessages && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
            {/* Enhanced Chat Header - Fixed */}
            <div className="flex-shrink-0 h-[70px] bg-white px-6 flex items-center justify-between border-b border-gray-200 shadow-sm">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToConversations}
                  className="md:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>

                {/* Avatar */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                    {selectedConversation.customer_name?.charAt(0) || "؟"}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* Name and Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-gray-900 font-semibold text-base truncate">
                      {selectedConversation.customer_name || selectedConversation.customer_phone}
                    </h2>
                    {getBotStatus(selectedConversation.id) && (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-2 py-0.5 h-5 gap-1 shadow-sm">
                        <Bot className="h-3 w-3" />
                        نشط
                    </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium">متصل الآن</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500" dir="ltr">
                    {selectedConversation.customer_phone}
                    </span>
                  </div>
                </div>
                </div>
                
              {/* Bot Toggle Button */}
              <div className="flex items-center gap-3">
                {getBotStatus(selectedConversation.id) ? (
                  // Bot is Active - Show Stop Button
                  <Button
                    onClick={async () => {
                      try {
                        await handleToggleConversationBot(
                          selectedConversation.id, 
                          false
                        )
                      } catch (error) {
                        console.error("Failed to toggle bot:", error)
                      }
                    }}
                    disabled={togglingBot}
                    className={cn(
                      "h-10 px-4 shadow-md transition-all duration-200",
                      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                    )}
                  >
                    {togglingBot ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Bot className="h-4 w-4 ml-2" />
                    )}
                    <span className="font-medium">إيقاف البوت</span>
                  </Button>
                ) : (
                  // Bot is Stopped - Show Prominent Activate Button
                <Button
                  onClick={async () => {
                    try {
                      await handleToggleConversationBot(
                        selectedConversation.id, 
                          true
                      )
                    } catch (error) {
                      console.error("Failed to toggle bot:", error)
                    }
                  }}
                  disabled={togglingBot}
                    className={cn(
                      "h-11 px-6 shadow-lg transition-all duration-200 border-2",
                      "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
                      "text-white border-green-400 hover:shadow-green-500/50 hover:scale-105"
                    )}
                >
                  {togglingBot ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin ml-2" />
                        <span className="font-bold">جاري التفعيل...</span>
                      </>
                  ) : (
                    <>
                        <Bot className="h-5 w-5 ml-2 animate-pulse" />
                        <span className="font-bold text-base">تفعيل البوت الآن</span>
                    </>
                  )}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full h-10 w-10"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
              </div>
              
            {/* Messages - Takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageThread
                conversation={selectedConversation}
                messages={messages[selectedConversation.id] || []}
                loading={loadingMessages}
                sending={sendingMessage}
                onSendMessage={handleSendMessage}
                onSendMedia={handleSendMedia}
                onLoadOlder={() => loadOlderMessages(selectedConversation.id)}
                loadingOlder={loadingOlderMessages[selectedConversation.id] || false}
                hasMoreMessages={hasMoreMessages[selectedConversation.id] !== false}
              />
            </div>
            </>
          ) : (
          /* Enhanced Empty State */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center max-w-md px-6">
              <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
                  <MessageCircle className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-1.5 shadow-lg border border-gray-200">
                  <span className="text-xs font-medium text-indigo-600">Sufrah Chat</span>
                </div>
              </div>
              <h3 className="text-gray-900 text-2xl font-bold mb-3">واتساب للأعمال</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                اختر محادثة من القائمة لبدء المراسلة مع عملائك
              </p>
              <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>متصل</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5" />
                  <span>بوت ذكي</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>{stats.total} محادثة</span>
                </div>
              </div>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
