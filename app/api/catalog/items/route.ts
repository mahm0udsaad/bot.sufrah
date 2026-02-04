import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/catalog/items
 * Fetches catalog items with optional category filtering
 * 
 * Headers:
 *   - Authorization: Bearer <PAT>
 *   - X-Restaurant-Id: <bot-id>
 *   - Accept-Language: en|ar (optional, defaults to 'en')
 * 
 * Query Parameters:
 *   - categoryId: (optional) Filter items by category
 */
export async function GET(request: NextRequest) {
  try {
    // Extract authentication from headers
    const authorization = request.headers.get('authorization');
    const restaurantId = request.headers.get('x-restaurant-id');
    const locale = request.headers.get('accept-language') || 'en';

    // Validate authentication
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Missing X-Restaurant-Id header' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const API_URL = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || process.env.NEXT_PUBLIC_API_URL || '';

    if (!API_URL) {
      console.error('❌ NEXT_PUBLIC_DASHBOARD_API_URL not configured');
      return NextResponse.json(
        { error: 'API URL not configured' },
        { status: 500 }
      );
    }

    // Build query params
    const params = new URLSearchParams();
    if (categoryId) {
      params.append('categoryId', categoryId);
    }
    
    const url = `${API_URL}/api/catalog/items${params.toString() ? '?' + params.toString() : ''}`;

    console.log('🌐 API Call: GET', url);
    console.log('   Headers: {');
    console.log(` Authorization: 'Bearer ***',`);
    console.log(` 'X-Restaurant-Id': '${restaurantId}',`);
    console.log(` 'Accept-Language': '${locale}'`);
    console.log('}');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authorization,
        'X-Restaurant-Id': restaurantId,
        'Accept-Language': locale,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed: ${url}`, response.status, response.statusText);
      const errorText = await response.text();
      console.error('   Error:', errorText);
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Success:', url);
    console.log(`   Items returned: ${data.data?.items?.length || 0}`);
    
    // Return the data as-is from the backend
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error in /api/catalog/items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

