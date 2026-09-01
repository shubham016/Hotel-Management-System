import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.toString();
  return proxyRails(`/api/v1/pms/rooms${search ? `?${search}` : ''}`);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = body.roomId || body.id || 'lookup';
  return proxyRails(`/api/v1/pms/rooms/${id}`, { method: 'PATCH', body });
}
