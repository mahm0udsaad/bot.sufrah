import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/catalog/branches
 * Fetches restaurant branches
 * 
 * Headers:
 *   - Authorization: Bearer <PAT>
 *   - X-Restaurant-Id: <bot-id>
 *   - Accept-Language: en|ar (optional, defaults to 'en')
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

    const API_URL = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || process.env.NEXT_PUBLIC_API_URL || '';

    if (!API_URL) {
      console.error('❌ NEXT_PUBLIC_DASHBOARD_API_URL not configured');
      return NextResponse.json(
        { error: 'API URL not configured' },
        { status: 500 }
      );
    }

    // Call the branches endpoint
    const url = `${API_URL}/api/catalog/branches`;

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
    console.log(`   Branches returned: ${data.data?.branches?.length || 0}`);
    
    // Return the data as-is from the backend
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error in /api/catalog/branches:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

