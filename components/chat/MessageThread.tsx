"use client"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Send, Image, FileText, Mic, MapPin, Loader2, Phone, User, Paperclip, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { ar } from "date-fns/locale"
import { toast } from "sonner"

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
  onSendMedia?: (file: File, caption?: string) => Promise<void>
}

export function MessageThread({ conversation, messages, loading, sending, onSendMessage, onSendMedia }: MessageThreadProps) {
  const [messageText, setMessageText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleSend = async () => {
    if (uploading) return

    // Send media if file is selected
    if (selectedFile && onSendMedia) {
      try {
        setUploading(true)
        await onSendMedia(selectedFile, messageText || undefined)
        setSelectedFile(null)
        setMessageText("")
        toast.success("تم إرسال الملف بنجاح")
      } catch (error) {
        console.error("Failed to send media:", error)
        toast.error("فشل إرسال الملف")
      } finally {
        setUploading(false)
      }
      return
    }

    // Send text message
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 16MB)
    const maxSize = 16 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى 16 ميجابايت")
      return
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم")
      return
    }

    setSelectedFile(file)
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
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
      } else if (message.message_type === "video") {
        return (
          <div className="space-y-2">
            <video controls className="rounded-lg max-w-sm w-full h-auto">
              <source src={message.media_url} />
            </video>
            {message.content && <p>{message.content}</p>}
          </div>
        )
      } else if (message.message_type === "audio") {
        return (
          <div className="space-y-2">
            <audio controls className="w-full">
              <source src={message.media_url} />
            </audio>
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
      <div className="overflow-y-scroll flex-1 p-4" onScrollCapture={handleScroll}>
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
          <div className="overflow-y-scroll space-y-4">
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
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedFile.type.startsWith("image/") ? (
                <Image className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelectedFile}
              disabled={uploading}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              title="إرفاق ملف"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? "تعليق اختياري..." : "اكتب رسالتك..."}
            className="resize-none min-h-[60px] max-h-[120px]"
            disabled={sending || uploading}
          />
          
          <Button
            onClick={handleSend}
            disabled={(!messageText.trim() && !selectedFile) || sending || uploading}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            {(sending || uploading) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          {selectedFile 
            ? `جاهز للإرسال: ${selectedFile.name}`
            : "اضغط Enter للإرسال، Shift+Enter لسطر جديد"}
        </p>
        
        {onSendMedia && (
          <p className="text-xs text-muted-foreground mt-1">
            يمكنك إرفاق صور أو مستندات (حتى 16 ميجابايت)
          </p>
        )}
      </div>
    </div>
  )
}

