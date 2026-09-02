import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return proxyRails(`/api/v1/notifications/${params.id}`, { method: 'PATCH' });
}
