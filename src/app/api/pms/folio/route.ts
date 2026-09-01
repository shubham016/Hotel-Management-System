import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyRails('/api/v1/folio', { method: 'POST', body: await request.json() });
}
