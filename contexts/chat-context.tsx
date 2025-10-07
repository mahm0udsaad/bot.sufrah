"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRealtime } from "@/contexts/realtime-context"
import { toast } from "sonner"

interface Conversation {
  id: string
  customerWa: string
  customerName?: string | null
  status: "OPEN" | "CLOSED"
  lastMessageAt: string
  unreadCount: number
}

interface ChatMessage {
  id: string
  conversationId: string
  direction: "IN" | "OUT"
  body: string
  mediaUrl?: string | null
  createdAt: string
}

interface BotStatusState {
  enabled: boolean
  lastSyncedAt?: string
}

interface ChatState {
  restaurantId: string | null
  conversations: Conversation[]
  messages: Record<string, ChatMessage[]>
  selectedConversationId: string | null
  botStatus: BotStatusState
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean
  error: string | null
}

type ChatAction =
  | { type: "SET_RESTAURANT"; payload: string }
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "UPSERT_CONVERSATION"; payload: Conversation }
  | { type: "SET_MESSAGES"; payload: { conversationId: string; messages: ChatMessage[] } }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "SET_SELECTED"; payload: string | null }
  | { type: "SET_BOT_STATUS"; payload: BotStatusState }
  | { type: "SET_LOADING_CONVERSATIONS"; payload: boolean }
  | { type: "SET_LOADING_MESSAGES"; payload: boolean }
  | { type: "SET_SENDING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }

const initialState: ChatState = {
  restaurantId: null,
  conversations: [],
  messages: {},
  selectedConversationId: null,
  botStatus: { enabled: false },
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_RESTAURANT":
      return { ...state, restaurantId: action.payload }
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload }
    case "UPSERT_CONVERSATION": {
      const existingIndex = state.conversations.findIndex((conv) => conv.id === action.payload.id)
      const updated = [...state.conversations]
      if (existingIndex >= 0) {
        updated[existingIndex] = action.payload
      } else {
        updated.unshift(action.payload)
      }
      updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      return { ...state, conversations: updated }
    }
    case "SET_MESSAGES":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      }
    case "ADD_MESSAGE": {
      const messages = state.messages[action.payload.conversationId] ?? []
      const exists = messages.some((msg) => msg.id === action.payload.id)
      const nextMessages = exists ? messages : [...messages, action.payload]
      nextMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      const updatedConversations = state.conversations.map((conv) =>
        conv.id === action.payload.conversationId
          ? {
              ...conv,
              lastMessageAt: action.payload.createdAt,
              unreadCount:
                state.selectedConversationId === conv.id || action.payload.direction === "OUT"
                  ? conv.unreadCount
                  : conv.unreadCount + 1,
            }
          : conv,
      )

      updatedConversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

      return {
        ...state,
        conversations: updatedConversations,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: nextMessages,
        },
      }
    }
    case "SET_SELECTED":
      return {
        ...state,
        selectedConversationId: action.payload,
        conversations: state.conversations.map((conv) =>
          conv.id === action.payload ? { ...conv, unreadCount: 0 } : conv,
        ),
      }
    case "SET_BOT_STATUS":
      return { ...state, botStatus: action.payload }
    case "SET_LOADING_CONVERSATIONS":
      return { ...state, isLoadingConversations: action.payload }
    case "SET_LOADING_MESSAGES":
      return { ...state, isLoadingMessages: action.payload }
    case "SET_SENDING":
      return { ...state, isSendingMessage: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    default:
      return state
  }
}

interface ChatContextValue extends ChatState {
  selectConversation: (id: string | null) => void
  refreshConversations: () => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

function normalizeConversation(data: any): Conversation {
  const customerWa: string = data.customerWa || data.customer_wa || data.customerPhone || data.customer_phone || ""
  const lastMessageAt: string = data.lastMessageAt || data.last_message_at || new Date().toISOString()
  const status: "OPEN" | "CLOSED" = (data.status || "OPEN").toUpperCase() === "CLOSED" ? "CLOSED" : "OPEN"
  const unreadCount: number = typeof data.unreadCount === "number" ? data.unreadCount : data.unread_count ?? 0
  return {
    id: data.id,
    customerWa,
    customerName: data.customerName || data.customer_name || null,
    status,
    lastMessageAt,
    unreadCount,
  }
}

function normalizeMessage(data: any): ChatMessage {
  const rawDirection = (data.direction || data.sender_type || "OUT").toString().toUpperCase()
  const direction: "IN" | "OUT" = rawDirection === "IN" || rawDirection === "CUSTOMER" ? "IN" : "OUT"

  return {
    id: data.id,
    conversationId: data.conversationId || data.conversation_id,
    direction,
    body: data.body || data.content || "",
    mediaUrl: data.mediaUrl || data.media_url || null,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const { restaurantId: realtimeRestaurantId, subscribeToMessages } = useRealtime()
  const isInitialisedRef = useRef(false)

  const fetchRestaurant = useCallback(async () => {
    const res = await fetch("/api/restaurant/profile", { cache: "no-store" })
    if (!res.ok) {
      throw new Error("Failed to load restaurant profile")
    }
    const restaurant = await res.json()
    dispatch({ type: "SET_RESTAURANT", payload: restaurant.id })
    return restaurant.id as string
  }, [])

  const loadBotStatus = useCallback(async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/onboarding/whatsapp?restaurantId=${restaurantId}`, { cache: "no-store" })
      if (!response.ok) {
        return
      }
      const payload = await response.json()
      if (payload?.bot) {
        dispatch({
          type: "SET_BOT_STATUS",
          payload: {
            enabled: (payload.bot.status || "PENDING").toUpperCase() === "ACTIVE",
            lastSyncedAt: payload.bot.updatedAt ?? payload.bot.createdAt,
          },
        })
      }
    } catch (err) {
      console.warn("Failed to load bot status", err)
    }
  }, [])

  const loadConversations = useCallback(async () => {
      dispatch({ type: "SET_LOADING_CONVERSATIONS", payload: true })
      try {
        const res = await fetch(`/api/conversations?take=50`, { cache: "no-store" })
        if (!res.ok) {
          throw new Error("Failed to load conversations")
        }
        const payload = await res.json()
        const conversations = (payload.conversations || payload || []).map(normalizeConversation)
        dispatch({ type: "SET_CONVERSATIONS", payload: conversations })
      } catch (err) {
        console.error("Load conversations error", err)
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to load conversations" })
      } finally {
        dispatch({ type: "SET_LOADING_CONVERSATIONS", payload: false })
      }
    }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return
    dispatch({ type: "SET_LOADING_MESSAGES", payload: true })
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}&take=100`, { cache: "no-store" })
      if (!res.ok) {
        throw new Error("Failed to load messages")
      }
      const payload = await res.json()
      const messages = (payload.messages || payload || []).map(normalizeMessage)
      dispatch({ type: "SET_MESSAGES", payload: { conversationId, messages } })
    } catch (err) {
      console.error("Load messages error", err)
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to load messages" })
    } finally {
      dispatch({ type: "SET_LOADING_MESSAGES", payload: false })
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    try {
      if (!state.restaurantId && realtimeRestaurantId) {
        dispatch({ type: "SET_RESTAURANT", payload: realtimeRestaurantId })
      }

      const rid = state.restaurantId || realtimeRestaurantId
      if (!rid) {
        return
      }
      await loadConversations()
    } catch (err) {
      console.error("Refresh conversations error", err)
    }
  }, [loadConversations, realtimeRestaurantId, state.restaurantId])

  const selectConversation = useCallback(
    async (conversationId: string | null) => {
      dispatch({ type: "SET_SELECTED", payload: conversationId })
      if (conversationId) {
        await loadMessages(conversationId)
      }
    },
    [loadMessages],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!state.restaurantId || !state.selectedConversationId) {
        throw new Error("Conversation not selected")
      }

      dispatch({ type: "SET_SENDING", payload: true })
      const tempId = `temp-${Date.now()}`
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: tempId,
          conversationId: state.selectedConversationId,
          direction: "OUT",
          body: text,
          createdAt: new Date().toISOString(),
        },
      })

      try {
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId: state.restaurantId,
            conversationId: state.selectedConversationId,
            text,
          }),
        })

        if (!res.ok) {
          throw new Error("Failed to send message")
        }

        await loadMessages(state.selectedConversationId)
      } catch (err) {
        console.error("Send message error", err)
        toast.error("Failed to send message")
        await loadMessages(state.selectedConversationId)
      } finally {
        dispatch({ type: "SET_SENDING", payload: false })
      }
    },
    [loadMessages, state.restaurantId, state.selectedConversationId],
  )

  useEffect(() => {
    if (isInitialisedRef.current) {
      return
    }

    isInitialisedRef.current = true

    const initialise = async () => {
      try {
        const rid = await fetchRestaurant()
        await Promise.all([loadConversations(), loadBotStatus(rid)])
      } catch (err) {
        console.error("Chat initialise error", err)
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to initialise chat" })
      }
    }

    void initialise()
  }, [fetchRestaurant, loadBotStatus, loadConversations])

  useEffect(() => {
    const unsubscribe = subscribeToMessages((payload) => {
      try {
        const message = payload.message ? normalizeMessage(payload.message) : normalizeMessage(payload)
        dispatch({ type: "ADD_MESSAGE", payload: message })

        if (payload.conversation) {
          const conversation = normalizeConversation(payload.conversation)
          dispatch({ type: "UPSERT_CONVERSATION", payload: conversation })
        } else {
          const conversation = state.conversations.find((conv) => conv.id === message.conversationId)
          if (conversation) {
            dispatch({
              type: "UPSERT_CONVERSATION",
              payload: {
                ...conversation,
                lastMessageAt: message.createdAt,
                unreadCount:
                  state.selectedConversationId === conversation.id || message.direction === "OUT"
                    ? conversation.unreadCount
                    : conversation.unreadCount + 1,
              },
            })
          }
        }
      } catch (err) {
        console.error("Realtime message handling failed", err)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [state.conversations, state.selectedConversationId, subscribeToMessages])

  const value = useMemo<ChatContextValue>(
    () => ({
      ...state,
      selectConversation,
      refreshConversations,
      loadMessages,
      sendMessage,
    }),
    [loadMessages, refreshConversations, selectConversation, sendMessage, state],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
