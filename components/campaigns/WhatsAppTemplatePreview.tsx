"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  ExternalLink,
  Phone,
  Copy,
  Play,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  CheckCheck,
  Image as ImageIcon,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────

interface ActionButton {
  type: string
  title: string
  url?: string
  phone?: string
  code?: string
}

interface CarouselCard {
  title: string
  body: string
  media: string
  actions: ActionButton[]
}

interface CatalogItem {
  id: string
  section_title: string
}

export interface TemplatePreviewData {
  type:
    | "twilio/text"
    | "twilio/media"
    | "twilio/call-to-action"
    | "twilio/quick-reply"
    | "twilio/card"
    | "twilio/carousel"
    | "twilio/catalog"
  body: string
  footer?: string | null
  mediaUrls: string[]
  actions: ActionButton[]
  cards: CarouselCard[]
  // Card-specific
  cardTitle?: string
  cardSubtitle?: string
  // Catalog-specific
  catalogId?: string
  catalogTitle?: string
  catalogItems?: CatalogItem[]
}

interface Props {
  data: TemplatePreviewData
  isRtl?: boolean
}

// ─── Helpers ─────────────────────────────────────────────

function Timestamp({ isRtl }: { isRtl: boolean }) {
  const time = new Date().toLocaleTimeString(isRtl ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return (
    <span className="inline-flex items-center gap-1 float-right mt-1 ml-2 rtl:ml-0 rtl:mr-2">
      <span className="text-[11px] text-[#667781] dark:text-[#8696a0] leading-none">{time}</span>
      <CheckCheck className="h-[14px] w-[14px] text-[#53bdeb]" />
    </span>
  )
}

function MediaPlaceholder({ url, isVideo }: { url?: string; isVideo?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showFallback = !url || imgFailed

  return (
    <div className="relative rounded-md overflow-hidden bg-[#ccd0d5] dark:bg-[#2a3942] aspect-[4/3] flex items-center justify-center">
      {url && !imgFailed && (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <div className="rounded-full bg-black/50 p-3">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          ) : (
            <ImageIcon className="h-10 w-10 text-[#8696a0]" />
          )}
        </div>
      )}
    </div>
  )
}

function ActionIcon({ type }: { type: string }) {
  switch (type) {
    case "URL":
      return <ExternalLink className="h-[14px] w-[14px]" />
    case "PHONE":
    case "PHONE_NUMBER":
    case "VOICE_CALL":
      return <Phone className="h-[14px] w-[14px]" />
    case "COPY_CODE":
      return <Copy className="h-[14px] w-[14px]" />
    default:
      return null
  }
}

// ─── Bubble wrapper ──────────────────────────────────────

function BubbleWrapper({ children, isRtl, noPadding }: { children: React.ReactNode; isRtl: boolean; noPadding?: boolean }) {
  return (
    <div className={cn("max-w-[85%]", isRtl ? "mr-auto" : "ml-auto")}>
      <div className={cn(
        "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative overflow-hidden",
        !noPadding && "px-[9px] pt-[6px] pb-[8px]"
      )}>
        {children}
      </div>
    </div>
  )
}

// ─── Template Renderers ──────────────────────────────────

function TextPreview({ data, isRtl }: Props) {
  return (
    <BubbleWrapper isRtl={isRtl!}>
      <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
        {data.body}
        <Timestamp isRtl={isRtl!} />
      </p>
      {data.footer && (
        <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1">{data.footer}</p>
      )}
    </BubbleWrapper>
  )
}

function MediaPreview({ data, isRtl }: Props) {
  const url = data.mediaUrls[0]
  const isVideo = url?.match(/\.(mp4|mov|avi|webm)$/i) || url?.includes("video")
  return (
    <BubbleWrapper isRtl={isRtl!} noPadding>
      <div className="p-[3px] pb-0">
        <MediaPlaceholder url={url} isVideo={!!isVideo} />
      </div>
      <div className="px-[9px] pt-[5px] pb-[8px]">
        <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
          {data.body}
          <Timestamp isRtl={isRtl!} />
        </p>
        {data.footer && (
          <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1">{data.footer}</p>
        )}
      </div>
    </BubbleWrapper>
  )
}

function CallToActionPreview({ data, isRtl }: Props) {
  return (
    <div className={cn("max-w-[85%]", isRtl ? "mr-auto" : "ml-auto")}>
      <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] overflow-hidden">
        <div className="px-[9px] pt-[6px] pb-[8px]">
          <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
            {data.body}
            <Timestamp isRtl={isRtl!} />
          </p>
          {data.footer && (
            <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1">{data.footer}</p>
          )}
        </div>
        {/* CTA buttons - WhatsApp renders these as full-width rows with dividers */}
        {data.actions.length > 0 && (
          <div className="border-t border-[#d9fdd3] dark:border-[#005c4b]">
            {data.actions.map((action, idx) => (
              <div key={idx}>
                {idx > 0 && <div className="h-px bg-[#00000014] dark:bg-[#ffffff14]" />}
                <div className="flex items-center justify-center gap-1.5 py-[7px] text-[14px] text-[#027eb5] dark:text-[#53bdeb] font-normal">
                  <ActionIcon type={action.type} />
                  <span>{action.title || `Button ${idx + 1}`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickReplyPreview({ data, isRtl }: Props) {
  return (
    <div className={cn("max-w-[85%] space-y-1", isRtl ? "mr-auto" : "ml-auto")}>
      {/* Main bubble */}
      <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] px-[9px] pt-[6px] pb-[8px]">
        <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
          {data.body}
          <Timestamp isRtl={isRtl!} />
        </p>
        {data.footer && (
          <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1">{data.footer}</p>
        )}
      </div>
      {/* Quick reply pills - WhatsApp renders these as separate rounded buttons below */}
      {data.actions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.actions.map((action, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#1f2c34] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] px-4 py-[6px] text-[14px] text-[#027eb5] dark:text-[#53bdeb] font-normal flex-1 min-w-0 text-center"
            >
              {action.title || `${idx + 1}`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CardPreview({ data, isRtl }: Props) {
  const url = data.mediaUrls[0]
  return (
    <div className={cn("max-w-[85%]", isRtl ? "mr-auto" : "ml-auto")}>
      <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] overflow-hidden">
        {/* Card image */}
        {url && (
          <div className="p-[3px] pb-0">
            <MediaPlaceholder url={url} />
          </div>
        )}
        <div className="px-[9px] pt-[6px] pb-[8px] space-y-[2px]">
          {data.cardTitle && (
            <p className="text-[15px] font-bold text-[#111b21] dark:text-[#e9edef] leading-[20px]" dir={isRtl ? "rtl" : "ltr"}>
              {data.cardTitle}
            </p>
          )}
          <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
            {data.body}
          </p>
          {data.cardSubtitle && (
            <p className="text-[13px] text-[#667781] dark:text-[#8696a0]" dir={isRtl ? "rtl" : "ltr"}>
              {data.cardSubtitle}
            </p>
          )}
          {data.footer && (
            <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1">{data.footer}</p>
          )}
          <div className="flex justify-end">
            <Timestamp isRtl={isRtl!} />
          </div>
        </div>
        {/* Card action buttons */}
        {data.actions.length > 0 && (
          <div className="border-t border-[#00000014] dark:border-[#ffffff14]">
            {data.actions.map((action, idx) => (
              <div key={idx}>
                {idx > 0 && <div className="h-px bg-[#00000014] dark:bg-[#ffffff14]" />}
                <div className="flex items-center justify-center gap-1.5 py-[7px] text-[14px] text-[#027eb5] dark:text-[#53bdeb] font-normal">
                  <ActionIcon type={action.type} />
                  <span>{action.title || `Button ${idx + 1}`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CarouselPreview({ data, isRtl }: Props) {
  return (
    <div className={cn("space-y-2", isRtl ? "mr-auto" : "ml-auto")} style={{ maxWidth: "85%" }}>
      {/* Main body bubble */}
      {data.body && (
        <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] px-[9px] pt-[6px] pb-[8px]">
          <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
            {data.body}
            <Timestamp isRtl={isRtl!} />
          </p>
        </div>
      )}
      {/* Horizontal scrollable carousel cards */}
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {data.cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#1f2c34] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] overflow-hidden flex-shrink-0 snap-start"
            style={{ width: "200px" }}
          >
            <div className="aspect-[4/3] bg-[#ccd0d5] dark:bg-[#2a3942] flex items-center justify-center overflow-hidden relative">
              {card.media ? (
                <img src={card.media} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-[#8696a0]" />
              )}
            </div>
            <div className="px-3 py-2 space-y-1">
              {card.title && (
                <p className="text-[13px] font-bold text-[#111b21] dark:text-[#e9edef] leading-tight line-clamp-2" dir={isRtl ? "rtl" : "ltr"}>
                  {card.title}
                </p>
              )}
              {card.body && (
                <p className="text-[12px] text-[#667781] dark:text-[#8696a0] leading-tight line-clamp-3" dir={isRtl ? "rtl" : "ltr"}>
                  {card.body}
                </p>
              )}
            </div>
            {card.actions.length > 0 && (
              <div className="border-t border-[#00000014] dark:border-[#ffffff14]">
                {card.actions.map((action, ai) => (
                  <div key={ai}>
                    {ai > 0 && <div className="h-px bg-[#00000014] dark:bg-[#ffffff14]" />}
                    <div className="flex items-center justify-center gap-1 py-[6px] text-[13px] text-[#027eb5] dark:text-[#53bdeb]">
                      <ActionIcon type={action.type} />
                      <span>{action.title || `Button ${ai + 1}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* Scroll hint */}
        {data.cards.length > 1 && (
          <div className="flex-shrink-0 w-8 flex items-center justify-center">
            {isRtl ? (
              <ChevronLeft className="h-5 w-5 text-[#8696a0] animate-pulse" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[#8696a0] animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CatalogPreview({ data, isRtl }: Props) {
  const items = data.catalogItems?.filter((i) => i.id) || []
  return (
    <div className={cn("max-w-[85%]", isRtl ? "mr-auto" : "ml-auto")}>
      <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] overflow-hidden">
        <div className="px-[9px] pt-[6px] pb-[8px]">
          <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-[19px]" dir={isRtl ? "rtl" : "ltr"}>
            {data.body}
            <Timestamp isRtl={isRtl!} />
          </p>
          {data.footer && (
            <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1">{data.footer}</p>
          )}
        </div>

        {/* Catalog product grid */}
        {items.length > 0 && (
          <div className="border-t border-[#00000014] dark:border-[#ffffff14]">
            {/* Product thumbnails row */}
            <div className="grid grid-cols-3 gap-px bg-[#00000014] dark:bg-[#ffffff14]">
              {items.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#1f2c34] aspect-square flex flex-col items-center justify-center gap-1 p-2"
                >
                  <ShoppingBag className="h-5 w-5 text-[#8696a0]" />
                  <p className="text-[10px] text-[#667781] dark:text-[#8696a0] text-center line-clamp-2 leading-tight">
                    {item.section_title || item.id}
                  </p>
                </div>
              ))}
            </div>
            {items.length > 3 && (
              <div className="text-center py-1.5 text-[12px] text-[#667781] dark:text-[#8696a0] bg-white dark:bg-[#1f2c34]">
                +{items.length - 3} {isRtl ? "أخرى" : "more"}
              </div>
            )}
          </div>
        )}

        {/* View catalog button */}
        <div className="border-t border-[#00000014] dark:border-[#ffffff14]">
          <div className="flex items-center justify-center gap-1.5 py-[7px] text-[14px] text-[#027eb5] dark:text-[#53bdeb] bg-white/0">
            <ShoppingBag className="h-[14px] w-[14px]" />
            <span>{data.catalogTitle || (isRtl ? "عرض الكتالوج" : "View Catalog")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────

export function WhatsAppTemplatePreview({ data, isRtl = false }: Props) {
  const renderPreview = () => {
    switch (data.type) {
      case "twilio/text":
        return <TextPreview data={data} isRtl={isRtl} />
      case "twilio/media":
        return <MediaPreview data={data} isRtl={isRtl} />
      case "twilio/call-to-action":
        return <CallToActionPreview data={data} isRtl={isRtl} />
      case "twilio/quick-reply":
        return <QuickReplyPreview data={data} isRtl={isRtl} />
      case "twilio/card":
        return <CardPreview data={data} isRtl={isRtl} />
      case "twilio/carousel":
        return <CarouselPreview data={data} isRtl={isRtl} />
      case "twilio/catalog":
        return <CatalogPreview data={data} isRtl={isRtl} />
      default:
        return <TextPreview data={data} isRtl={isRtl} />
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border-2 border-green-200 dark:border-green-900">
      {/* WhatsApp header bar */}
      <div className="bg-[#075e54] dark:bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-[#dfe5e7] dark:bg-[#6b7b8d] flex items-center justify-center">
          <span className="text-[#075e54] dark:text-[#1f2c34] text-xs font-bold">WA</span>
        </div>
        <div>
          <p className="text-[14px] font-medium text-white leading-tight">
            {isRtl ? "معاينة الرسالة" : "Message Preview"}
          </p>
          <p className="text-[11px] text-[#a0d8cd] dark:text-[#8696a0] leading-tight">
            {isRtl ? "متصل" : "online"}
          </p>
        </div>
      </div>

      {/* Chat area with WhatsApp wallpaper */}
      <div
        className="bg-[#efeae2] dark:bg-[#0b141a] p-4 min-h-[280px] flex flex-col justify-center relative"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23d4cfc6' opacity='0.4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`,
        }}
      >
        {renderPreview()}
      </div>

      {/* Bottom hint bar */}
      <div className="bg-[#f0f2f5] dark:bg-[#1f2c34] px-4 py-1.5 border-t border-[#e9edef] dark:border-[#313d45]">
        <p className="text-[11px] text-center text-[#8696a0]">
          {isRtl
            ? "معاينة تقريبية — قد يختلف المظهر في واتساب"
            : "Approximate preview — appearance may vary in WhatsApp"}
        </p>
      </div>
    </div>
  )
}
