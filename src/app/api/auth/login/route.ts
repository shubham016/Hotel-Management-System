import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required', code: 'MISSING_CREDENTIALS' },
        { status: 400 }
      );
    }

    const railsApiUrl = process.env.RAILS_API_URL || 'http://127.0.0.1:3001';
    const railsResponse = await fetch(`${railsApiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store'
    });
    const payload = await railsResponse.json();

    if (!railsResponse.ok || !payload.success || !payload.data?.token) {
      return NextResponse.json(
        {
          success: false,
          error: payload.error || 'Invalid email or password',
          code: payload.code || 'INVALID_CREDENTIALS'
        },
        { status: railsResponse.status }
      );
    }

    const { token, ...session } = payload.data;
    cookies().set('hne_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('Rails authentication proxy error', error);
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable', code: 'AUTH_SERVICE_UNAVAILABLE' },
      { status: 503 }
    );
  }
}
