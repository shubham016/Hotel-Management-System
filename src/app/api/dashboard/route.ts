import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.toString();
  return proxyRails(`/api/v1/dashboard${search ? `?${search}` : ''}`);
}
