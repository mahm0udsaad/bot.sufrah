"use client"

import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from "react"
import { botApi, type Conversation, type Message, type BotStatus } from "@/lib/bot-api"

interface ChatState {
  conversations: Conversation[]
  messages: Record<string, Message[]>
  selectedConversationId: string | null
  botStatus: BotStatus
  loading: {
    conversations: boolean
    messages: boolean
    sendingMessage: boolean
    botToggle: boolean
  }
  connected: boolean
  error: string | null
}

type ChatAction =
  | { type: "SET_LOADING"; payload: { key: keyof ChatState["loading"]; value: boolean } }
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "SET_MESSAGES"; payload: { conversationId: string; messages: Message[] } }
  | { type: "ADD_MESSAGE"; payload: { conversationId: string; message: Message } }
  | { type: "UPDATE_CONVERSATION"; payload: Conversation }
  | { type: "SET_SELECTED_CONVERSATION"; payload: string | null }
  | { type: "SET_BOT_STATUS"; payload: BotStatus }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_OPTIMISTIC_MESSAGE"; payload: { conversationId: string; message: Message } }
  | { type: "REMOVE_OPTIMISTIC_MESSAGE"; payload: { conversationId: string; messageId: string } }
  | { type: "REPLACE_OPTIMISTIC_MESSAGE"; payload: { conversationId: string; tempId: string; message: Message } }

const initialState: ChatState = {
  conversations: [],
  messages: {},
  selectedConversationId: null,
  botStatus: { enabled: true },
  loading: {
    conversations: false,
    messages: false,
    sendingMessage: false,
    botToggle: false,
  },
  connected: false,
  error: null,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value },
      }

    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload }

    case "SET_MESSAGES":
      return {
        ...state,
        messages: { ...state.messages, [action.payload.conversationId]: action.payload.messages },
      }

    case "ADD_MESSAGE": {
      const { conversationId, message } = action.payload;
      const messageKey = message.id || `${message.timestamp}-${message.content}`;
      const existingMessages = state.messages[conversationId] || [];
      const messageExists = existingMessages.some((msg) => {
        const existingKey = msg.id || `${msg.timestamp}-${msg.content}`;
        return existingKey === messageKey;
      });
      const updatedMessages = messageExists
        ? existingMessages.map((msg) => {
            const existingKey = msg.id || `${msg.timestamp}-${msg.content}`;
            return existingKey === messageKey ? message : msg;
          })
        : [...existingMessages, message];

      const unreadShouldIncrement = message.is_from_customer && !messageExists;

      const updatedConversations = state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              last_message_at: message.timestamp,
              unread_count: unreadShouldIncrement ? conv.unread_count + 1 : conv.unread_count,
            }
          : conv,
      );

      updatedConversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
        conversations: updatedConversations,
      };
    }

    case "UPDATE_CONVERSATION": {
      const exists = state.conversations.some((conv) => conv.id === action.payload.id);
      const updatedConversations = exists
        ? state.conversations.map((conv) => (conv.id === action.payload.id ? action.payload : conv))
        : [action.payload, ...state.conversations];

      updatedConversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      return {
        ...state,
        conversations: updatedConversations,
      };
    }

    case "SET_SELECTED_CONVERSATION":
      return {
        ...state,
        selectedConversationId: action.payload,
        conversations: state.conversations.map((conv) =>
          conv.id === action.payload
            ? { ...conv, unread_count: 0 }
            : conv
        ),
      };

    case "SET_BOT_STATUS":
      return { ...state, botStatus: action.payload }

    case "SET_CONNECTED":
      return { ...state, connected: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload }

    case "ADD_OPTIMISTIC_MESSAGE":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [
            ...(state.messages[action.payload.conversationId] || []),
            action.payload.message,
          ],
        },
      }

    case "REMOVE_OPTIMISTIC_MESSAGE":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (state.messages[action.payload.conversationId] || []).filter(
            (msg) => msg.id !== action.payload.messageId,
          ),
        },
      }

    case "REPLACE_OPTIMISTIC_MESSAGE":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (state.messages[action.payload.conversationId] || []).map((msg) =>
            msg.id === action.payload.tempId ? action.payload.message : msg,
          ),
        },
      }

    default:
      return state
  }
}

interface ChatContextType extends ChatState {
  selectConversation: (id: string) => void
  sendMessage: (content: string) => Promise<void>
  toggleBot: (enabled: boolean) => Promise<void>
  refetchConversations: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const lastMessageRef = useRef<string | null>(null)

  useEffect(() => {
    const fallbackConversations = [
      {
        id: "conv-1",
        customer_phone: "+201234567890",
        customer_name: "Ahmed Hassan",
        status: "active" as const,
        last_message_at: new Date().toISOString(),
        unread_count: 2,
        is_bot_active: true,
      },
      {
        id: "conv-2",
        customer_phone: "+201987654321",
        customer_name: "Sara Mohamed",
        status: "active" as const,
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 0,
        is_bot_active: true,
      },
    ]
    dispatch({ type: "SET_CONVERSATIONS", payload: fallbackConversations })

    // Fetch real data in background
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      dispatch({ type: "SET_ERROR", payload: null })
      const conversations = await botApi.fetchConversations()
      dispatch({ type: "SET_CONVERSATIONS", payload: conversations })
    } catch (error) {
      console.error("[v0] Failed to fetch conversations:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load conversations" })
    }
  }

  const selectConversation = async (id: string) => {
    dispatch({ type: "SET_SELECTED_CONVERSATION", payload: id })

    // If messages already cached, don't show loading
    if (!state.messages[id]) {
      dispatch({ type: "SET_LOADING", payload: { key: "messages", value: true } })
    }

    try {
      const messages = await botApi.fetchMessages(id)
      dispatch({ type: "SET_MESSAGES", payload: { conversationId: id, messages } })
    } catch (error) {
      console.error("[v0] Failed to fetch messages:", error)
      dispatch({ type: "SET_ERROR", payload: "Failed to load messages" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: { key: "messages", value: false } })
    }
  }

  const sendMessage = async (content: string) => {
    if (!state.selectedConversationId) return

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: state.selectedConversationId,
      from_phone: "",
      to_phone: "",
      message_type: "text",
      content,
      media_url: null,
      timestamp: new Date().toISOString(),
      is_from_customer: false,
    }

    dispatch({
      type: "ADD_OPTIMISTIC_MESSAGE",
      payload: { conversationId: state.selectedConversationId, message: optimisticMessage },
    })

    try {
      const actualMessage = await botApi.sendMessage(state.selectedConversationId, content)
      dispatch({
        type: "REPLACE_OPTIMISTIC_MESSAGE",
        payload: {
          conversationId: state.selectedConversationId,
          tempId: optimisticMessage.id,
          message: actualMessage,
        },
      })
    } catch (error) {
      dispatch({
        type: "REMOVE_OPTIMISTIC_MESSAGE",
        payload: { conversationId: state.selectedConversationId, messageId: optimisticMessage.id },
      })
      throw error
    }
  }

  const toggleBot = async (enabled: boolean) => {
    dispatch({ type: "SET_LOADING", payload: { key: "botToggle", value: true } })
    try {
      const newStatus = await botApi.toggleBot(enabled)
      dispatch({ type: "SET_BOT_STATUS", payload: newStatus })
    } catch (error) {
      console.error("[v0] Failed to toggle bot:", error)
      throw error
    } finally {
      dispatch({ type: "SET_LOADING", payload: { key: "botToggle", value: false } })
    }
  }

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = botApi.connectWebSocket()
      if (!ws) return

      wsRef.current = ws

      ws.onopen = () => {
        console.log("[v0] Bot WebSocket connected")
        dispatch({ type: "SET_CONNECTED", payload: true })
      }

      ws.onmessage = (event) => {
        if (event.data === "pong") {
          console.log("[v0] Bot WebSocket pong received")
          return
        }

        try {
          const data = JSON.parse(event.data)
          const payload = data?.data ?? data?.message ?? data?.conversation ?? data?.status

          console.log("[v0] Bot WebSocket message:", data)

          const serialized = JSON.stringify(data)
          if (lastMessageRef.current === serialized) {
            return
          }
          lastMessageRef.current = serialized

          switch (data.type) {
            case "message.created":
            case "message.updated":
            case "message_update":
              if (payload?.conversation_id) {
                dispatch({
                  type: "ADD_MESSAGE",
                  payload: { conversationId: payload.conversation_id, message: payload },
                })
              }
              break
            case "conversation.updated":
            case "conversation_update":
              if (payload) {
                dispatch({ type: "UPDATE_CONVERSATION", payload })
              }
              break
            case "bot.status.updated":
            case "bot_status_update":
              if (payload) {
                dispatch({ type: "SET_BOT_STATUS", payload })
              }
              break
          }
        } catch (error) {
          console.error("[v0] Failed to parse WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        console.log("[v0] Bot WebSocket disconnected")
        dispatch({ type: "SET_CONNECTED", payload: false })
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000)
      }

      ws.onerror = (error) => {
        console.error("[v0] Bot WebSocket error:", error)
        dispatch({ type: "SET_CONNECTED", payload: false })
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const contextValue: ChatContextType = {
    ...state,
    selectConversation,
    sendMessage,
    toggleBot,
    refetchConversations: fetchConversations,
  }

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
