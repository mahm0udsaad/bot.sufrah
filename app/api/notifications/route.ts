import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

const BOT_API_URL = process.env.BOT_API_URL || 'https://bot.sufrah.sa';
const DASHBOARD_PAT = process.env.DASHBOARD_PAT || '';

/**
 * GET /api/notifications
 * Fetch notifications with cursor-based pagination
 * 
 * Query params:
 * - tenantId: Restaurant/bot ID (required)
 * - limit: Number of notifications to return (default: 20)
 * - cursor: Pagination cursor (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId') || session.user.tenantId || session.user.restaurant?.id;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || '';

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenantId' },
        { status: 400 }
      );
    }

    // Build query string for bot server
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    queryParams.append('limit', limit.toString());
    if (cursor) {
      queryParams.append('cursor', cursor);
    }

    // Call bot server API
    const headers: HeadersInit = {
      'Authorization': `Bearer ${DASHBOARD_PAT}`,
    };

    const response = await fetch(`${BOT_API_URL}/api/notifications?${queryParams}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `Bot server error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Ensure response matches expected format
    return NextResponse.json({
      success: true,
      data: {
        notifications: data.data?.notifications || data.notifications || [],
        nextCursor: data.data?.nextCursor || data.nextCursor || null,
        unreadCount: data.data?.unreadCount || data.unreadCount || 0,
      },
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}

