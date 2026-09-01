import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.toString();
  return proxyRails(`/api/v1/cms/pages${search ? `?${search}` : ''}`);
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/cms/pages', { method: 'POST', body: await request.json() });
}
