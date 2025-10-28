"use client"

import { useState, useEffect, useRef } from "react"
import { TemplateMessage } from "./TemplateMessage"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Send, 
  Image as ImageIcon, 
  FileText, 
  Mic, 
  MapPin, 
  Loader2, 
  Paperclip, 
  X,
  Smile,
  Plus
} from "lucide-react"
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
    contentType: "text" | "quick-reply" | "card" | "list-picker" | string
    buttons: Array<{
      type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE" | string
      title: string
      id?: string
      url?: string
      phone_number?: string
    }>
  }
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [animatingMessageIds, setAnimatingMessageIds] = useState<Set<string>>(new Set())
  const previousMessageIdsRef = useRef<Set<string>>(new Set())

  // Detect new messages and trigger animations
  useEffect(() => {
    const currentMessageIds = new Set(messages.map(m => m.id))
    const newMessageIds = new Set<string>()
    
    currentMessageIds.forEach(id => {
      if (!previousMessageIdsRef.current.has(id)) {
        newMessageIds.add(id)
      }
    })
    
    if (newMessageIds.size > 0) {
      setAnimatingMessageIds(newMessageIds)
      
      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setAnimatingMessageIds(new Set())
      }, 500)
      
      return () => clearTimeout(timer)
    }
    
    previousMessageIdsRef.current = currentMessageIds
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Reset when conversation changes
  useEffect(() => {
    previousMessageIdsRef.current = new Set()
    setAnimatingMessageIds(new Set())
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }, 100)
  }, [conversation.id])

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
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
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
        return <ImageIcon className="h-3 w-3" />
      case "document":
        return <FileText className="h-3 w-3" />
      case "audio":
        return <Mic className="h-3 w-3" />
      default:
        return null
    }
  }

  const renderMessageContent = (message: BotMessage) => {
    // Render WhatsApp template preview
    if (message.message_type === "template" && message.template_preview) {
      return (
        <div className="space-y-2">
          <div className="font-medium text-sm">{message.content}</div>
          <TemplateMessage
            template={{
              sid: message.template_preview.sid,
              friendlyName: message.template_preview.friendlyName,
              language: message.template_preview.language,
              body: message.template_preview.body,
              contentType: message.template_preview.contentType,
              buttons: message.template_preview.buttons || [],
            }}
            createdAt={message.timestamp}
            direction={message.is_from_customer ? "in" : "out"}
          />
        </div>
      )
    }

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
              alt={message.content}
              className="rounded-xl max-w-sm w-full h-auto shadow-md"
            />
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        )
      } else if (message.message_type === "video") {
        return (
          <div className="space-y-2">
            <video controls className="rounded-xl max-w-sm w-full h-auto shadow-md">
              <source src={message.media_url} />
            </video>
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        )
      } else if (message.message_type === "audio") {
        return (
          <div className="space-y-2">
            <audio controls className="w-full">
              <source src={message.media_url} />
            </audio>
            {message.content && <p className="text-sm">{message.content}</p>}
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
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        )
      }
    }

    // Text messages
    return <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.timestamp), "yyyy-MM-dd")
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, BotMessage[]>)

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return "اليوم"
    if (isYesterday(date)) return "أمس"
    return format(date, "dd MMMM yyyy", { locale: ar })
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#efeae2]" dir="rtl">
      {/* Messages Area - with proper padding and scroll */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-4 min-h-0"
        style={{
          backgroundImage: `url("/bg.png")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-gray-700 font-medium">جاري تحميل الرسائل...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-2xl shadow-lg px-8 py-6 text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-gray-900 font-semibold text-lg mb-2">ابدأ المحادثة</h3>
              <p className="text-gray-500 text-sm">أرسل رسالتك الأولى لبدء التواصل مع العميل</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date} className="space-y-3">
                {/* Date separator */}
                <div className="flex items-center justify-center py-2">
                  <div className="bg-white/90 backdrop-blur-sm shadow-sm px-4 py-1.5 rounded-full">
                    <span className="text-xs font-medium text-gray-600">{formatDateHeader(date)}</span>
                  </div>
                </div>

                {/* Messages */}
                {msgs.map((message, idx) => {
                  const isCustomer = message.is_from_customer
                  const showAvatar = idx === 0 || msgs[idx - 1].is_from_customer !== isCustomer
                  const isAnimating = animatingMessageIds.has(message.id)

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2 items-end",
                        isCustomer ? "justify-start" : "justify-end",
                        isAnimating && (isCustomer ? "animate-slide-in-left" : "animate-slide-in-right")
                      )}
                    >
                      {/* Customer avatar placeholder */}
                      {isCustomer && (
                        <div className={cn(
                          "w-8 h-8 flex-shrink-0",
                          !showAvatar && "opacity-0"
                        )}>
                          {showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-700">
                                {conversation.customer_name?.charAt(0) || "؟"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          "max-w-[75%] md:max-w-[65%] rounded-xl px-3 py-2 shadow-md",
                          isCustomer
                            ? "bg-white text-gray-900 rounded-br-sm"
                            : "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-bl-sm"
                        )}
                      >
                        {renderMessageContent(message)}
                        <div
                          className={cn(
                            "text-[10px] mt-1 flex items-center gap-1 justify-end",
                            isCustomer ? "text-gray-500" : "text-white/70"
                          )}
                        >
                          <span>{formatMessageTime(message.timestamp)}</span>
                          {getMessageIcon(message.message_type)}
                          {!isCustomer && (
                            <svg width="16" height="11" viewBox="0 0 16 11" className="inline ml-1">
                              <path fill="currentColor" d="M11.071.653a.75.75 0 0 0-1.06 1.06l3.182 3.183H.75a.75.75 0 0 0 0 1.5h12.443l-3.182 3.182a.75.75 0 1 0 1.06 1.06l4.5-4.5a.75.75 0 0 0 0-1.06l-4.5-4.5z"/>
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Agent avatar placeholder */}
                      {!isCustomer && (
                        <div className={cn(
                          "w-8 h-8 flex-shrink-0",
                          !showAvatar && "opacity-0"
                        )}>
                          {showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                              <span className="text-xs font-semibold text-white">S</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Input Area at bottom */}
      <div className="flex-shrink-0 bg-[#f0f2f5] px-4 py-3 border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  {selectedFile.type.startsWith("image/") ? (
                    <ImageIcon className="h-6 w-6 text-indigo-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelectedFile}
                disabled={uploading}
                className="flex-shrink-0 h-8 w-8 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Input Row */}
          <div className="flex gap-2 items-end">
            {/* Attach button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              className="h-11 w-11 rounded-full bg-white hover:bg-gray-100 shadow-sm flex-shrink-0"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Text input */}
            <div className="flex-1 bg-white rounded-full shadow-sm flex items-end overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 flex-shrink-0 rounded-full"
              >
                <Smile className="h-5 w-5 text-gray-500" />
              </Button>
              
              <Textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value)
                  // Auto-resize
                  e.target.style.height = "auto"
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                }}
                onKeyDown={handleKeyDown}
                placeholder={selectedFile ? "أضف تعليقاً..." : "اكتب رسالة..."}
                className="resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[44px] max-h-[120px] py-3 px-0 shadow-none bg-transparent"
                disabled={sending || uploading}
                rows={1}
              />
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={(!messageText.trim() && !selectedFile) || sending || uploading}
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full shadow-lg flex-shrink-0 transition-all",
                (!messageText.trim() && !selectedFile)
                  ? "bg-gray-300 hover:bg-gray-400"
                  : "bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
              )}
            >
              {(sending || uploading) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-gray-500 mt-2 text-center hidden md:block">
            {selectedFile 
              ? `جاهز للإرسال • ${selectedFile.name}`
              : "Enter للإرسال • Shift+Enter لسطر جديد"}
          </p>
        </div>
      </div>
    </div>
  )
}
