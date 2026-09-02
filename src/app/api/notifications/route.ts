import { proxyRails } from '@/lib/rails-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyRails('/api/v1/notifications');
}
