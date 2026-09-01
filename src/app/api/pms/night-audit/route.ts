import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/night-audit');
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/night-audit', { method: 'POST', body: await request.json() });
}
