import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/cms/media');
}

export async function POST(request: Request) {
  return proxyRails('/api/v1/cms/media', {
    method: 'POST',
    body: await request.formData()
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  return proxyRails(`/api/v1/cms/media/${id}`, { method: 'DELETE' });
}
