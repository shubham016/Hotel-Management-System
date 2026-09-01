import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/frontdesk');
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/frontdesk', { method: 'POST', body: await request.json() });
}
