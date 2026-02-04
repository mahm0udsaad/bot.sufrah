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
  Loader2,
  Zap,
  Shield,
  X,
  ScrollText,
  Plus
} from "lucide-react"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"

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
    <div className="flex h-full w-full overflow-hidden bg-background" dir="rtl">
      {/* Left Sidebar - Conversation List */}
      <motion.div 
        initial={{ x: isRtl ? 20 : -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "w-full md:w-[380px] lg:w-[420px] bg-card flex flex-col border-l border-border z-20",
          showMobileMessages && "hidden md:flex"
        )}
      >
        {/* Modern Header with Stats - Fixed */}
        <div className="flex-shrink-0 bg-primary px-5 py-6 text-primary-foreground shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">المحادثات</h1>
                <p className="text-white/70 text-xs font-medium">{stats.total} محادثة نشطة</p>
              </div>
            </div>
            
            {/* Bot Status Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border",
                    stats.active > 0 
                      ? "bg-emerald-500/20 border-emerald-400/30" 
                      : "bg-amber-500/20 border-amber-400/30"
                  )}>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      stats.active > 0 ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )} />
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.active > 0 ? "البوت نشط في " + stats.active + " محادثة" : "البوت متوقف حالياً"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Stats Pills - Modern Glassmorphism */}
          <div className="flex gap-2">
            {[
              { label: "الإجمالي", value: stats.total },
              { label: "غير مقروء", value: stats.unread, highlight: stats.unread > 0 },
              { label: "بوت نشط", value: stats.active }
            ].map((s, i) => (
              <div key={i} className={cn(
                "flex-1 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 transition-all",
                s.highlight && "bg-white/20 border-white/30"
              )}>
                <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{s.label}</div>
                <div className="text-white text-lg font-black mt-0.5">{loadingRestaurant ? "..." : s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Search */}
        <div className="flex-shrink-0 px-4 py-4 bg-background/50 backdrop-blur-sm border-b border-border">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم العميل أو رقم الهاتف..."
              className="w-full bg-muted/50 border-transparent text-foreground placeholder:text-muted-foreground pr-10 h-11 rounded-2xl focus-visible:ring-primary focus-visible:bg-background shadow-inner transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingRestaurant || (conversations.length === 0 && loadingConversations) ? (
            <div className="divide-y divide-border/50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="h-3 w-12 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-48 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-6 shadow-inner">
                <MessageCircle className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-foreground font-bold text-xl mb-2">لا توجد محادثات</h3>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                {searchQuery ? "لم يتم العثور على نتائج للبحث الحالي." : "ستظهر محادثاتك هنا عند بدء التواصل مع العملاء عبر واتساب."}
              </p>
              {searchQuery && (
                <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-primary">
                  مسح البحث
                </Button>
              )}
            </div>
          ) : (
            <div className="py-2">
              <AnimatePresence initial={false}>
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedConversationId === conversation.id
                  const unreadCount = optimisticUnreadCounts[conversation.id] ?? conversation.unread_count ?? 0
                  const hasUnread = unreadCount > 0

                  return (
                    <motion.button
                      layout
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        "w-full px-4 py-3 text-right transition-all duration-300 relative group overflow-hidden",
                        isSelected 
                          ? "bg-primary/5 active:bg-primary/10" 
                          : "hover:bg-muted/50 active:bg-muted"
                      )}
                    >
                      {/* Selection Indicator */}
                      {isSelected && (
                        <motion.div 
                          layoutId="active-pill"
                          className="absolute right-0 top-3 bottom-3 w-1.5 bg-primary rounded-l-full z-10"
                        />
                      )}

                      <div className="flex items-center gap-4 relative z-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg transition-transform duration-300 group-hover:scale-105",
                            isSelected 
                              ? "bg-primary shadow-primary/20 rotate-3" 
                              : "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/10"
                          )}>
                            {conversation.customer_name?.charAt(0) || "؟"}
                          </div>
                          {/* Bot Indicator Badge */}
                          {conversation.is_bot_active && (
                            <div className="absolute -top-1 -left-1 bg-emerald-500 text-white p-1 rounded-lg border-2 border-card shadow-sm">
                              <Bot className="h-3 w-3" />
                            </div>
                          )}
                          {/* Unread Badge Overlay */}
                          {hasUnread && !isSelected && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 border-card">
                              {unreadCount}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h3 className={cn(
                              "font-bold text-base truncate transition-colors",
                              isSelected ? "text-primary" : (hasUnread ? "text-foreground" : "text-foreground/80")
                            )}>
                              {conversation.customer_name || conversation.customer_phone}
                            </h3>
                            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase">
                              {formatTimeAgo(conversation.last_message_at)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground/80 font-mono truncate" dir="ltr">
                              {conversation.customer_phone}
                            </p>
                            
                            {hasUnread && isSelected && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold h-5">
                                {unreadCount} جديد
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>

              {/* Load More */}
              {hasMoreConversations && !searchQuery && (
                <div className="p-4 mt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-primary hover:bg-primary/5 hover:text-primary rounded-xl border border-dashed border-primary/20"
                    onClick={() => fetchMoreConversations()}
                    disabled={loadingConversations}
                  >
                    {loadingConversations ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Plus className="h-4 w-4 ml-2" />
                    )}
                    {loadingConversations ? "جاري التحميل..." : "تحميل المزيد من المحادثات"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Right Side - Message Thread */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-muted/30",
        !showMobileMessages && "hidden md:flex"
      )}>
        {selectedConversation ? (
          <div className="flex flex-col h-full relative">
            {/* Enhanced Chat Header - Fixed */}
            <header className="flex-shrink-0 h-[80px] bg-background/80 backdrop-blur-md px-6 flex items-center justify-between border-b border-border shadow-sm z-10">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToConversations}
                  className="md:hidden text-muted-foreground hover:bg-muted rounded-full"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>

                {/* Avatar */}
                <div className="relative group cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-primary/20 transition-all">
                    {selectedConversation.customer_name?.charAt(0) || "؟"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-lg border-2 border-background shadow-sm"></div>
                </div>

                {/* Name and Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-foreground font-bold text-lg truncate">
                      {selectedConversation.customer_name || selectedConversation.customer_phone}
                    </h2>
                    {getBotStatus(selectedConversation.id) && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 h-5 gap-1">
                        <Bot className="h-3 w-3" />
                        الذكاء الاصطناعي نشط
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                      <span className="text-xs text-emerald-600 font-semibold tracking-wide uppercase">متصل</span>
                    </div>
                    <span className="text-muted-foreground/30 font-light">|</span>
                    <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                      {selectedConversation.customer_phone}
                    </span>
                  </div>
                </div>
              </div>
                
              {/* Actions Area */}
              <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                  {getBotStatus(selectedConversation.id) ? (
                    <motion.div
                      key="stop-bot"
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    >
                      <Button
                        onClick={async () => {
                          try {
                            await handleToggleConversationBot(selectedConversation.id, false)
                          } catch (error) {}
                        }}
                        disabled={togglingBot}
                        variant="outline"
                        className="h-11 px-5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-2xl shadow-sm transition-all font-bold gap-2"
                      >
                        {togglingBot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                        <span>إيقاف البوت الذكي</span>
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="start-bot"
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    >
                      <Button
                        onClick={async () => {
                          try {
                            await handleToggleConversationBot(selectedConversation.id, true)
                          } catch (error) {}
                        }}
                        disabled={togglingBot}
                        className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 transition-all font-bold gap-2 border-b-4 border-primary/20 active:border-b-0 active:translate-y-1"
                      >
                        {togglingBot ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="relative">
                            <Bot className="h-5 w-5 animate-bounce" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
                          </div>
                        )}
                        <span>تفعيل البوت الذكي</span>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted rounded-2xl h-11 w-11 transition-colors">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border">
                    <DropdownMenuItem className="rounded-xl p-3 gap-3 cursor-pointer">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">تفاصيل العميل</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl p-3 gap-3 cursor-pointer">
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">سجل الطلبات</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem className="rounded-xl p-3 gap-3 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                      <X className="h-4 w-4" />
                      <span className="font-bold">إغلاق المحادثة</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
              
            {/* Messages - Takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
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
          </div>
        ) : (
          /* Enhanced Empty State */
          <div className="flex-1 flex items-center justify-center bg-muted/20 relative overflow-hidden p-8">
            {/* Background Decorations */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-700"></div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-lg relative z-10"
            >
              <div className="relative mb-10 inline-block">
                <div className="w-40 h-40 mx-auto rounded-[40px] bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3">
                  <MessageCircle className="w-20 h-20 text-white -rotate-3" />
                </div>
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-4 -right-4 bg-background border border-border rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3"
                >
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-black text-foreground uppercase tracking-wider">نظام سفره المتكامل</span>
                </motion.div>
              </div>
              <h3 className="text-foreground text-3xl font-black mb-4 tracking-tight">مركز إدارة المحادثات</h3>
              <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-md mx-auto">
                قم باختيار محادثة من القائمة الجانبية للبدء في الرد على استفسارات عملائك أو إدارة طلباتهم عبر واتساب.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Zap, label: "استجابة سريعة", color: "text-amber-500", bg: "bg-amber-50" },
                  { icon: Bot, label: "ذكاء اصطناعي", color: "text-emerald-500", bg: "bg-emerald-50" },
                  { icon: Shield, label: "آمن وموثوق", color: "text-blue-500", bg: "bg-blue-50" }
                ].map((feature, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-background border border-border shadow-sm">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", feature.bg)}>
                      <feature.icon className={cn("w-5 h-5", feature.color)} />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{feature.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
