import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/banquet/bookings');
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/banquet/bookings', { method: 'POST', body: await request.json() });
}
