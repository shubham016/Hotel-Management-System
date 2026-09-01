import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/accounting/journals');
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/accounting/journals', { method: 'POST', body: await request.json() });
}
