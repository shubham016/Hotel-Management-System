import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/cms/offers');
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/cms/offers', { method: 'POST', body: await request.json() });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  return proxyRails(`/api/v1/cms/offers/${id}`, { method: 'DELETE' });
}
