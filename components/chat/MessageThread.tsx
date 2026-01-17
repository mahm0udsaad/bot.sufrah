"use client"

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
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
  X,
  Smile,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { ar } from "date-fns/locale"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

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
  onLoadOlder?: () => Promise<void>
  loadingOlder?: boolean
  hasMoreMessages?: boolean
}

export function MessageThread({ 
  conversation, 
  messages, 
  loading, 
  sending, 
  onSendMessage, 
  onSendMedia,
  onLoadOlder,
  loadingOlder = false,
  hasMoreMessages = true
}: MessageThreadProps) {
  const [messageText, setMessageText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [animatingMessageIds, setAnimatingMessageIds] = useState<Set<string>>(new Set())
  const previousMessageIdsRef = useRef<Set<string>>(new Set())
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const messagesStartRef = useRef<HTMLDivElement>(null)

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

  // Detect scroll to top for infinite scroll
  useEffect(() => {
    if (!onLoadOlder) return
    
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // Load more when scrolled near top (within 200px)
      if (container.scrollTop < 200 && hasMoreMessages && !loadingOlder) {
        onLoadOlder()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [onLoadOlder, hasMoreMessages, loadingOlder])

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

  const insertEmojiAtCursor = useCallback((emoji: string) => {
    const input = textareaRef.current
    if (!input) {
      setMessageText((prev) => prev + emoji)
      return
    }
    const start = input.selectionStart ?? messageText.length
    const end = input.selectionEnd ?? messageText.length
    const next = messageText.slice(0, start) + emoji + messageText.slice(end)
    setMessageText(next)
    requestAnimationFrame(() => {
      input.focus()
      const cursor = start + emoji.length
      input.setSelectionRange(cursor, cursor)
      input.style.height = "auto"
      input.style.height = Math.min(input.scrollHeight, 120) + "px"
    })
  }, [messageText])

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

  // Helper to safely parse dates
  const safeParseDate = (timestamp: string): Date => {
    if (!timestamp) {
      return new Date()
    }
    const date = new Date(timestamp)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Return current date as fallback
      return new Date()
    }
    return date
  }

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = safeParseDate(timestamp)
      if (isToday(date)) {
        return format(date, "HH:mm", { locale: ar })
      } else if (isYesterday(date)) {
        return `أمس ${format(date, "HH:mm", { locale: ar })}`
      } else {
        return format(date, "dd MMM HH:mm", { locale: ar })
      }
    } catch (error) {
      // Fallback for invalid timestamps
      return "--:--"
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

  // Simple custom emoji popover (no shadcn)
  const EmojiPopover = ({
    anchorEl,
    containerEl,
    mode = "center",
    onSelect,
    onClose,
  }: {
    anchorEl: HTMLElement | null
    containerEl?: HTMLElement | null
    mode?: "center" | "anchorTop"
    onSelect: (emoji: string) => void
    onClose: () => void
  }) => {
    const panelRef = useRef<HTMLDivElement>(null)
    const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", left: -9999, top: -9999, opacity: 0, zIndex: 1000 })
    const STORAGE_KEY = "sufrah_recent_emojis"

    const [recent, setRecent] = useState<string[]>([])

    useEffect(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setRecent(JSON.parse(saved))
      } catch {}
    }, [])

    const updatePosition = useCallback(() => {
      const margin = 8
      const maxWidth = Math.min(360, window.innerWidth - margin * 2)
      const measuredHeight = panelRef.current?.offsetHeight ?? 260

      if (mode === "center" && (containerEl || anchorEl)) {
        const rect = (containerEl ?? anchorEl)!.getBoundingClientRect()
        let left = rect.left + rect.width / 2 - maxWidth / 2
        if (left < margin) left = margin
        if (left + maxWidth > window.innerWidth - margin) {
          left = window.innerWidth - margin - maxWidth
        }
        let top = rect.top + rect.height / 2 - measuredHeight / 2
        if (top < margin) top = margin
        if (top + measuredHeight > window.innerHeight - margin) {
          top = Math.max(margin, window.innerHeight - margin - measuredHeight)
        }
        setStyle({ position: "fixed", left, top, width: maxWidth, zIndex: 1000, opacity: 1 })
        return
      }

      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect()
        let left = rect.left + rect.width / 2 - maxWidth / 2
        if (left < margin) left = margin
        if (left + maxWidth > window.innerWidth - margin) {
          left = window.innerWidth - margin - maxWidth
        }
        let top = rect.top - measuredHeight - 10
        if (top < margin) top = margin
        if (top + measuredHeight > window.innerHeight - margin) {
          top = Math.max(margin, window.innerHeight - margin - measuredHeight)
        }
        setStyle({ position: "fixed", left, top, width: maxWidth, zIndex: 1000, opacity: 1 })
      }
    }, [anchorEl, containerEl, mode])

    useLayoutEffect(() => {
      updatePosition()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorEl])

    useEffect(() => {
      window.addEventListener("resize", updatePosition)
      window.addEventListener("scroll", updatePosition, true)
      const handleDown = (e: MouseEvent) => {
        const target = e.target as Node
        if (panelRef.current?.contains(target)) return
        if (anchorEl && anchorEl.contains(target as Node)) return
        onClose()
      }
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose()
      }
      document.addEventListener("mousedown", handleDown)
      document.addEventListener("keydown", handleKey)
      return () => {
        window.removeEventListener("resize", updatePosition)
        window.removeEventListener("scroll", updatePosition, true)
        document.removeEventListener("mousedown", handleDown)
        document.removeEventListener("keydown", handleKey)
      }
    }, [anchorEl, onClose, updatePosition])

    const select = (emoji: string) => {
      onSelect(emoji)
      setRecent((prev) => {
        const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 18)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
      onClose()
    }

    const QUICK = [
      "😂","👍","❤️","😊","🙏","🎉","😄","😉","🥰","😅","🤝","✅","❌","ℹ️","🔔","📍"
    ]
    const ORDER = [
      "🛒","📦","🚚","⏳","🕒","💵","💳","💰","🧾","🔁","♻️"
    ]
    const FOOD = [
      "🍔","🍟","🍕","🌯","🥙","🍗","🍩","🍰","🍽️","☕","🥤"
    ]
    const SMILEYS = [
      "😀","😁","😂","🤣","😊","😇","🙂","😉","😌","😍","😘","😗","😅","🤗","🤭","😎","🤔","😴","😤","😢","😭","😱","🤯","🤝"
    ]

    const Section = ({ title, emojis }: { title: string; emojis: string[] }) => (
      <div className="mb-2">
        <div className="text-[11px] font-medium text-gray-500 px-1 mb-1">{title}</div>
        <div className="grid grid-cols-8 gap-1">
          {emojis.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => select(e)}
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    )

    const panel = (
      <div ref={panelRef} style={style} className="relative bg-white border border-gray-200 rounded-2xl shadow-xl p-2">
        {mode === "anchorTop" && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-l border-t border-gray-200" />
        )}
        {recent.length > 0 && <Section title="الأخيرة" emojis={recent} />}
        <Section title="سريعة" emojis={QUICK} />
        <Section title="الطلبات والحالة" emojis={ORDER} />
        <Section title="أطعمة ومشروبات" emojis={FOOD} />
        <Section title="ابتسامات" emojis={SMILEYS} />
      </div>
    )

    return createPortal(panel, document.body)
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
    try {
      const date = safeParseDate(message.timestamp)
      const dateKey = format(date, "yyyy-MM-dd")
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    } catch (error) {
      // Skip messages with invalid timestamps
      console.warn("Invalid timestamp for message:", message.id, message.timestamp)
    }
    return groups
  }, {} as Record<string, BotMessage[]>)

  const formatDateHeader = (dateStr: string) => {
    try {
      const date = safeParseDate(dateStr)
      if (isToday(date)) return "اليوم"
      if (isYesterday(date)) return "أمس"
      return format(date, "dd MMMM yyyy", { locale: ar })
    } catch (error) {
      return dateStr // Fallback to original string
    }
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
          <div className="space-y-6">
            {/* Skeleton loaders for messages */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-2 items-end" style={{ 
                justifyContent: i % 2 === 0 ? "flex-start" : "flex-end" 
              }}>
                {i % 2 === 0 && (
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                )}
                <Skeleton className={cn(
                  "rounded-xl px-3 py-2",
                  i % 2 === 0 ? "bg-white max-w-[75%]" : "bg-indigo-100 max-w-[75%]"
                )}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </Skeleton>
                {i % 2 !== 0 && (
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                )}
              </div>
            ))}
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
            {/* Load older messages indicator */}
            {hasMoreMessages && onLoadOlder && (
              <div ref={messagesStartRef} className="flex items-center justify-center py-2">
                {loadingOlder ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري تحميل الرسائل السابقة...</span>
                  </div>
                ) : (
                  <button
                    onClick={onLoadOlder}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    تحميل الرسائل السابقة
                  </button>
                )}
              </div>
            )}
            
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
                ref={emojiButtonRef}
                onClick={() => setIsEmojiOpen((v) => !v)}
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

            {isEmojiOpen && (
              <EmojiPopover
                anchorEl={emojiButtonRef.current}
                containerEl={messagesContainerRef.current}
                mode="center"
                onSelect={(e) => insertEmojiAtCursor(e)}
                onClose={() => setIsEmojiOpen(false)}
              />
            )}

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
