"use client"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Send, Image, FileText, Mic, MapPin, Loader2, Phone, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { ar } from "date-fns/locale"

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

interface MessageThreadProps {
  conversation: BotConversation
  messages: BotMessage[]
  loading: boolean
  sending: boolean
  onSendMessage: (text: string) => void
}

export function MessageThread({ conversation, messages, loading, sending, onSendMessage }: MessageThreadProps) {
  const [messageText, setMessageText] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, shouldAutoScroll])

  // Reset scroll when conversation changes
  useEffect(() => {
    setShouldAutoScroll(true)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }, 100)
  }, [conversation.id])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100
    setShouldAutoScroll(isNearBottom)
  }

  const handleSend = () => {
    if (!messageText.trim() || sending) return
    onSendMessage(messageText)
    setMessageText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, "HH:mm", { locale: ar })
    } else if (isYesterday(date)) {
      return `أمس ${format(date, "HH:mm", { locale: ar })}`
    } else {
      return format(date, "dd MMM HH:mm", { locale: ar })
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <Mic className="h-4 w-4" />
      default:
        return null
    }
  }

  const renderMessageContent = (message: BotMessage) => {
    // Handle location messages
    if (message.content.startsWith("📍")) {
      return (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{message.content}</span>
        </div>
      )
    }

    // Handle media messages
    if (message.media_url) {
      if (message.message_type === "image") {
        return (
          <div className="space-y-2">
            <img
              src={message.media_url}
              alt="رسالة صورة"
              className="rounded-lg max-w-sm w-full h-auto"
            />
            {message.content && <p>{message.content}</p>}
          </div>
        )
      } else {
        return (
          <div className="space-y-2">
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              {getMessageIcon(message.message_type)}
              <span>عرض الملف</span>
            </a>
            {message.content && <p>{message.content}</p>}
          </div>
        )
      }
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">
              {conversation.customer_name || conversation.customer_phone}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span dir="ltr">{conversation.customer_phone}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={conversation.status === "active" ? "default" : "secondary"}>
              {conversation.status === "active" ? "نشط" : "مغلق"}
            </Badge>
            {conversation.is_bot_active && (
              <Badge variant="outline" className="text-xs">
                البوت نشط
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" onScrollCapture={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <p>لا توجد رسائل</p>
              <p className="text-sm mt-2">ابدأ المحادثة بإرسال رسالة</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.is_from_customer ? "justify-start" : "justify-end"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    message.is_from_customer
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {renderMessageContent(message)}
                  <div
                    className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      message.is_from_customer
                        ? "text-secondary-foreground/70"
                        : "text-primary-foreground/70"
                    )}
                  >
                    {getMessageIcon(message.message_type)}
                    <span>{formatMessageTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك..."
            className="resize-none min-h-[60px] max-h-[120px]"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          اضغط Enter للإرسال، Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  )
}

