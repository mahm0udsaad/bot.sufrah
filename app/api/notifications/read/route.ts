import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

const BOT_API_URL = process.env.BOT_API_URL || 'https://bot.sufrah.sa';
const DASHBOARD_PAT = process.env.DASHBOARD_PAT || '';

/**
 * POST /api/notifications/read
 * Mark notifications as read
 * 
 * Query params:
 * - tenantId: Restaurant/bot ID (required)
 * 
 * Body:
 * - notificationIds: Array of notification IDs to mark as read
 */
export async function POST(request: NextRequest) {
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

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenantId' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or empty notificationIds array' },
        { status: 400 }
      );
    }

    // Call bot server API
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHBOARD_PAT}`,
    };

    const response = await fetch(`${BOT_API_URL}/api/notifications/read?tenantId=${encodeURIComponent(tenantId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notificationIds }),
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

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: data.data?.updatedCount || data.updatedCount || 0,
      },
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notifications as read',
      },
      { status: 500 }
    );
  }
}

