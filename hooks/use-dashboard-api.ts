/**
 * React Hooks for Dashboard API
 * Provides easy-to-use hooks for all dashboard API endpoints
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '@/lib/dashboard-api';
import { useAuth } from '@/lib/auth';

type Locale = api.Locale;

// ============================================================================
// DASHBOARD OVERVIEW HOOK
// ============================================================================

export function useDashboardOverview(locale: Locale = 'en', currency: api.Currency = 'SAR') {
  const { user } = useAuth();
  const [data, setData] = useState<api.DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchDashboardOverview(tenantId, locale, currency);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, locale, currency]);

  const refetch = useCallback(async () => {
    if (!tenantId) return;
    
    setLoading(true);
    const result = await api.fetchDashboardOverview(tenantId, locale, currency);
    
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, [tenantId, locale, currency]);

  return { data, loading, error, refetch };
}

// ============================================================================
// CONVERSATIONS HOOKS
// ============================================================================

export function useConversations(
  params: { limit?: number; offset?: number; locale?: Locale } = {}
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.ConversationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchConversations(tenantId, params);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, params.limit, params.offset, params.locale]);

  const refetch = useCallback(async () => {
    if (!tenantId) return;
    
    const result = await api.fetchConversations(tenantId, params);
    if (!result.error) {
      setData(result.data);
    }
  }, [tenantId, params]);

  return { data, loading, error, refetch };
}

export function useConversationsPaginated(
  pageSize: number = 20,
  locale: Locale = 'en'
) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<api.Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !tenantId) return;

    setLoading(true);
    const result = await api.fetchConversations(tenantId, {
      limit: pageSize,
      offset,
      locale,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setConversations((prev) => [...prev, ...result.data.conversations]);
      setHasMore(result.data.pagination.hasMore);
      setOffset((prev) => prev + pageSize);
      setError(null);
    }
    setLoading(false);
  }, [loading, hasMore, tenantId, pageSize, offset, locale]);

  const reset = useCallback(() => {
    setConversations([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadMore();
    }
  }, [tenantId]);

  return { conversations, loading, hasMore, loadMore, reset, error };
}

export function useConversationTranscript(conversationId: string, locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.ConversationTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId || !conversationId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchConversationTranscript(conversationId, tenantId, locale);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [conversationId, tenantId, locale]);

  return { data, loading, error };
}

// ============================================================================
// ORDERS HOOKS
// ============================================================================

export function useOrders(
  params: {
    limit?: number;
    offset?: number;
    status?: api.OrderStatus;
    locale?: Locale;
    currency?: api.Currency;
  } = {}
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.OrdersLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchOrders(tenantId, params);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, params.limit, params.offset, params.status, params.locale, params.currency]);

  const refetch = useCallback(async () => {
    if (!tenantId) return;
    
    const result = await api.fetchOrders(tenantId, params);
    if (!result.error) {
      setData(result.data);
    }
  }, [tenantId, params]);

  return { data, loading, error, refetch };
}

export function useOrdersPaginated(
  pageSize: number = 20,
  status?: api.OrderStatus,
  locale: Locale = 'en',
  currency: api.Currency = 'SAR'
) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<api.Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !tenantId) return;

    setLoading(true);
    const result = await api.fetchOrders(tenantId, {
      limit: pageSize,
      offset,
      status,
      locale,
      currency,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setOrders((prev) => [...prev, ...result.data.orders]);
      setHasMore(result.data.pagination.hasMore);
      setOffset((prev) => prev + pageSize);
      setError(null);
    }
    setLoading(false);
  }, [loading, hasMore, tenantId, pageSize, offset, status, locale, currency]);

  const reset = useCallback(() => {
    setOrders([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadMore();
    }
  }, [tenantId]);

  return { orders, loading, hasMore, loadMore, reset, error };
}

export function useOrderStats(days: number = 30, locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchOrderStats(tenantId, { days, locale });
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, days, locale]);

  return { data, loading, error };
}

// ============================================================================
// RATINGS & REVIEWS HOOKS
// ============================================================================

export function useRatings(days: number = 30, locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.RatingsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchRatings(tenantId, { days, locale });
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, days, locale]);

  return { data, loading, error };
}

export function useReviews(
  params: {
    limit?: number;
    offset?: number;
    minRating?: number;
    withComments?: boolean;
    locale?: Locale;
  } = {}
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.ReviewsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;
      const page = Math.floor(offset / limit) + 1;
      const mapped = {
        page,
        pageSize: limit,
        rating: params.minRating,
        // withComments not supported on API; ignore
        q: undefined as string | undefined,
        locale: params.locale,
      };
      const result = await api.fetchReviews(tenantId, mapped);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, params.limit, params.offset, params.minRating, params.withComments, params.locale]);

  return { data, loading, error };
}

export function useRatingTimeline(days: number = 30, locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.RatingTimeline[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchRatingTimeline(tenantId, days, locale);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data.timeline);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, days, locale]);

  return { data, loading, error };
}

// ============================================================================
// NOTIFICATIONS HOOKS
// ============================================================================

export function useNotifications(
  includeRead: boolean = false,
  locale: Locale = 'en',
  pollInterval: number = 30000
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.NotificationsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || user?.restaurant?.id || '';

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    const result = await api.fetchNotifications(tenantId, includeRead, locale);
    
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, [tenantId, includeRead, locale]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    fetchData();

    // Poll for new notifications
    const interval = setInterval(fetchData, pollInterval);

    return () => clearInterval(interval);
  }, [tenantId, fetchData, pollInterval]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!tenantId) return;

      await api.markNotificationRead(notificationId, tenantId);
      await fetchData();
    },
    [tenantId, fetchData]
  );

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    totalCount: data?.totalCount || 0,
    loading,
    error,
    markAsRead,
    refetch: fetchData,
  };
}

// ============================================================================
// BOT MANAGEMENT HOOKS
// ============================================================================

export function useBotStatus(includeHistory: boolean = false, locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.BotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchBotStatus(tenantId, includeHistory, locale);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, includeHistory, locale]);

  const updateSettings = useCallback(
    async (settings: Parameters<typeof api.updateBotSettings>[0]) => {
      if (!tenantId) return;

      const result = await api.updateBotSettings(settings, tenantId);
      return result;
    },
    [tenantId]
  );

  return { data, loading, error, updateSettings };
}

// ============================================================================
// TEMPLATES HOOKS
// ============================================================================

export function useTemplates(
  params: {
    status?: api.TemplateStatus;
    category?: api.TemplateCategory;
    locale?: Locale;
  } = {}
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.TemplatesList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || user?.restaurant?.id || '';

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    const result = await api.fetchTemplates(tenantId, params);
    
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, [tenantId, params.status, params.category, params.locale]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [tenantId, fetchData]);

  const createTemplate = useCallback(
    async (template: Parameters<typeof api.createTemplate>[0]) => {
      if (!tenantId) return;

      const result = await api.createTemplate(template, tenantId);
      if (!result.error) {
        await fetchData();
      }
      return result;
    },
    [tenantId, fetchData]
  );

  const updateTemplate = useCallback(
    async (templateId: string, updates: Parameters<typeof api.updateTemplate>[1]) => {
      if (!tenantId) return;

      const result = await api.updateTemplate(templateId, updates, tenantId);
      if (!result.error) {
        await fetchData();
      }
      return result;
    },
    [tenantId, fetchData]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!tenantId) return;

      const result = await api.deleteTemplate(templateId, tenantId);
      if (!result.error) {
        await fetchData();
      }
      return result;
    },
    [tenantId, fetchData]
  );

  return { data, loading, error, createTemplate, updateTemplate, deleteTemplate, refetch: fetchData };
}

// ============================================================================
// CATALOG HOOKS
// ============================================================================

export function useCatalog(locale: Locale = 'en') {
  const { user } = useAuth();
  const [categories, setCategories] = useState<api.Category[]>([]);
  const [branches, setBranches] = useState<api.Branch[]>([]);
  const [syncStatus, setSyncStatus] = useState<api.SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || user?.restaurant?.id || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const [categoriesResult, branchesResult, syncResult] = await Promise.all([
        api.fetchCategories(tenantId, locale),
        api.fetchBranches(tenantId, locale),
        api.fetchSyncStatus(tenantId, locale),
      ]);

      if (categoriesResult.error || branchesResult.error || syncResult.error) {
        setError(
          categoriesResult.error || branchesResult.error || syncResult.error || 'Unknown error'
        );
      } else {
        setCategories(categoriesResult.data.categories);
        setBranches(branchesResult.data.branches);
        setSyncStatus(syncResult.data);
        setError(null);
      }

      setLoading(false);
    };

    fetchData();
  }, [tenantId, locale]);

  return { categories, branches, syncStatus, loading, error };
}

// ============================================================================
// SETTINGS & PROFILE HOOKS
// ============================================================================

export function useProfile(locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || user?.restaurant?.id || '';

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    const result = await api.fetchProfile(tenantId, locale);
    
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, [tenantId, locale]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [tenantId, fetchData]);

  const updateProfile = useCallback(
    async (updates: Parameters<typeof api.updateProfile>[0]) => {
      if (!tenantId) return;

      const result = await api.updateProfile(updates, tenantId);
      if (!result.error) {
        await fetchData();
      }
      return result;
    },
    [tenantId, fetchData]
  );

  return { data, loading, error, updateProfile, refetch: fetchData };
}

export function useAuditLogs(
  params: { limit?: number; offset?: number; locale?: Locale } = {}
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.AuditLogsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchAuditLogs(tenantId, params);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, params.limit, params.offset, params.locale]);

  return { data, loading, error };
}

// ============================================================================
// LOGS & MONITORING HOOKS
// ============================================================================

export function useLogs(
  params: {
    limit?: number;
    offset?: number;
    severity?: api.LogSeverity;
    startDate?: string;
    endDate?: string;
    locale?: Locale;
  } = {}
) {
  const { user } = useAuth();
  const [data, setData] = useState<api.LogsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || '';

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    const result = await api.fetchLogs(tenantId, params);
    
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, [tenantId, params.limit, params.offset, params.severity, params.startDate, params.endDate, params.locale]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [tenantId, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// ONBOARDING HOOKS
// ============================================================================

export function useOnboarding(locale: Locale = 'en') {
  const { user } = useAuth();
  const [data, setData] = useState<api.OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = user?.tenantId || user?.restaurantId || '';

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await api.fetchOnboardingProgress(tenantId, locale);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [tenantId, locale]);

  return { data, loading, error };
}

// ============================================================================
// HEALTH CHECK HOOK
// ============================================================================

export function useHealthCheck(pollInterval: number = 60000) {
  const [data, setData] = useState<api.HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.checkHealth();
      setData(result);
      setLoading(false);
    };

    fetchData();

    const interval = setInterval(fetchData, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return { data, loading };
}

