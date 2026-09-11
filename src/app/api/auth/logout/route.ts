import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionProfileCookieName } from '@/lib/session-profile';

export const dynamic = 'force-dynamic';

export async function POST() {
  cookies().delete('hne_session_token');
  cookies().delete(sessionProfileCookieName);
  return NextResponse.json({ success: true });
}
