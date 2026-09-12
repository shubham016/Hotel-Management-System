import { authClient } from './auth-client';

const nativeFetch = window.fetch.bind(window);

function destination(input: string, init?: RequestInit) {
  const parsed = new URL(input, window.location.origin);
  if (parsed.pathname.startsWith('/rails-api/')) return parsed.pathname + parsed.search;
  if (!parsed.pathname.startsWith('/api/')) return input;

  let path = parsed.pathname.replace(/^\/api/, '/api/v1');
  const aliases: Record<string, string> = {
    '/api/v1/audit-logs': '/api/v1/audit_logs',
    '/api/v1/pms/checkout': '/api/v1/checkout',
    '/api/v1/pms/folio': '/api/v1/folio',
    '/api/v1/pms/frontdesk': '/api/v1/frontdesk',
    '/api/v1/pms/night-audit': '/api/v1/night-audit',
    '/api/v1/pms/reservations': '/api/v1/reservations',
    '/api/v1/pos/menu-items': '/api/v1/pos/menu_items'
  };
  path = aliases[path] || path;
  if (path.startsWith('/api/v1/setup/')) path = path.replace('/api/v1/setup/', '/api/v1/');

  const method = (init?.method || 'GET').toUpperCase();
  const queryId = parsed.searchParams.get('id');
  if (queryId && ['PATCH', 'PUT', 'DELETE'].includes(method)) path += `/${encodeURIComponent(queryId)}`;
  if (path === '/api/v1/pms/rooms' && method === 'PATCH' && typeof init?.body === 'string') {
    const body = JSON.parse(init.body);
    path += `/${encodeURIComponent(body.roomId || body.id || 'lookup')}`;
  }
  return `/rails-api${path}${queryId ? '' : parsed.search}`;
}

export function installApiClient() {
  window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = destination(raw, init);
    if (url === raw && !raw.startsWith('/rails-api/')) return nativeFetch(input, init);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const token = authClient.token();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    headers.set('X-Property-Code', import.meta.env.VITE_DEFAULT_PROPERTY_CODE || 'HNE-BTW');
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return nativeFetch(url, { ...init, headers }).then(response => {
      if (response.status === 401 && token && !url.includes('/auth/login')) {
        authClient.clear();
        window.location.assign('/login');
      }
      return response;
    });
  }) as typeof window.fetch;
}
