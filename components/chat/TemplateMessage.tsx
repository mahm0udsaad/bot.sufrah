"use client"

import React from "react"
import { toast } from "sonner"
import "./TemplateMessage.css"

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE" | string
  title: string
  id?: string
  url?: string
  phone_number?: string
}

export interface TemplatePreview {
  sid: string
  friendlyName: string
  language: string
  body: string
  contentType: "text" | "quick-reply" | "card" | "list-picker" | string
  buttons: TemplateButton[]
}

interface TemplateMessageProps {
  template: TemplatePreview
  createdAt?: string
  direction?: "in" | "out"
}

export function TemplateMessage({ template, createdAt, direction = "out" }: TemplateMessageProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "QUICK_REPLY":
        return "💬"
      case "URL":
        return "🔗"
      case "PHONE_NUMBER":
        return "📞"
      case "COPY_CODE":
        return "📋"
      default:
        return "▶️"
    }
  }

  const onButtonClick = async (btn: TemplateButton) => {
    if (btn.type === "URL" && btn.url) {
      window.open(btn.url, "_blank")
      return
    }
    if (btn.type === "PHONE_NUMBER" && btn.phone_number) {
      window.open(`tel:${btn.phone_number}`)
      return
    }
    if (btn.type === "COPY_CODE" && btn.title) {
      try {
        await navigator.clipboard.writeText(btn.title)
        toast.success("تم النسخ")
      } catch {
        toast.error("تعذر نسخ الكود")
      }
      return
    }
    // QUICK_REPLY and others are non-interactive in preview
    toast.info("هذا عرض للقالب")
  }

  const bubbleClass = direction === "in" ? "wa-template-bubble-in" : "wa-template-bubble-out"

  return (
    <div className={`wa-template ${bubbleClass}`}>
      <div className="wa-template-header">
        <span className="wa-template-badge">WhatsApp Template</span>
        <span className="wa-template-name">{template.friendlyName}</span>
      </div>
      <div className="wa-template-body">{template.body}</div>
      {Array.isArray(template.buttons) && template.buttons.length > 0 && (
        <div className="wa-template-buttons">
          {template.buttons.map((btn, idx) => (
            <button key={idx} className="wa-template-button" onClick={() => onButtonClick(btn)}>
              <span className="wa-button-icon">{getIcon(btn.type)}</span>
              <span className="wa-button-title">{btn.title}</span>
            </button>
          ))}
        </div>
      )}
      <div className="wa-template-footer">
        <span className="wa-template-meta">
          {template.language.toUpperCase()} • {template.contentType}
        </span>
        {createdAt && <span className="wa-message-time">{new Date(createdAt).toLocaleTimeString()}</span>}
      </div>
    </div>
  )
}


