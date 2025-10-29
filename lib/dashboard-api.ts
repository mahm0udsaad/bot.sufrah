
/**
 * Dashboard API Client
 * Comprehensive client for interacting with the bot server backend
 * 
 * @deprecated Use dashboard-actions.ts for server-side calls to avoid CORS issues
 * This file is kept for type definitions and should only be used in special cases
 * where client-side API calls are absolutely necessary.
 * 
 * For most use cases, import from './dashboard-actions' instead.
 */

import { formatPhoneForSufrah } from './phone-utils';

// Environment configuration - aligned with documentation
// Note: This file is deprecated for API calls - use dashboard-actions.ts instead
// Kept only for type definitions and backwards compatibility
const API_URL = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const DASHBOARD_PAT = process.env.NEXT_PUBLIC_DASHBOARD_PAT || '';
const DASHBOARD_API_KEY = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || process.env.NEXT_PUBLIC_BOT_API_KEY || '';

export type Locale = 'en' | 'ar';
export type Currency = 'SAR' | 'USD' | 'EUR';

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
 */
async function apiFetch<T>(
  endpoint: string,
  config: ApiConfig & RequestInit = {}
): Promise<{ data: T; meta?: any; error?: string }> {
  const { restaurantId, locale, currency, useApiKey, ...fetchOptions } = config;

  try {
    const url = `${API_URL}${endpoint}`;
    const headers = getHeaders({ restaurantId, locale, currency, useApiKey });

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...headers,
        ...(fetchOptions.headers || {}),
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      return {
        data: null as any,
        error: payload.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Per documentation: response is { data: T, meta?: {...} }
    // Some endpoints might return data directly for backwards compatibility
    if (payload.data !== undefined) {
      return {
        data: payload.data,
        meta: payload.meta,
      };
    }

    // Fallback for endpoints that return data directly (backwards compatibility)
    return {
      data: payload as T,
    };
  } catch (error) {
    console.error('API Error:', endpoint, error);
    return {
      data: null as any,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export interface DashboardOverview {
  restaurantId: string;
  restaurantName: string;
  activeConversations: number;
  pendingOrders: number;
  slaBreaches: number;
  quotaUsage: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  ratingTrend: {
    averageRating: number;
    totalRatings: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
  recentActivity: {
    messagesLast24h: number;
    ordersLast24h: number;
    conversationsLast24h: number;
  };
}

export async function fetchDashboardOverview(
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

export interface Conversation {
  id: string;
  customerWa: string;
  customerName: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRelative: string;
  unreadCount: number;
  channel: 'bot' | 'agent';
  channelDisplay: string;
  escalated: boolean;
  slaStatus: {
    breached: boolean;
    minutesRemaining: number;
  };
}

export interface ConversationsSummary {
  conversations: Conversation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchConversations(
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

export interface Message {
  id: string;
  fromPhone: string;
  toPhone: string;
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video';
  content: string;
  mediaUrl: string | null;
  timestamp: string;
  timestampRelative: string;
  isFromCustomer: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface ConversationTranscript {
  conversationId: string;
  customerName: string;
  customerWa: string;
  startedAt: string;
  messages: Message[];
}

export async function fetchConversationTranscript(
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
): Promise<Blob | null> {
  try {
    const headers = getHeaders({ restaurantId });
    const response = await fetch(
      `${API_URL}/api/conversations/${conversationId}/export`,
      { headers }
    );

    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.error('Export error:', error);
    return null;
  }
}

// ============================================================================
// ORDERS
// ============================================================================

export type OrderStatus =
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  orderReference: string;
  status: OrderStatus;
  statusDisplay: string;
  customerName: string;
  totalCents: number;
  totalFormatted: string;
  currency: string;
  itemCount: number;
  createdAt: string;
  createdAtRelative: string;
  preparationTime: number;
  alerts: {
    isLate: boolean;
    awaitingPayment: boolean;
    requiresReview: boolean;
  };
}

export interface OrdersLive {
  orders: Order[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchOrders(
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

export interface OrderStats {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusBreakdown: Record<OrderStatus, number>;
}

export async function fetchOrderStats(
  restaurantId: string,
  params: { from?: string; to?: string; days?: number; locale?: Locale } = {}
) {
  const { from, to, days, locale = 'en' } = params;
  const query = new URLSearchParams();
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

export interface RatingsAnalytics {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRatings: number;
    averageRating: number;
    nps: number;
    responseRate: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
  distribution: Record<number, number>;
  segments: {
    promoters: number;
    passives: number;
    detractors: number;
    promotersPercent: number;
    passivesPercent: number;
    detractorsPercent: number;
  };
  withComments: number;
}

export async function fetchRatings(
  restaurantId: string,
  params: { from?: string; to?: string; days?: number; locale?: Locale } = {}
) {
  const { from, to, days, locale = 'en' } = params;
  const query = new URLSearchParams();
  if (from) query.append('from', from);
  if (to) query.append('to', to);
  if (!from && !to && days) query.append('days', String(days));
  return apiFetch<RatingsAnalytics>(`/api/ratings?${query.toString()}`, {
    restaurantId,
    locale,
  });
}

export interface Review {
  id: string;
  conversationId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  createdAtRelative: string;
}

export interface ReviewsList {
  reviews: Review[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchReviews(
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
    page: String(page),
    pageSize: String(pageSize),
  });

  if (typeof rating === 'number') query.append('rating', String(rating));
  if (q) query.append('q', q);

  return apiFetch<ReviewsList>(`/api/ratings/reviews?${query.toString()}`, {
    restaurantId,
    locale,
  });
}

export interface RatingTimeline {
  date: string;
  averageRating: number;
  totalRatings: number;
}

export async function fetchRatingTimeline(
  restaurantId: string,
  days: number = 30,
  locale: Locale = 'en'
) {
  return apiFetch<{ timeline: RatingTimeline[] }>(
    `/api/ratings/timeline?days=${days}`,
    { restaurantId, locale }
  );
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type NotificationType =
  | 'order_created'
  | 'conversation_started'
  | 'welcome_broadcast'
  | 'new_order'  // Kept for backwards compatibility
  | 'failed_send'
  | 'quota_warning'
  | 'template_expiring'
  | 'sla_breach'
  | 'webhook_error';

export type NotificationStatus = 'read' | 'unread';

export interface NotificationMetadata {
  orderId?: string;
  orderReference?: string;
  totalCents?: number;
  currency?: string;
  conversationId?: string;
  customerName?: string;
  customerPhone?: string;
  delivered?: number;
  skipped?: number;
  failed?: number;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  status: NotificationStatus;
  metadata?: NotificationMetadata;
  // Backwards compatibility
  message?: string;
  severity?: 'info' | 'warning' | 'error';
  data?: any;
  read?: boolean;
  createdAtRelative?: string;
}

export interface NotificationsList {
  notifications: Notification[];
  nextCursor: string | null;
  unreadCount: number;
  // Backwards compatibility
  totalCount?: number;
}

export async function fetchNotifications(
  restaurantId: string,
  includeRead: boolean = false,
  locale: Locale = 'en'
) {
  const query = new URLSearchParams();
  query.append('tenantId', restaurantId);
  if (includeRead) query.append('include_read', 'true');

  return apiFetch<NotificationsList>(`/api/notifications?${query}`, {
    restaurantId,
    locale,
  });
}

export async function markNotificationRead(
  notificationId: string,
  restaurantId: string
) {
  return apiFetch<{ success: boolean }>(`/api/notifications/${notificationId}?tenantId=${encodeURIComponent(restaurantId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ read: true }),
    restaurantId,
  });
}

// ============================================================================
// BOT MANAGEMENT
// ============================================================================

export type BotStatus = 'ACTIVE' | 'PENDING' | 'FAILED';

export interface BotInfo {
  botId: string;
  botName: string;
  whatsappNumber: string;
  status: BotStatus;
  statusDisplay: string;
  isVerified: boolean;
  verifiedAt: string | null;
  lastWebhookAt: string | null;
  webhookHealth: {
    healthy: boolean;
    errorRate: number;
    requestsLastHour: number;
    errorsLastHour: number;
  };
  rateLimits: {
    maxMessagesPerMin: number;
    maxMessagesPerDay: number;
  };
  messagesLastHour: number;
  messageHistory?: Array<{
    timestamp: string;
    sent: number;
    received: number;
    total: number;
  }>;
}

export async function fetchBotStatus(
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

export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type TemplateCategory =
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION'
  | 'ORDER_STATUS'
  | 'ORDER_UPDATE'
  | (string & {});

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  statusDisplay: string;
  templateSid?: string | null;
  usageCount?: number;
  lastUsed?: string | null;
  lastUsedRelative?: string | null;
  bodyText: string;
  footerText: string | null;
  variables: string[];
  hasVariables?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesList {
  templates: Template[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchTemplates(
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
  return apiFetch<{ template: Template }>(`/api/templates`, {
    method: 'POST',
    body: JSON.stringify(template),
    restaurantId,
  });
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<Template>,
  restaurantId: string
) {
  return apiFetch<{ template: Template }>(`/api/templates/${templateId}`, {
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

export interface Category {
  id: string;
  name: string;
  itemCount: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  priceFormatted: string;
  imageUrl?: string;
  isAvailable: boolean;
  calories?: number;
  preparationTime?: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface SyncStatus {
  lastSyncAt: string;
  status: 'success' | 'failed' | 'in_progress';
  itemsSynced: number;
  errors: string[];
}

export async function fetchCategories(restaurantId: string, locale: Locale = 'en') {
  return apiFetch<{ categories: Category[] }>(`/api/catalog/categories`, {
    restaurantId,
    locale,
  });
}

export async function fetchBranches(restaurantId: string, locale: Locale = 'en') {
  return apiFetch<{ branches: Branch[] }>(`/api/catalog/branches`, {
    restaurantId,
    locale,
  });
}

export async function fetchSyncStatus(restaurantId: string, locale: Locale = 'en') {
  return apiFetch<SyncStatus>(`/api/catalog/sync-status`, {
    restaurantId,
    locale,
  });
}

export async function fetchMenuItems(restaurantId: string, locale: Locale = 'en', categoryId?: string) {
  const params = new URLSearchParams({ locale });
  if (categoryId) {
    params.append('categoryId', categoryId);
  }
  return apiFetch<{ items: MenuItem[] }>(`/api/catalog/items?${params.toString()}`, {
    restaurantId,
    locale,
  });
}

// ============================================================================
// SETTINGS & PROFILE
// ============================================================================

export interface RestaurantProfile {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  // New branding/links
  appsLink?: string | null; // Merchant ordering URL (CTA)
  sloganPhoto?: string | null; // Marketing image; may be same as logo when no custom logo
  createdAt: string;
  updatedAt: string;
}

export async function fetchProfile(restaurantId: string, locale: Locale = 'en') {
  return apiFetch<RestaurantProfile>(`/api/settings/profile`, {
    restaurantId,
    locale,
  });
}

export async function updateProfile(
  updates: Partial<RestaurantProfile>,
  restaurantId: string
) {
  return apiFetch<{ profile: RestaurantProfile }>(`/api/settings/profile`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    restaurantId,
  });
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  details: any;
  timestamp: string;
}

export interface AuditLogsList {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchAuditLogs(
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

export type LogSeverity = 'info' | 'warning' | 'error';

export interface Log {
  id: string;
  severity: LogSeverity;
  message: string;
  details: any;
  timestamp: string;
}

export interface LogsList {
  logs: Log[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchLogs(
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
): Promise<Blob | null> {
  try {
    const headers = getHeaders({ restaurantId });
    const query = new URLSearchParams({ start_date: startDate, end_date: endDate });

    const response = await fetch(`${API_URL}/api/logs/export?${query}`, { headers });

    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.error('Export logs error:', error);
    return null;
  }
}

// ============================================================================
// ONBOARDING
// ============================================================================

export type OnboardingStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export interface OnboardingProgress {
  status: OnboardingStatus;
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
  checklist: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    required: boolean;
  }>;
  verification: {
    userVerified: boolean;
    botVerified: boolean;
    timeline: Array<{
      step: string;
      status: 'completed' | 'in_progress' | 'failed';
      timestamp: string;
      error?: string;
    }>;
  };
}

export async function fetchOnboardingProgress(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<OnboardingProgress>(`/api/onboarding`, { restaurantId, locale });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    whatsapp: 'up' | 'down';
  };
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    return await response.json();
  } catch (error) {
    return { status: 'down', error: 'Cannot reach server' };
  }
}

// ============================================================================
// USAGE & QUOTA MANAGEMENT
// ============================================================================

export interface UsageAllowance {
  dailyLimit: number;
  dailyRemaining: number;
  monthlyLimit: number;
  monthlyRemaining: number;
}

export interface UsageRecord {
  restaurantId: string;
  restaurantName: string;
  conversationsThisMonth: number;
  lastConversationAt: string | null;
  allowance: UsageAllowance;
  adjustedBy: number;
  usagePercent?: number;
  isNearingQuota: boolean;
  firstActivity: string | null;
  lastActivity: string | null;
  isActive: boolean;
}

export interface UsageHistory {
  month: number;
  year: number;
  conversationCount: number;
  lastConversationAt: string | null;
}

export interface UsageDetail extends UsageRecord {
  history: UsageHistory[];
}

export interface UsageListResponse {
  data: UsageRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UsageAlertRecord {
  restaurantId: string;
  restaurantName: string;
  used: number;
  limit: number;
  remaining: number;
  usagePercent: number;
  isNearingQuota: boolean;
  adjustedBy: number;
}

export interface UsageAlertsResponse {
  data: UsageAlertRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  threshold: number;
}

export interface RenewAllowanceResponse {
  success: boolean;
  data: {
    used: number;
    limit: number;
    effectiveLimit: number;
    adjustedBy: number;
    remaining: number;
    usagePercent?: number;
    isNearingQuota: boolean;
  };
}

export async function fetchUsageList(
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

  return apiFetch<UsageListResponse>(
    `/api/usage?${query}`,
    { locale, useApiKey }
  );
}

export async function fetchUsageDetail(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<UsageDetail>(
    `/api/usage/${restaurantId}`,
    { locale, useApiKey: true }
  );
}

export async function fetchUsageAlerts(
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

  return apiFetch<UsageAlertsResponse>(
    `/api/usage/alerts?${query}`,
    { locale, useApiKey: true }
  );
}

export async function renewRestaurantAllowance(
  restaurantId: string,
  amount: number = 1000,
  reason: string = 'Manual renewal'
) {
  return apiFetch<RenewAllowanceResponse>(
    `/api/admin/usage/${restaurantId}/renew`,
    {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
      useApiKey: true,
    }
  );
}

export interface UsageDailyBreakdown {
  date: string;
  conversationsStarted: number;
  messages: number;
}

export interface UsageAdjustment {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface UsageSession {
  id: string;
  customerPhone: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface UsageQuota {
  used: number;
  limit: number;
  effectiveLimit: number;
  adjustedBy: number;
  remaining: number;
  usagePercent?: number;
  isNearingQuota: boolean;
}

export interface UsageMonthly {
  month: number;
  year: number;
  conversationCount: number;
  lastConversationAt: string | null;
}

export interface UsageDetailResponse {
  restaurantId: string;
  restaurantName: string;
  quota: UsageQuota;
  monthlyUsage: UsageMonthly[];
  firstActivity: string | null;
  lastActivity: string | null;
  activeSessionsCount: number;
  dailyBreakdown: UsageDailyBreakdown[];
  adjustments: UsageAdjustment[];
  recentSessions: UsageSession[];
}

export async function fetchSingleRestaurantUsage(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<UsageRecord>(
    `/api/usage`,
    { restaurantId, locale }
  );
}

export async function fetchRestaurantUsageDetails(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<UsageDetailResponse>(
    `/api/usage/details`,
    { restaurantId, locale }
  );
}

export async function fetchRestaurantUsageDetailsAdmin(
  restaurantId: string,
  locale: Locale = 'en'
) {
  return apiFetch<UsageDetailResponse>(
    `/api/usage/${restaurantId}/details`,
    { locale, useApiKey: true }
  );
}

// Re-export phone utilities for convenience
export { formatPhoneForSufrah, formatPhoneForWhatsApp, normalizePhone, formatPhoneForDisplay, maskPhone } from './phone-utils';
