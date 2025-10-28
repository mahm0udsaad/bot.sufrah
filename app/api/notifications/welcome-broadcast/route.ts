import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

const BOT_API_URL = process.env.BOT_API_URL || 'https://bot.sufrah.sa';
const DASHBOARD_PAT = process.env.DASHBOARD_PAT || '';

/**
 * POST /api/notifications/welcome-broadcast
 * Trigger a welcome broadcast to customers
 * 
 * Per-restaurant PAT call: { "force": true }
 * Admin call for specific tenant: { "restaurantId": "..." }
 * Admin broadcast to everyone: { "scope": "all" }
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

    const body = await request.json();
    const { force = false, restaurantId, scope } = body;

    // Determine if this is an admin call
    const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
    const tenantId = restaurantId || session.user.tenantId || session.user.restaurant?.id;

    if (!isAdmin && !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant ID' },
        { status: 400 }
      );
    }

    // Prepare request body for bot server
    const requestBody: any = {};
    
    if (isAdmin && scope === 'all') {
      // Admin broadcast to everyone
      requestBody.scope = 'all';
    } else if (isAdmin && restaurantId) {
      // Admin call for specific tenant
      requestBody.restaurantId = restaurantId;
    } else {
      // Per-restaurant PAT call
      requestBody.force = force;
    }

    // Call bot server API
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHBOARD_PAT}`,
    };

    if (tenantId && !requestBody.scope) {
      headers['X-Restaurant-Id'] = tenantId;
    }

    const response = await fetch(`${BOT_API_URL}/api/notifications/welcome-broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
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
        delivered: data.data?.delivered || data.delivered || 0,
        skipped: data.data?.skipped || data.skipped || 0,
        failed: data.data?.failed || data.failed || 0,
      },
    });
  } catch (error) {
    console.error('Welcome broadcast error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger welcome broadcast',
      },
      { status: 500 }
    );
  }
}

