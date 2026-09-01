import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyRails('/api/v1/contact/inquiry', { method: 'POST', body: await request.json() });
}
