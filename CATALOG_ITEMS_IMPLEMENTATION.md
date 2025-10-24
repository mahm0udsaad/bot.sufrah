# Catalog Items Implementation

## Overview
Added full catalog items display with images to the catalog page. Users can now see all menu items with their photos, prices, descriptions, and availability status.

## Changes Made

### 1. Data Types (`lib/dashboard-api.ts`)
- Added `MenuItem` interface with fields:
  - `id`, `categoryId`, `name`, `nameEn`
  - `description`, `descriptionEn`
  - `price`, `priceFormatted`
  - `imageUrl` (for displaying item images)
  - `isAvailable`, `calories`, `preparationTime`
- Added `fetchMenuItems()` function to fetch items by category

### 2. Server Actions (`lib/dashboard-actions.ts`)
- Added `MenuItem` to exports
- Created `getMenuItems()` server action with optional category filtering
- Fixed TypeScript linter errors for header access

### 3. API Route (`app/api/catalog/items/route.ts`)
- Created new proxy endpoint `/api/catalog/items`
- Supports optional `categoryId` query parameter for filtering
- Proxies requests to backend with proper authentication headers

### 4. Hooks (`hooks/use-dashboard-api.ts`)
- Updated `useCatalog()` hook to:
  - Accept optional `selectedCategoryId` parameter
  - Fetch menu items when category changes
  - Return `items` array and `itemsLoading` state
  - Automatically refresh items when category selection changes

### 5. UI Components (`components/catalog-view.tsx`)
- Added "All Items" button to show all items across categories
- Created new "Menu Items" section displaying:
  - Product images (if available)
  - Item name and description
  - Price (formatted)
  - Availability badge (red if unavailable)
  - Calories and preparation time
- Items displayed in responsive grid (1-4 columns based on screen size)
- Shows loading spinner while items are being fetched
- Shows empty state when no items found

### 6. Translations
Added new translation keys in both English (`locales/en.ts`) and Arabic (`locales/ar.ts`):

**English:**
- `catalog.categories.all`: "All Items"
- `catalog.items.title`: "Menu Items"
- `catalog.items.total`: "items"
- `catalog.items.empty`: "No items found"
- `catalog.items.unavailable`: "Unavailable"
- `catalog.items.cal`: "cal"
- `catalog.items.min`: "min"

**Arabic:**
- `catalog.categories.all`: "جميع العناصر"
- `catalog.items.title`: "عناصر القائمة"
- `catalog.items.total`: "عناصر"
- `catalog.items.empty`: "لا توجد عناصر"
- `catalog.items.unavailable`: "غير متاح"
- `catalog.items.cal`: "سعرة"
- `catalog.items.min`: "دقيقة"

## Features

### Image Display
- Menu items display images using Next.js `Image` component
- Optimized with proper sizing and lazy loading
- Falls back gracefully if no image is provided
- Fixed aspect ratio (h-48) for consistent layout

### Category Filtering
- Click any category to filter items
- Click "All Items" to show all menu items
- Items automatically reload when category changes
- Loading indicator shown during fetch

### Item Information
Each item card shows:
- Product image (if available)
- Item name
- Description (truncated to 2 lines)
- Price (formatted with currency)
- Availability status badge
- Calories count (if provided)
- Preparation time (if provided)

### Responsive Design
- 1 column on mobile
- 2 columns on tablet (md)
- 3 columns on desktop (lg)
- 4 columns on large screens (xl)

## Backend Requirements

The backend should implement the following endpoint:

```
GET /api/catalog/items?categoryId={categoryId}
```

**Query Parameters:**
- `categoryId` (optional): Filter items by category

**Headers:**
- `Authorization`: Bearer {PAT}
- `X-Restaurant-Id`: {restaurantId}
- `Accept-Language`: en | ar

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item_abc123",
        "categoryId": "cat_abc123",
        "name": "برجر دجاج كلاسيك",
        "nameEn": "Classic Chicken Burger",
        "description": "برجر دجاج طازج مع الخس والطماطم والصلصة الخاصة",
        "descriptionEn": "Fresh chicken burger with lettuce, tomato and special sauce",
        "price": 3500,
        "priceFormatted": "35.00 ر.س",
        "imageUrl": "https://storage.example.com/items/chicken-burger.jpg",
        "isAvailable": true,
        "calories": 450,
        "preparationTime": 15
      }
    ]
  }
}
```

## Testing

To test the implementation:

1. Navigate to `/catalog` page
2. Verify categories are displayed
3. Click on different categories to see filtered items
4. Click "All Items" to see all menu items
5. Verify images are displayed properly
6. Check that item details (price, description, etc.) are shown
7. Test in both English and Arabic languages
8. Verify responsive layout on different screen sizes

## Notes

- All item images should be properly sized and optimized on the backend
- Missing images will show a gray placeholder
- Items are fetched separately from categories to optimize loading
- Category filtering happens on the backend for better performance

