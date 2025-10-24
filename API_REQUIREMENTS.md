# Sufrah Dashboard - API Requirements & Response Format Specification

This document provides a complete specification of all API endpoints required by the Sufrah Dashboard, including the exact format of responses expected by each page.

---

## Table of Contents

1. [Dashboard Overview Page](#1-dashboard-overview-page)
2. [Orders Page](#2-orders-page)
3. [Chats/Conversations Page](#3-chatsconversations-page)
4. [Templates Page](#4-templates-page)
5. [Ratings & Reviews Page](#5-ratings--reviews-page)
6. [Catalog Page](#6-catalog-page)
7. [Logs Page](#7-logs-page)
8. [Settings Page](#8-settings-page)
9. [Usage & Plan Page](#9-usage--plan-page)
10. [Bot Management Page](#10-bot-management-page)
11. [Notifications](#11-notifications)

---

## 1. Dashboard Overview Page

**Route:** `/` (Home/Dashboard)

### UI Components

- **Key Metrics Cards (4 cards)**
  - Active Conversations
  - Orders in Last 24h
  - Messages in Last 24h
  - SLA Breaches

- **Message Usage Card**
  - Progress bar showing current usage vs limit
  - Messages used, limit, and remaining
  - Usage percentage
  - Days until reset

- **24-Hour Window Management**
  - Active conversations
  - Pending orders
  - SLA breaches

- **Activity Chart**
  - Line chart showing messages and orders over 7 days

- **Template Usage Chart**
  - Bar chart showing top 5 most-used templates

- **Ratings Summary**
  - Average rating
  - Total ratings
  - Change percentage

### API Endpoint

**GET** `/api/dashboard/overview`

**Query Parameters:**
- `tenantId` (string, required): Bot/Tenant ID
- `locale` (string, optional): `en` or `ar`
- `currency` (string, optional): `SAR`, `AED`, etc.

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "restaurantName": "Restaurant Name",
    "activeConversations": 24,
    "pendingOrders": 3,
    "slaBreaches": 0,
    "recentActivity": {
      "messagesLast24h": 142,
      "ordersLast24h": 18,
      "conversationsLast24h": 28
    },
    "quotaUsage": {
      "used": 6420,
      "limit": 10000,
      "remaining": 3580,
      "percentUsed": 64.2
    },
    "activityTimeline": [
      {
        "day": "Mon",
        "messages": 420,
        "orders": 12,
        "date": "2024-01-15"
      }
      // ... 6 more days
    ],
    "topTemplates": [
      {
        "name": "Welcome Message",
        "usage": 42,
        "category": "greeting"
      }
      // ... 4 more templates
    ],
    "ratingTrend": {
      "averageRating": 4.6,
      "totalRatings": 127,
      "trend": "up",
      "changePercent": 5.2
    }
  }
}
```

---

## 2. Orders Page

**Route:** `/orders`

### UI Components

- **Header with Actions**
  - Refresh button
  - Export button
  - Status filter dropdown (ALL, CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)

- **Stats Cards (4 cards)**
  - Total Orders (count)
  - Total Revenue (currency formatted)
  - Average Order Value (currency formatted)
  - Period (number of days)

- **Orders Table**
  - Search bar (filter by Order ID, Customer Name, or Order Reference)
  - Columns:
    - Order ID (reference + short ID)
    - Customer (name + relative time)
    - Items count
    - Total (formatted with currency)
    - Status badge
    - Time (date + time)
    - Alerts (late, awaiting payment, requires review icons)
    - Actions (status change dropdown)
  - Load More button (pagination)

### API Endpoints

#### Get Order Statistics

**GET** `/api/orders/stats`

**Query Parameters:**
- `tenantId` (string, required)
- `days` (number, optional): Default 30
- `locale` (string, optional): `en` or `ar`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "totalOrders": 142,
    "totalRevenue": 3548500,
    "averageOrderValue": 25000,
    "period": {
      "days": 30,
      "startDate": "2024-01-01",
      "endDate": "2024-01-30"
    }
  }
}
```

#### Get Orders (Paginated)

**GET** `/api/orders`

**Query Parameters:**
- `tenantId` (string, required)
- `limit` (number, optional): Default 20
- `offset` (number, optional): Default 0
- `status` (string, optional): CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
- `locale` (string, optional): `en` or `ar`
- `currency` (string, optional): SAR, AED

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_abc123def456",
        "orderReference": "ORD-2024-001",
        "customerId": "customer_xyz789",
        "customerName": "أحمد محمد",
        "customerPhone": "+966501234567",
        "status": "PREPARING",
        "statusDisplay": "قيد التحضير",
        "itemCount": 3,
        "subtotal": 8500,
        "deliveryFee": 1000,
        "tax": 1425,
        "total": 10925,
        "totalFormatted": "109.25 ر.س",
        "currency": "SAR",
        "createdAt": "2024-01-20T14:30:00Z",
        "updatedAt": "2024-01-20T14:35:00Z",
        "createdAtRelative": "منذ 5 دقائق",
        "items": [
          {
            "id": "item_1",
            "name": "برجر دجاج",
            "quantity": 2,
            "unitPrice": 3500,
            "total": 7000
          },
          {
            "id": "item_2",
            "name": "بطاطس مقلية",
            "quantity": 1,
            "unitPrice": 1500,
            "total": 1500
          }
        ],
        "deliveryAddress": {
          "street": "شارع الملك فهد",
          "city": "الرياض",
          "district": "العليا",
          "building": "برج 5",
          "floor": "3",
          "apartment": "12"
        },
        "notes": "بدون بصل من فضلك",
        "paymentMethod": "cash",
        "paymentStatus": "pending",
        "alerts": {
          "isLate": false,
          "awaitingPayment": true,
          "requiresReview": false
        },
        "estimatedDeliveryTime": "2024-01-20T15:15:00Z"
      }
      // ... more orders
    ],
    "pagination": {
      "total": 142,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### Update Order Status

**POST** `/api/orders/:orderId/status`

**Request Body:**

```json
{
  "status": "OUT_FOR_DELIVERY",
  "tenantId": "bot_xyz789"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_abc123def456",
      "status": "OUT_FOR_DELIVERY",
      "updatedAt": "2024-01-20T14:40:00Z"
    }
  }
}
```

---

## 3. Chats/Conversations Page

**Route:** `/chats`

### UI Components

- **Real-time Connection Status**
  - Connection indicator (connecting, connected, error)
  - Reconnect button if error

- **Bot Toggle (Global)**
  - Toggle switch to enable/disable bot for all conversations
  - Status indicator

- **Conversation List (Left Sidebar)**
  - Each conversation shows:
    - Customer name or phone
    - Last message preview
    - Timestamp (relative)
    - Unread message count badge
    - Bot active/inactive badge
    - Individual bot toggle button

- **Message Thread (Center)**
  - Customer info header (name, phone, bot status)
  - Individual bot toggle for this conversation
  - Message list with:
    - Customer messages (blue, right-aligned in RTL)
    - Bot/Agent messages (gray, left-aligned in RTL)
    - Message types: text, image, document, audio, template
    - Template messages show:
      - Template name
      - Body text with variable substitution
      - Buttons (if any)
      - Footer text
    - Timestamps
    - Media preview/download
  - Message input field
  - Send button
  - Media attachment button

- **Bot Status & Orders Panel (Right Sidebar)**
  - Bot connection status
  - Active conversations count
  - Messages today
  - Related orders for selected conversation

### API Endpoints & WebSocket Events

#### Get Conversations

**GET** `/api/conversations`

**Query Parameters:**
- `tenantId` (string, required)
- `limit` (number, optional)
- `offset` (number, optional)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_abc123",
        "customer_phone": "+966501234567",
        "customer_name": "أحمد محمد",
        "last_message_at": "2024-01-20T14:35:00Z",
        "last_message_preview": "شكراً على الطلب",
        "unread_count": 2,
        "is_bot_active": true,
        "status": "active",
        "created_at": "2024-01-15T10:00:00Z"
      }
      // ... more conversations
    ]
  }
}
```

#### Get Messages for Conversation

**GET** `/api/conversations/:conversationId/messages`

**Query Parameters:**
- `tenantId` (string, required)
- `limit` (number, optional): Default 50
- `before` (string, optional): Message ID for pagination

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_xyz789",
        "conversation_id": "conv_abc123",
        "from_phone": "+966501234567",
        "to_phone": "+966509876543",
        "message_type": "text",
        "content": "مرحباً، أريد طلب برجر",
        "media_url": null,
        "timestamp": "2024-01-20T14:30:00Z",
        "is_from_customer": true,
        "status": "delivered",
        "read_at": "2024-01-20T14:30:05Z"
      },
      {
        "id": "msg_abc456",
        "conversation_id": "conv_abc123",
        "from_phone": "+966509876543",
        "to_phone": "+966501234567",
        "message_type": "template",
        "content": "مرحباً أحمد! شكراً لاختيارك مطعمنا.",
        "media_url": null,
        "timestamp": "2024-01-20T14:30:10Z",
        "is_from_customer": false,
        "content_sid": "HX1234567890abcdef",
        "variables": {
          "customer_name": "أحمد"
        },
        "template_preview": {
          "sid": "HX1234567890abcdef",
          "friendlyName": "welcome_message",
          "language": "ar",
          "body": "مرحباً {{customer_name}}! شكراً لاختيارك مطعمنا.",
          "contentType": "twilio/text",
          "buttons": [
            {
              "type": "quick_reply",
              "title": "عرض القائمة",
              "id": "view_menu"
            },
            {
              "type": "quick_reply",
              "title": "تتبع طلبي",
              "id": "track_order"
            }
          ]
        },
        "status": "sent"
      },
      {
        "id": "msg_def789",
        "conversation_id": "conv_abc123",
        "from_phone": "+966501234567",
        "to_phone": "+966509876543",
        "message_type": "image",
        "content": "صورة المنتج",
        "media_url": "https://storage.example.com/images/product-123.jpg",
        "timestamp": "2024-01-20T14:32:00Z",
        "is_from_customer": true,
        "status": "delivered"
      }
      // ... more messages
    ]
  }
}
```

#### Send Message

**POST** `/api/conversations/:conversationId/messages`

**Request Body:**

```json
{
  "tenantId": "bot_xyz789",
  "content": "تم استلام طلبك وسيتم تحضيره الآن",
  "messageType": "text"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_new123",
      "conversation_id": "conv_abc123",
      "content": "تم استلام طلبك وسيتم تحضيره الآن",
      "timestamp": "2024-01-20T14:35:00Z",
      "status": "sent"
    }
  }
}
```

#### Send Media

**POST** `/api/conversations/:conversationId/media`

**Request Body (multipart/form-data):**
- `file`: File upload
- `tenantId`: string
- `caption`: string (optional)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_media456",
      "conversation_id": "conv_abc123",
      "message_type": "image",
      "media_url": "https://storage.example.com/messages/image-456.jpg",
      "content": "صورة القائمة",
      "timestamp": "2024-01-20T14:36:00Z",
      "status": "sent"
    }
  }
}
```

#### Toggle Bot for Conversation

**POST** `/api/conversations/:conversationId/toggle-bot`

**Request Body:**

```json
{
  "enabled": false
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv_abc123",
      "is_bot_active": false,
      "updated_at": "2024-01-20T14:37:00Z"
    }
  }
}
```

#### WebSocket Events (Bot Server)

The dashboard expects these WebSocket events from the bot server:

**Connection URL:** `wss://bot-server.example.com/ws?tenantId=bot_xyz789`

**Event: `message.created`**
```json
{
  "event": "message.created",
  "data": {
    "id": "msg_xyz789",
    "conversation_id": "conv_abc123",
    "from_phone": "+966501234567",
    "to_phone": "+966509876543",
    "message_type": "text",
    "content": "شكراً",
    "timestamp": "2024-01-20T14:38:00Z",
    "is_from_customer": true
  }
}
```

**Event: `conversation.updated`**
```json
{
  "event": "conversation.updated",
  "data": {
    "id": "conv_abc123",
    "last_message_at": "2024-01-20T14:38:00Z",
    "last_message_preview": "شكراً",
    "unread_count": 3
  }
}
```

**Event: `bot.status`**
```json
{
  "event": "bot.status",
  "data": {
    "is_active": true,
    "active_conversations": 24,
    "messages_today": 142
  }
}
```

---

## 4. Templates Page

**Route:** `/templates`

### UI Components

- **Header with Actions**
  - Create Template button
  - Refresh button

- **Stats Cards (4 cards)**
  - Total Templates
  - Approved Templates (green)
  - Pending Templates (yellow)
  - Rejected Templates (red)

- **Filters**
  - Search bar (by name or content)
  - Category filter (ALL, MARKETING, UTILITY, AUTHENTICATION, ORDER_STATUS, ORDER_UPDATE)
  - Status filter (ALL, APPROVED, PENDING, REJECTED)

- **Templates Grid**
  - Each template card shows:
    - Template name
    - Category badge
    - Status badge with icon (Approved, Pending, Rejected)
    - Body text preview (truncated)
    - Variables list ({{variable}} format)
    - Language (AR/EN)
    - Last updated date
    - Action buttons: Copy, Edit, Delete

- **Create/Edit Template Dialog**
  - Template name input
  - Category dropdown
  - Body text textarea
  - Footer text input (optional)
  - Variables automatically detected ({{name}} format)
  - Language selector

### API Endpoints

#### Get Templates

**GET** `/api/templates`

**Query Parameters:**
- `tenantId` (string, required)
- `status` (string, optional): APPROVED, PENDING, REJECTED
- `category` (string, optional): MARKETING, UTILITY, AUTHENTICATION, ORDER_STATUS, ORDER_UPDATE
- `locale` (string, optional): `en` or `ar`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "tmpl_abc123",
        "name": "welcome_message",
        "friendlyName": "Welcome Message",
        "category": "MARKETING",
        "language": "ar",
        "bodyText": "مرحباً {{customer_name}}! شكراً لاختيارك {{restaurant_name}}.",
        "footerText": "© 2024 مطعم سفرة",
        "status": "APPROVED",
        "statusDisplay": "معتمد",
        "variables": ["customer_name", "restaurant_name"],
        "contentSid": "HX1234567890abcdef",
        "approvedAt": "2024-01-15T10:00:00Z",
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
      // ... more templates
    ],
    "stats": {
      "total": 12,
      "approved": 8,
      "pending": 3,
      "rejected": 1
    }
  }
}
```

#### Create Template

**POST** `/api/templates`

**Request Body:**

```json
{
  "tenantId": "bot_xyz789",
  "name": "order_confirmation",
  "category": "ORDER_STATUS",
  "language": "ar",
  "body_text": "تم استلام طلبك رقم {{order_number}} بقيمة {{total_amount}}.",
  "footer_text": "شكراً لثقتك",
  "variables": ["order_number", "total_amount"]
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "template": {
      "id": "tmpl_new456",
      "name": "order_confirmation",
      "status": "PENDING",
      "createdAt": "2024-01-20T14:40:00Z"
    }
  }
}
```

#### Update Template

**PATCH** `/api/templates/:templateId`

**Request Body:**

```json
{
  "name": "order_confirmation_v2",
  "body_text": "تم استلام طلبك رقم {{order_number}} بقيمة {{total_amount}}. وقت التوصيل المتوقع: {{delivery_time}}.",
  "variables": ["order_number", "total_amount", "delivery_time"]
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "template": {
      "id": "tmpl_new456",
      "name": "order_confirmation_v2",
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  }
}
```

#### Delete Template

**DELETE** `/api/templates/:templateId`

**Query Parameters:**
- `tenantId` (string, required)

**Expected Response:**

```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

---

## 5. Ratings & Reviews Page

**Route:** `/ratings`

### UI Components

- **Header with Filters**
  - Period selector (Last 7 days, Last 30 days, Last 90 days)
  - Export button

- **Metrics Cards (5 cards)**
  - NPS Score (large number with trend indicator)
  - Total Ratings
  - Average Rating (with star display)
  - Response Rate (percentage)
  - With Comments count

- **NPS Segments Card**
  - Pie chart showing distribution
  - Three segments:
    - Promoters (9-10 rating, green)
    - Passives (7-8 rating, yellow)
    - Detractors (0-6 rating, red)
  - Count and percentage for each

- **Rating Distribution Card**
  - Horizontal bar chart for each star rating (5 to 1)
  - Count and percentage for each level

- **Rating Timeline Chart**
  - Line chart showing average rating over time period
  - X-axis: dates
  - Y-axis: rating (0-5 scale)

- **Reviews Table**
  - Search bar (by customer name or comment)
  - Rating filter (All, 5★, 4+★, 3+★)
  - Columns:
    - Customer (name + relative time)
    - Rating (stars + numeric value out of 10)
    - Comment (or "No comment")
    - Date & Time

### API Endpoints

#### Get Ratings Analytics

**GET** `/api/ratings`

**Query Parameters:**
- `tenantId` (string, required)
- `days` (number, optional): Default 30
- `locale` (string, optional): `en` or `ar`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "nps": 42,
      "trend": "up",
      "changePercent": 5.2,
      "totalRatings": 127,
      "averageRating": 4.6,
      "responseRate": 78.5
    },
    "segments": {
      "promoters": 68,
      "promotersPercent": 53.5,
      "passives": 42,
      "passivesPercent": 33.1,
      "detractors": 17,
      "detractorsPercent": 13.4
    },
    "distribution": {
      "5": 68,
      "4": 35,
      "3": 7,
      "2": 8,
      "1": 9
    },
    "withComments": 89,
    "period": {
      "days": 30,
      "startDate": "2023-12-21",
      "endDate": "2024-01-20"
    }
  }
}
```

#### Get Rating Timeline

**GET** `/api/ratings/timeline`

**Query Parameters:**
- `tenantId` (string, required)
- `days` (number, optional): Default 30
- `locale` (string, optional)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "date": "2024-01-14",
        "averageRating": 4.5,
        "count": 8
      },
      {
        "date": "2024-01-15",
        "averageRating": 4.7,
        "count": 12
      }
      // ... more days
    ]
  }
}
```

#### Get Reviews

**GET** `/api/ratings/reviews`

**Query Parameters:**
- `tenantId` (string, required)
- `limit` (number, optional): Default 50
- `offset` (number, optional): Default 0
- `minRating` (number, optional): 1-5, filter by minimum rating
- `withComments` (boolean, optional): Only reviews with comments
- `locale` (string, optional)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_abc123",
        "orderId": "order_xyz789",
        "customerId": "customer_def456",
        "customerName": "سارة أحمد",
        "rating": 10,
        "ratingStars": 5,
        "comment": "طعام ممتاز وتوصيل سريع!",
        "createdAt": "2024-01-20T14:30:00Z",
        "createdAtRelative": "منذ ساعة",
        "response": null,
        "respondedAt": null
      },
      {
        "id": "review_def456",
        "orderId": "order_abc123",
        "customerId": "customer_ghi789",
        "customerName": "محمد علي",
        "rating": 6,
        "ratingStars": 3,
        "comment": null,
        "createdAt": "2024-01-20T13:15:00Z",
        "createdAtRelative": "منذ ساعتين",
        "response": null,
        "respondedAt": null
      }
      // ... more reviews
    ],
    "pagination": {
      "total": 127,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## 6. Catalog Page

**Route:** `/catalog`

### UI Components

- **Sync Status Card**
  - Status indicator (success, failed, in progress)
  - Last sync timestamp
  - Items synced count
  - Error count (if any)

- **Stats Cards (3 cards)**
  - Total Categories
  - Total Branches
  - Active Branches

- **Categories Section**
  - Horizontal scrollable buttons
  - Each category shows name and item count
  - Click to filter/view category details

- **Branches Grid**
  - Each branch card shows:
    - Branch name
    - Address
    - Active/Inactive badge

### API Endpoint

**GET** `/api/catalog`

**Query Parameters:**
- `tenantId` (string, required)
- `locale` (string, optional): `en` or `ar`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "syncStatus": {
      "status": "success",
      "lastSyncAt": "2024-01-20T14:00:00Z",
      "itemsSynced": 142,
      "errors": []
    },
    "categories": [
      {
        "id": "cat_abc123",
        "name": "برجر",
        "nameEn": "Burgers",
        "itemCount": 12,
        "displayOrder": 1,
        "isActive": true
      },
      {
        "id": "cat_def456",
        "name": "مشروبات",
        "nameEn": "Beverages",
        "itemCount": 18,
        "displayOrder": 2,
        "isActive": true
      }
      // ... more categories
    ],
    "branches": [
      {
        "id": "branch_xyz789",
        "name": "فرع الرياض - العليا",
        "nameEn": "Riyadh - Al Olaya Branch",
        "address": "شارع الملك فهد، العليا، الرياض",
        "city": "الرياض",
        "phone": "+966112345678",
        "isActive": true,
        "latitude": 24.6877,
        "longitude": 46.7219,
        "workingHours": {
          "saturday": { "open": "10:00", "close": "23:00" },
          "sunday": { "open": "10:00", "close": "23:00" },
          "monday": { "open": "10:00", "close": "23:00" },
          "tuesday": { "open": "10:00", "close": "23:00" },
          "wednesday": { "open": "10:00", "close": "23:00" },
          "thursday": { "open": "10:00", "close": "23:00" },
          "friday": { "open": "14:00", "close": "23:00" }
        }
      }
      // ... more branches
    ],
    "items": [
      {
        "id": "item_abc123",
        "categoryId": "cat_abc123",
        "name": "برجر دجاج كلاسيك",
        "nameEn": "Classic Chicken Burger",
        "description": "برجر دجاج طازج مع الخس والطماطم والصلصة الخاصة",
        "price": 3500,
        "priceFormatted": "35.00 ر.س",
        "imageUrl": "https://storage.example.com/items/chicken-burger.jpg",
        "isAvailable": true,
        "calories": 450,
        "preparationTime": 15
      }
      // ... more items (optional - may be in separate endpoint)
    ]
  }
}
```

---

## 7. Logs Page

**Route:** `/logs`

### UI Components

#### Webhook Logs Tab

- **Filters**
  - Search bar (by request ID, path, or method)
  - Path filter (ALL, /status, /webhook, /bot)
  - Status code filter (ALL, 200, 400, 500)

- **Logs Table**
  - Expandable rows
  - Columns:
    - Expand/collapse button
    - Timestamp
    - HTTP Method badge
    - Path
    - Status Code badge (colored by success/error)
    - Request ID (short)
  - Expanded view shows:
    - Error message (if any)
    - Request headers (JSON)
    - Request body (JSON)

#### Outbound Messages Tab

- **Filters**
  - Search bar (by phone, message, or template)
  - Status filter (ALL, sent, delivered, failed, pending)

- **Messages Table**
  - Expandable rows
  - Columns:
    - Expand/collapse button
    - Timestamp
    - To phone
    - Status badge (colored)
    - Channel
    - Template name
  - Expanded view shows:
    - Error message and code (if failed)
    - From/To phone numbers
    - WhatsApp SID
    - Template SID
    - Message body
    - Metadata (JSON)

### API Endpoints

#### Get Webhook Logs

**GET** `/api/logs/webhook`

**Query Parameters:**
- `tenantId` (string, required)
- `path` (string, optional): Filter by path
- `status` (string, optional): Filter by status code
- `limit` (number, optional): Default 50

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "restaurantId": "rest_xyz789",
        "requestId": "req_def456ghi789",
        "method": "POST",
        "path": "/webhook",
        "headers": {
          "content-type": "application/json",
          "x-twilio-signature": "abc123..."
        },
        "body": {
          "From": "+966501234567",
          "Body": "مرحباً",
          "MessageSid": "SM1234567890abcdef"
        },
        "statusCode": 200,
        "errorMessage": null,
        "createdAt": "2024-01-20T14:30:00Z"
      }
      // ... more logs
    ]
  }
}
```

#### Get Outbound Messages Logs

**GET** `/api/logs/outbound`

**Query Parameters:**
- `tenantId` (string, required)
- `status` (string, optional): Filter by status
- `limit` (number, optional): Default 50

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_abc123",
        "restaurantId": "rest_xyz789",
        "conversationId": "conv_def456",
        "toPhone": "+966501234567",
        "fromPhone": "+966509876543",
        "body": "تم تحضير طلبك وهو في الطريق إليك",
        "channel": "whatsapp",
        "templateSid": "HX1234567890abcdef",
        "templateName": "order_on_the_way",
        "status": "delivered",
        "waSid": "SM9876543210fedcba",
        "errorCode": null,
        "errorMessage": null,
        "metadata": {
          "orderId": "order_ghi789",
          "deliveryTime": "15 minutes"
        },
        "createdAt": "2024-01-20T14:30:00Z",
        "updatedAt": "2024-01-20T14:30:15Z"
      }
      // ... more messages
    ]
  }
}
```

---

## 8. Settings Page

**Route:** `/settings`

### UI Components

- **Restaurant Information Card**
  - Restaurant name
  - Cuisine type dropdown
  - Description textarea
  - Phone number
  - Email
  - Address
  - Opening hours
  - Average delivery time

- **WhatsApp Settings Card**
  - Bot status badge (Active, Verifying, Pending, Failed)
  - WhatsApp number (read-only)
  - Sender SID (read-only)
  - Subaccount SID (read-only)
  - Verified timestamp
  - Error message (if any)
  - Link to onboarding
  - Auto-reply toggles:
    - Welcome message
    - Order confirmations
    - Delivery updates

- **Notifications Card**
  - Toggle switches for:
    - New orders
    - Message quota alerts
    - Template status updates
    - Daily reports

- **Security & Compliance Card**
  - Toggle switches for:
    - 24-hour window enforcement
    - Anti-ban protection
    - Message logging
  - Data retention period dropdown (30/90/180/365 days)

- **Team Management Card**
  - List of team members with:
    - Avatar/initials
    - Name
    - Email
    - Role badge (Owner, Manager, Staff)
  - Invite member button

### API Endpoints

#### Get Restaurant Profile

**GET** `/api/restaurant/profile`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "rest_abc123",
    "name": "مطعم سفرة",
    "nameEn": "Sufrah Restaurant",
    "cuisineType": "middle-eastern",
    "description": "أطباق شرق أوسطية أصيلة بمكونات طازجة",
    "phone": "+966112345678",
    "email": "info@sufrah.sa",
    "address": "شارع الملك فهد، العليا، الرياض",
    "openingHours": "10:00 صباحاً - 11:00 مساءً",
    "avgDeliveryTime": "30-45 دقيقة",
    "settings": {
      "autoReply": {
        "welcomeMessage": true,
        "orderConfirmations": true,
        "deliveryUpdates": true
      },
      "notifications": {
        "newOrders": true,
        "quotaAlerts": true,
        "templateUpdates": true,
        "dailyReports": false
      },
      "security": {
        "enforce24HourWindow": true,
        "antiBanProtection": true,
        "messageLogging": true,
        "dataRetentionDays": 90
      }
    }
  }
}
```

#### Get WhatsApp Bot Status

**GET** `/api/onboarding/whatsapp`

**Query Parameters:**
- `restaurantId` (string, required)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "bot": {
      "id": "bot_xyz789",
      "restaurantId": "rest_abc123",
      "subaccountSid": "AC1234567890abcdef",
      "authToken": "hidden",
      "whatsappNumber": "+966509876543",
      "senderSid": "MG9876543210fedcba",
      "verificationSid": "VE1234567890abcdef",
      "status": "ACTIVE",
      "verifiedAt": "2024-01-15T10:00:00Z",
      "errorMessage": null,
      "createdAt": "2024-01-10T08:00:00Z"
    }
  }
}
```

#### Update Settings

**PATCH** `/api/restaurant/settings`

**Request Body:**

```json
{
  "restaurantId": "rest_abc123",
  "settings": {
    "autoReply": {
      "welcomeMessage": true,
      "orderConfirmations": true,
      "deliveryUpdates": false
    }
  }
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## 9. Usage & Plan Page

**Route:** `/usage`

### UI Components

- **Header**
  - Upgrade Plan button

- **Current Usage Card (Large)**
  - Messages used this month (large number)
  - Total limit
  - Progress bar
  - Percentage used
  - Messages remaining
  - Warning alert if > 80% used

- **Current Plan Card**
  - Plan name (Starter, Professional, Enterprise)
  - Price per month
  - Messages per month
  - Next billing date
  - Manage Billing button

- **Daily Usage Chart**
  - Line chart showing messages sent per day
  - X-axis: dates (last 7 days)
  - Y-axis: message count

- **Available Plans Section**
  - Three plan cards side by side:
    - **Starter**: SAR 299/month, 5K messages
    - **Professional**: SAR 599/month, 10K messages (current)
    - **Enterprise**: SAR 999/month, 25K messages
  - Each card shows:
    - Plan name
    - Price
    - Message limit
    - Feature list
    - "Current Plan" badge or "Upgrade" button

### API Endpoint

**GET** `/api/usage`

**Query Parameters:**
- `tenantId` (string, required)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "currentUsage": {
      "used": 6420,
      "limit": 10000,
      "remaining": 3580,
      "percentage": 64.2
    },
    "currentPlan": {
      "id": "plan_professional",
      "name": "Professional",
      "price": 599,
      "currency": "SAR",
      "messageLimit": 10000,
      "billingCycle": "monthly",
      "nextBillingDate": "2024-02-15",
      "features": [
        "10K WhatsApp messages",
        "Advanced templates",
        "Analytics",
        "Priority support",
        "Custom branding"
      ]
    },
    "dailyUsage": [
      { "date": "2024-01-14", "messages": 820 },
      { "date": "2024-01-15", "messages": 950 },
      { "date": "2024-01-16", "messages": 890 },
      { "date": "2024-01-17", "messages": 780 },
      { "date": "2024-01-18", "messages": 1020 },
      { "date": "2024-01-19", "messages": 980 },
      { "date": "2024-01-20", "messages": 980 }
    ],
    "availablePlans": [
      {
        "id": "plan_starter",
        "name": "Starter",
        "price": 299,
        "currency": "SAR",
        "messageLimit": 5000,
        "features": [
          "5K WhatsApp messages",
          "Basic templates",
          "Order tracking",
          "Email support"
        ]
      },
      {
        "id": "plan_professional",
        "name": "Professional",
        "price": 599,
        "currency": "SAR",
        "messageLimit": 10000,
        "features": [
          "10K WhatsApp messages",
          "Advanced templates",
          "Analytics",
          "Priority support",
          "Custom branding"
        ]
      },
      {
        "id": "plan_enterprise",
        "name": "Enterprise",
        "price": 999,
        "currency": "SAR",
        "messageLimit": 25000,
        "features": [
          "25K WhatsApp messages",
          "Unlimited templates",
          "Advanced analytics",
          "24/7 support",
          "API access",
          "Multi-location"
        ]
      }
    ]
  }
}
```

---

## 10. Bot Management Page

**Route:** `/bot-management`

### UI Components

- **Bot Status Card**
  - Bot icon and name
  - Restaurant name
  - Status badge (Active, Verifying, Pending, Failed)
  - Status description
  - WhatsApp number
  - Verified timestamp
  - WhatsApp Business Account ID (WABA ID)
  - Error message (if any)
  - Bot activation toggle switch

- **Rate Limits Card**
  - Messages per minute input
  - Messages per day input
  - Current values displayed

- **Contact Cards (2 cards)**
  - Support contact with phone number and call button
  - Payment link with URL and open button

- **Twilio Configuration Card (Read-only)**
  - Account SID
  - Subaccount SID
  - Sender SID
  - Verification SID

- **Refresh Data Button**

### API Endpoints

#### Get Bot Management Data

**GET** `/api/bot-management`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "bot": {
      "id": "bot_xyz789",
      "restaurantId": "rest_abc123",
      "name": "مطعم سفرة - بوت",
      "restaurantName": "مطعم سفرة",
      "whatsappNumber": "+966509876543",
      "accountSid": "AC1234567890abcdef",
      "subaccountSid": "AC9876543210fedcba",
      "wabaId": "102318765432198",
      "senderSid": "MG1234567890abcdef",
      "verificationSid": "VE9876543210fedcba",
      "status": "ACTIVE",
      "verifiedAt": "2024-01-15T10:00:00Z",
      "errorMessage": null,
      "supportContact": "+966112345678",
      "paymentLink": "https://pay.example.com/sufrah",
      "isActive": true,
      "maxMessagesPerMin": 60,
      "maxMessagesPerDay": 10000,
      "createdAt": "2024-01-10T08:00:00Z",
      "updatedAt": "2024-01-20T14:00:00Z"
    }
  }
}
```

#### Toggle Bot Activation

**POST** `/api/bot-management/toggle`

**Request Body:**

```json
{
  "isActive": false
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "bot": {
      "id": "bot_xyz789",
      "isActive": false,
      "updatedAt": "2024-01-20T14:45:00Z"
    }
  }
}
```

#### Update Rate Limits

**PATCH** `/api/bot-management/limits`

**Request Body:**

```json
{
  "maxMessagesPerMin": 80,
  "maxMessagesPerDay": 15000
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "bot": {
      "id": "bot_xyz789",
      "maxMessagesPerMin": 80,
      "maxMessagesPerDay": 15000,
      "updatedAt": "2024-01-20T14:50:00Z"
    }
  }
}
```

---

## 11. Notifications

**Component:** Notifications Bell (Header) - Uses Shadcn Sheet

### UI Components

- **Bell Icon with Badge** (unread count)
- **Sheet Panel** (slides from right/left based on locale)
  - Header with "Notifications" title and "Mark all read" button
  - Notification list with:
    - Icon (order, message, alert, info)
    - Title and description
    - Timestamp (relative)
    - Unread indicator dot
    - Click to navigate

### API Endpoint

**GET** `/api/notifications`

**Query Parameters:**
- `tenantId` (string, required)
- `limit` (number, optional): Default 20
- `unreadOnly` (boolean, optional)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_abc123",
        "type": "order",
        "title": "طلب جديد",
        "message": "طلب جديد من أحمد محمد (#ORD-001)",
        "isRead": false,
        "link": "/orders?id=order_xyz789",
        "createdAt": "2024-01-20T14:30:00Z"
      },
      {
        "id": "notif_def456",
        "type": "message",
        "title": "رسالة جديدة",
        "message": "رسالة من سارة علي",
        "isRead": false,
        "link": "/chats?id=conv_abc123",
        "createdAt": "2024-01-20T14:25:00Z"
      },
      {
        "id": "notif_ghi789",
        "type": "alert",
        "title": "تنبيه الحصة",
        "message": "وصلت إلى 80% من حصة الرسائل",
        "isRead": true,
        "link": "/usage",
        "createdAt": "2024-01-20T10:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

**Mark as Read:**

**POST** `/api/notifications/read`

```json
{
  "notificationIds": ["notif_abc123", "notif_def456"]
}
```

---

## Common Patterns & Standards

### Authentication

All API requests should include authentication via cookies:
- Cookie name: `user-phone`
- Value: The authenticated user's phone number

Alternatively, endpoints may support header-based authentication:
```
Authorization: Bearer <token>
```

### Error Response Format

All error responses should follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Pagination

Endpoints that return lists should support pagination:

**Query Parameters:**
- `limit` (number): Number of items per page
- `offset` (number): Number of items to skip

**Response includes:**
```json
{
  "pagination": {
    "total": 142,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Localization

All endpoints that return user-facing text should support the `locale` query parameter:
- `locale=en`: English
- `locale=ar`: Arabic (RTL)

Localized fields should be returned based on the locale, with fallbacks:
- If `locale=ar`: Return `name` field (Arabic), include `nameEn` as backup
- If `locale=en`: Return `name` field (English), include `nameAr` as backup

### Currency Formatting

Monetary values should be returned as:
- Integer in smallest currency unit (fils/halalas): `3500` = 35.00 SAR
- Include `currency` field: `SAR`, `AED`, etc.
- Optionally include pre-formatted string: `"35.00 ر.س"`

### Timestamps

All timestamps should be in ISO 8601 format with timezone:
- `"2024-01-20T14:30:00Z"` (UTC)
- `"2024-01-20T17:30:00+03:00"` (with timezone offset)

For relative timestamps (e.g., "منذ 5 دقائق", "5 minutes ago"), the server may include a `*Relative` field.

### Status Codes

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request creating a resource
- `204 No Content`: Successful DELETE request
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server error

---

## WebSocket Integration

The dashboard expects a WebSocket connection to the bot server for real-time updates in the Chats page.

### Connection

**URL:** `wss://bot-server.example.com/ws`

**Query Parameters:**
- `tenantId`: The bot/tenant ID for authentication

### Events from Server to Dashboard

1. **message.created**: New message received or sent
2. **conversation.updated**: Conversation metadata updated
3. **bot.status**: Bot status changed
4. **order.created**: New order created
5. **order.updated**: Order status updated

### Events from Dashboard to Server

1. **subscribe**: Subscribe to conversation updates
2. **unsubscribe**: Unsubscribe from updates
3. **send_message**: Send a new message

**Example subscription:**
```json
{
  "action": "subscribe",
  "conversationId": "conv_abc123"
}
```

---

## Notes for Backend Developers

1. **Tenant ID Usage**: All endpoints should use `tenantId` (bot ID) instead of `restaurantId` for filtering data from the bot server.

2. **Real-time Updates**: Implement WebSocket support for the Chats page to provide real-time message delivery.

3. **Rate Limiting**: Implement rate limiting on all endpoints to prevent abuse.

4. **Caching**: Consider caching strategies for frequently accessed data like dashboard overview, catalog, and templates.

5. **Media Storage**: Implement secure media upload and storage for images, documents, and audio files in the chat interface.

6. **Template Validation**: Validate WhatsApp template format before submission to WhatsApp Business API.

7. **Pagination Performance**: Optimize queries for paginated endpoints, especially for orders and messages.

8. **Timezone Handling**: Store all timestamps in UTC, but support timezone conversion based on restaurant location.

9. **Localization**: Maintain both Arabic and English versions of all user-facing text fields.

10. **Audit Trail**: Log all state-changing operations for debugging and compliance.

---

## Testing Checklist

- [ ] All endpoints return data in the exact format specified
- [ ] Pagination works correctly with `limit` and `offset`
- [ ] Localization works for both `en` and `ar` locales
- [ ] Error responses follow the standard format
- [ ] Authentication is enforced on all protected endpoints
- [ ] WebSocket events are delivered in real-time
- [ ] Currency values are correctly formatted
- [ ] Timestamps are in ISO 8601 format
- [ ] Filters and search work as expected
- [ ] Rate limits are enforced
- [ ] CORS is configured for the dashboard domain

---

## Contact & Support

For questions or clarifications about this API specification, please contact the dashboard development team.

**Last Updated:** January 2024
**Version:** 1.0.0

