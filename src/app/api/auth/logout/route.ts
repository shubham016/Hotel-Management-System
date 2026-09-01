import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  cookies().delete('hne_session_token');
  return NextResponse.json({ success: true });
}
