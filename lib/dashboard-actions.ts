'use server';

/**
 * Dashboard Server Actions
 * Server-side actions to fetch data from the bot backend API
 * Avoids CORS issues and keeps API keys secure
 */

import {
  type Locale,
  type Currency,
  type OrderStatus,
  type TemplateStatus,
  type TemplateCategory,
  type LogSeverity,
  type DashboardOverview,
  type ConversationsSummary,
  type ConversationTranscript,
  type OrdersLive,
  type OrderStats,
  type RatingsAnalytics,
  type ReviewsList,
  type RatingTimeline,
  type NotificationsList,
  type BotInfo,
  type TemplatesList,
  type Category,
  type MenuItem,
  type Branch,
  type SyncStatus,
  type RestaurantProfile,
  type AuditLogsList,
  type LogsList,
  type OnboardingProgress,
  type HealthCheck,
} from './dashboard-api';

import { formatPhoneForSufrah } from './phone-utils';

// Environment configuration - aligned with documentation
// CRITICAL: Must be absolute URL to external Bun backend, NOT relative
const API_URL = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
const DASHBOARD_PAT = process.env.NEXT_PUBLIC_DASHBOARD_PAT || '';
const DASHBOARD_API_KEY = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || process.env.NEXT_PUBLIC_BOT_API_KEY || '';

// Validation: Ensure API_URL is set and is an absolute URL
if (!API_URL) {
  console.error('❌ CRITICAL: NEXT_PUBLIC_DASHBOARD_API_URL is not set!');
  console.error('Set it in .env.local: NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3000');
}
if (API_URL && !API_URL.startsWith('http://') && !API_URL.startsWith('https://')) {
  console.error('❌ CRITICAL: NEXT_PUBLIC_DASHBOARD_API_URL must be an absolute URL (http:// or https://)');
  console.error(`Current value: "${API_URL}"`);
}

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Dashboard API Configuration:');
  console.log(`   API_URL: ${API_URL || 'NOT SET'}`);
  console.log(`   PAT: ${DASHBOARD_PAT ? '***' + DASHBOARD_PAT.slice(-4) : 'NOT SET'}`);
}

interface ApiConfig {
  restaurantId?: string;
  locale?: Locale;
  currency?: Currency;
  useApiKey?: boolean;
}

/**
 * Get authentication headers for API requests
 */
function getHeaders(config: ApiConfig = {}): HeadersInit {
  const {
    restaurantId,
    locale = 'en',
    currency = 'SAR',
    useApiKey = false,
  } = config;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept-Language': locale,
  };

  // Authentication - per documentation
  if (useApiKey) {
    headers['X-API-Key'] = DASHBOARD_API_KEY;
  } else {
    headers['Authorization'] = `Bearer ${DASHBOARD_PAT}`;
    // Restaurant ID is required with PAT for tenant isolation
    if (restaurantId) {
      headers['X-Restaurant-Id'] = restaurantId;
    }
  }

  return headers;
}

/**
 * Base fetch wrapper with error handling
 * All responses follow the pattern: { data: T, meta?: {...} }
 * Errors: { error: string }
 * 
 * IMPORTANT: Always calls external Bun backend at API_URL, never Next.js /api routes
 */
async function apiFetch<T>(
  endpoint: string,
  config: ApiConfig & RequestInit = {}
): Promise<{ data: T; meta?: any; error?: string }> {
  const { restaurantId, locale, currency, useApiKey, ...fetchOptions } = config;

  // Runtime validation
  if (!API_URL) {
    console.error('❌ API_URL not configured. Set NEXT_PUBLIC_DASHBOARD_API_URL in .env.local');
    return {
      data: null as any,
      error: 'API URL not configured. Please set NEXT_PUBLIC_DASHBOARD_API_URL environment variable.',
    };
  }

  try {
    // Construct absolute URL to external backend
    // Use X-Restaurant-Id header for tenant isolation (no tenantId query param)
    let url = `${API_URL}${endpoint}`;
    
    const headers = getHeaders({ restaurantId, locale, currency, useApiKey });
    const headersRecord = headers as Record<string, string>;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Call: ${fetchOptions.method || 'GET'} ${url}`);
      console.log(`   Headers:`, {
        'Authorization': headersRecord['Authorization'] ? 'Bearer ***' : 'NOT SET',
        'X-Restaurant-Id': headersRecord['X-Restaurant-Id'] || 'NOT SET',
        'X-API-Key': headersRecord['X-API-Key'] ? '***' : 'NOT SET',
        'Accept-Language': headersRecord['Accept-Language'],
      });
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...headers,
        ...(fetchOptions.headers || {}),
      },
      cache: fetchOptions.cache || 'no-store', // Default to no cache for fresh data
    });

    // Check if we got HTML instead of JSON (indicates wrong endpoint)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      console.error('❌ Received HTML instead of JSON. This usually means:');
      console.error('   1. The API_URL is pointing to the wrong server');
      console.error('   2. The endpoint does not exist on the backend');
      console.error(`   Request URL: ${url}`);
      console.error(`   Response Status: ${response.status}`);
      return {
        data: null as any,
        error: 'Received HTML instead of JSON. Check API_URL configuration and endpoint path.',
      };
    }

    const payload = await response.json();

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`   URL: ${url}`);
      console.error(`   Error:`, payload);
      return {
        data: null as any,
        error: payload.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Per documentation: response is { data: T, meta?: {...} }
    // Some endpoints might return data directly for backwards compatibility
    if (payload.data !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Success: ${endpoint}`);
      }
      return {
        data: payload.data,
        meta: payload.meta,
      };
    }

    // Fallback for endpoints that return data directly (backwards compatibility)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Success (unwrapped): ${endpoint}`);
    }
    return {
      data: payload as T,
    };
  } catch (error) {
    console.error('❌ API Error:', endpoint, error);
    return {
      data: null as any,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export async function getDashboardOverview(
  restaurantId: string,
  locale: Locale = 'en',
  currency: Currency = 'SAR'
) {
  return apiFetch<DashboardOverview>(
    `/api/tenants/${restaurantId}/overview?currency=${currency}`,
    { restaurantId, locale }
  );
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

export async function getConversations(
  restaurantId: string,
  params: {
    limit?: number;
    offset?: number;
    locale?: Locale;
  } = {}
) {
  const { limit = 20, offset = 0, locale = 'en' } = params;
  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return apiFetch<ConversationsSummary>(
    `/api/conversations/summary?${query}`,
    { restaurantId, locale }
  );
}

export async function getConversationTranscript(
  conversationId: string,
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<ConversationTranscript>(
    `/api/conversations/${conversationId}/transcript`,
    { restaurantId, locale }
  );
}

export async function updateConversation(
  conversationId: string,
  updates: { isBotActive?: boolean },
  restaurantId: string
) {
  return apiFetch<{ success: boolean }>(
    `/api/conversations/${conversationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
      restaurantId,
    }
  );
}

export async function exportConversation(
  conversationId: string,
  restaurantId: string
): Promise<{ success: boolean; data?: Blob; error?: string }> {
  try {
    const headers = getHeaders({ restaurantId });
    const response = await fetch(
      `${API_URL}/api/conversations/${conversationId}/export`,
      { headers }
    );

    if (!response.ok) {
      return { success: false, error: 'Export failed' };
    }

    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

// ============================================================================
// ORDERS
// ============================================================================

export async function getOrders(
  restaurantId: string,
  params: {
    limit?: number;
    offset?: number;
    status?: OrderStatus;
    locale?: Locale;
    currency?: Currency;
  } = {}
) {
  const {
    limit = 20,
    offset = 0,
    status,
    locale = 'en',
    currency = 'SAR',
  } = params;

  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    currency,
  });

  if (status) query.append('status', status);

  return apiFetch<OrdersLive>(`/api/orders/live?${query}`, {
    restaurantId,
    locale,
    currency,
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  restaurantId: string
) {
  return apiFetch<{ success: boolean }>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    restaurantId,
  });
}

export async function getOrderStats(
  restaurantId: string,
  params: { from?: string; to?: string; days?: number; locale?: Locale } = {}
) {
  const { from, to, days, locale = 'en' } = params;
  const query = new URLSearchParams();
  // Some endpoints on the external backend require tenantId explicitly in the query
  // even though X-Restaurant-Id header is sent. Include it for compatibility.
  query.append('tenantId', restaurantId);
  if (from) query.append('from', from);
  if (to) query.append('to', to);
  if (!from && !to && days) query.append('days', String(days));
  return apiFetch<OrderStats>(`/api/orders/stats?${query.toString()}`, {
    restaurantId,
    locale,
  });
}

// ============================================================================
// RATINGS & REVIEWS
// ============================================================================

export async function getRatings(
  restaurantId: string,
  params: { from?: string; to?: string; days?: number; locale?: Locale } = {}
) {
  const { from, to, days, locale = 'en' } = params;
  const query = new URLSearchParams({
    // tenant is provided via X-Restaurant-Id header
    locale: locale,
  });
  if (from) query.append('from', from);
  if (to) query.append('to', to);
  if (!from && !to && days) query.append('days', String(days));
  return apiFetch<RatingsAnalytics>(`/api/ratings?${query.toString()}`, {
    restaurantId,
    locale,
  });
}

export async function getReviews(
  restaurantId: string,
  params: {
    page?: number;
    pageSize?: number;
    rating?: number;
    q?: string;
    locale?: Locale;
  } = {}
) {
  const {
    page = 1,
    pageSize = 20,
    rating,
    q,
    locale = 'en',
  } = params;

  const query = new URLSearchParams({
    // tenant is provided via X-Restaurant-Id header
    page: String(page),
    pageSize: String(pageSize),
    locale: locale,
  });

  if (typeof rating === 'number') query.append('rating', String(rating));
  if (q) query.append('q', q);

  return apiFetch<ReviewsList>(`/api/ratings/reviews?${query.toString()}`, {
    restaurantId,
    locale,
  });
}

export async function getRatingTimeline(
  restaurantId: string,
  days: number = 30,
  locale: Locale = 'en'
) {
  return apiFetch<{ timeline: RatingTimeline[] }>(
    `/api/ratings/timeline?days=${days}&locale=${locale}`,
    { restaurantId, locale }
  );
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(
  restaurantId: string,
  limit: number = 20,
  cursor: string = '',
  locale: Locale = 'en'
) {
  const query = new URLSearchParams();
  query.append('tenantId', restaurantId);
  query.append('limit', limit.toString());
  if (cursor) query.append('cursor', cursor);

  return apiFetch<NotificationsList>(`/api/notifications?${query}`, {
    restaurantId,
    locale,
  });
}

export async function markNotificationsRead(
  notificationIds: string[],
  restaurantId: string
) {
  return apiFetch<{ success: boolean; data: { updatedCount: number } }>(
    `/api/notifications/read?tenantId=${encodeURIComponent(restaurantId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
      restaurantId,
    }
  );
}

// Backwards compatibility - single notification mark as read
export async function markNotificationRead(
  notificationId: string,
  restaurantId: string
) {
  return markNotificationsRead([notificationId], restaurantId);
}

export async function triggerWelcomeBroadcast(
  restaurantId: string,
  force: boolean = false
) {
  return apiFetch<{
    success: boolean;
    data: { delivered: number; skipped: number; failed: number };
  }>('/api/notifications/welcome-broadcast', {
    method: 'POST',
    body: JSON.stringify({ force }),
    restaurantId,
  });
}

// ============================================================================
// BOT MANAGEMENT
// ============================================================================

export async function getBotStatus(
  restaurantId: string,
  includeHistory: boolean = false,
  locale: Locale = 'en'
) {
  const query = new URLSearchParams();
  if (includeHistory) {
    query.append('include_history', 'true');
    query.append('history_hours', '24');
  }

  return apiFetch<BotInfo>(`/api/bot?${query}`, { restaurantId, locale });
}

export async function updateBotSettings(
  settings: {
    maxMessagesPerMin?: number;
    maxMessagesPerDay?: number;
    isActive?: boolean;
  },
  restaurantId: string
) {
  return apiFetch<{ success: boolean }>(`/api/bot`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
    restaurantId,
  });
}

// ============================================================================
// TEMPLATES
// ============================================================================

export async function getTemplates(
  restaurantId: string,
  params: {
    status?: TemplateStatus;
    category?: TemplateCategory;
    locale?: Locale;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, category, locale = 'en' } = params;
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const query = new URLSearchParams();
  query.append('limit', limit.toString());
  query.append('offset', offset.toString());
  if (status) query.append('status', status);
  if (category) query.append('category', category);

  const queryString = query.toString();
  const endpoint = queryString.length > 0 ? `/api/templates?${queryString}` : '/api/templates';

  return apiFetch<TemplatesList>(endpoint, {
    restaurantId,
    locale,
  });
}

export async function createTemplate(
  template: {
    name: string;
    category: TemplateCategory;
    language?: string;
    body_text: string;
    footer_text?: string;
    variables?: string[];
  },
  restaurantId: string
) {
  return apiFetch(`/api/templates`, {
    method: 'POST',
    body: JSON.stringify(template),
    restaurantId,
  });
}

export async function updateTemplate(
  templateId: string,
  updates: any,
  restaurantId: string
) {
  return apiFetch(`/api/templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    restaurantId,
  });
}

export async function deleteTemplate(templateId: string, restaurantId: string) {
  return apiFetch<{ success: boolean }>(`/api/templates/${templateId}`, {
    method: 'DELETE',
    restaurantId,
  });
}

// ============================================================================
// CATALOG
// ============================================================================

export async function getCategories(restaurantId: string, locale: Locale = 'en') {
  const result = await apiFetch<any>(`/api/catalog/categories`, {
    restaurantId,
    locale,
  });

  if (result.error) {
    return result;
  }

  // Backend now returns categories directly in the correct format
  const categories = (result.data?.categories || []).map((cat: any) => ({
    id: cat.id,
    name: cat.nameAr || cat.nameEn || cat.name || '',
    nameAr: cat.nameAr,
    nameEn: cat.nameEn,
    itemCount: cat.itemCount || 0,
    activeItemCount: cat.activeItemCount || 0,
    displayOrder: cat.displayOrder || 0,
    isActive: cat.isActive !== false,
  }));

  return {
    data: { categories },
    meta: result.meta,
  };
}

export async function getBranches(restaurantId: string, locale: Locale = 'en') {
  const result = await apiFetch<any>(`/api/catalog/branches`, {
    restaurantId,
    locale,
  });

  if (result.error) {
    return result;
  }

  // Backend now returns branches directly in the correct format
  const branches = (result.data?.branches || []).map((branch: any) => ({
    id: branch.id,
    name: branch.name || branch.nameAr || branch.nameEn || '',
    nameAr: branch.nameAr,
    nameEn: branch.nameEn,
    address: branch.address || '',
    city: branch.city || '',
    phone: branch.phone || '',
    isActive: branch.isActive !== false,
    latitude: branch.latitude,
    longitude: branch.longitude,
    workingHours: branch.workingHours,
  }));

  return {
    data: { branches },
    meta: result.meta,
  };
}

export async function getSyncStatus(restaurantId: string, locale: Locale = 'en') {
  const result = await apiFetch<any>(`/api/catalog/sync-status`, {
    restaurantId,
    locale,
  });

  if (result.error) {
    return result;
  }

  // Backend now returns sync status directly
  const syncData = result.data || {};
  
  return {
    data: {
      status: syncData.status || 'success' as const,
      lastSyncAt: syncData.lastSyncAt || new Date().toISOString(),
      itemsSynced: syncData.itemsSynced || 0,
      errors: syncData.errors || [],
    },
    meta: result.meta,
  };
}

export async function getMenuItems(restaurantId: string, locale: Locale = 'en', categoryId?: string) {
  // Use the new dedicated /api/catalog/items endpoint
  let endpoint = '/api/catalog/items';
  if (categoryId) {
    endpoint += `?categoryId=${encodeURIComponent(categoryId)}`;
  }
  
  const result = await apiFetch<any>(endpoint, {
    restaurantId,
    locale,
  });

  if (result.error) {
    return result;
  }

  // Backend now returns items directly in the correct format
  const items = result.data?.items || [];

  const transformedItems = items.map((item: any) => ({
    id: item.id,
    categoryId: item.categoryId,
    name: locale === 'ar' ? (item.nameAr || item.name) : (item.name || item.nameAr),
    nameAr: item.nameAr,
    nameEn: item.name || item.nameEn,
    description: locale === 'ar' ? (item.descriptionAr || item.description) : (item.description || item.descriptionAr),
    descriptionAr: item.descriptionAr,
    descriptionEn: item.description || item.descriptionEn,
    price: item.price || 0,
    priceAfter: item.priceAfter,
    priceFormatted: `${item.price?.toFixed(2) || '0.00'} ${item.currency || 'SAR'}`,
    imageUrl: item.imageUrl || '',
    isAvailable: item.available !== false,
    categoryName: item.categoryName || '',
    categoryNameAr: item.categoryNameAr || '',
    calories: item.calories,
    preparationTime: item.preparationTime,
  }));

  return {
    data: { items: transformedItems },
    meta: result.meta,
  };
}

// ============================================================================
// SETTINGS & PROFILE
// ============================================================================

export async function getProfile(restaurantId: string, locale: Locale = 'en') {
  return apiFetch<RestaurantProfile>(`/api/settings/profile`, {
    restaurantId,
    locale,
  });
}

export async function updateProfile(
  updates: Partial<RestaurantProfile>,
  restaurantId: string
) {
  return apiFetch(`/api/settings/profile`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    restaurantId,
  });
}

export async function getAuditLogs(
  restaurantId: string,
  params: { limit?: number; offset?: number; locale?: Locale } = {}
) {
  const { limit = 50, offset = 0, locale = 'en' } = params;

  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return apiFetch<AuditLogsList>(`/api/settings/audit-logs?${query}`, {
    restaurantId,
    locale,
  });
}

// ============================================================================
// LOGS & MONITORING
// ============================================================================

export async function getLogs(
  restaurantId: string,
  params: {
    limit?: number;
    offset?: number;
    severity?: LogSeverity;
    startDate?: string;
    endDate?: string;
    locale?: Locale;
  } = {}
) {
  const { limit = 50, offset = 0, severity, startDate, endDate, locale = 'en' } = params;

  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (severity) query.append('severity', severity);
  if (startDate) query.append('start_date', startDate);
  if (endDate) query.append('end_date', endDate);

  return apiFetch<LogsList>(`/api/logs?${query}`, { restaurantId, locale });
}

export async function exportLogs(
  restaurantId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: Blob; error?: string }> {
  try {
    const headers = getHeaders({ restaurantId });
    const query = new URLSearchParams({ start_date: startDate, end_date: endDate });

    const response = await fetch(`${API_URL}/api/logs/export?${query}`, { headers });

    if (!response.ok) {
      return { success: false, error: 'Export failed' };
    }

    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    console.error('Export logs error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

// ============================================================================
// ONBOARDING
// ============================================================================

export async function getOnboardingProgress(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<OnboardingProgress>(`/api/onboarding`, { restaurantId, locale });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      cache: 'no-store',
    });
    return await response.json();
  } catch (error) {
    return { status: 'down', error: 'Cannot reach server' };
  }
}

// ============================================================================
// USAGE & QUOTA MANAGEMENT
// ============================================================================

/**
 * Fetch usage list (admin with API key or single restaurant with PAT)
 */
export async function getUsageList(
  params: {
    limit?: number;
    offset?: number;
    locale?: Locale;
  } = {},
  useApiKey: boolean = false
) {
  const { limit = 20, offset = 0, locale = 'en' } = params;
  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return apiFetch<any>(
    `/api/usage?${query}`,
    { locale, useApiKey }
  );
}

/**
 * Fetch detailed usage for a single restaurant (admin only)
 */
export async function getUsageDetail(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<any>(
    `/api/usage/${restaurantId}`,
    { locale, useApiKey: true }
  );
}

/**
 * Fetch restaurants nearing quota (admin only)
 */
export async function getUsageAlerts(
  params: {
    threshold?: number;
    limit?: number;
    offset?: number;
    locale?: Locale;
  } = {}
) {
  const { threshold = 0.9, limit = 50, offset = 0, locale = 'en' } = params;
  const query = new URLSearchParams({
    threshold: threshold.toString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return apiFetch<any>(
    `/api/usage/alerts?${query}`,
    { locale, useApiKey: true }
  );
}

/**
 * Renew restaurant allowance (admin only)
 */
export async function renewRestaurantAllowance(
  restaurantId: string,
  amount: number = 1000,
  reason: string = 'Manual renewal'
) {
  return apiFetch<any>(
    `/api/admin/usage/${restaurantId}/renew`,
    {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
      useApiKey: true,
    }
  );
}

/**
 * Fetch usage for current restaurant (PAT)
 */
export async function getSingleRestaurantUsage(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<any>(
    `/api/usage`,
    { restaurantId, locale }
  );
}

/**
 * Fetch detailed usage for current restaurant (PAT)
 */
export async function getRestaurantUsageDetails(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<any>(
    `/api/usage/details`,
    { restaurantId, locale }
  );
  
}

/**
 * Fetch detailed usage for a restaurant (admin)
 */
export async function getRestaurantUsageDetailsAdmin(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<any>(
    `/api/usage/${restaurantId}/details`,
    { locale, useApiKey: true }
  );
}

// Note: Phone utilities are not exported from here since this is a "use server" file
// Import them directly from './phone-utils' if needed
