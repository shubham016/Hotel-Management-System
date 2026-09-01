import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type ProxyOptions = {
  method?: string;
  body?: unknown;
  propertyCode?: string | null;
};

export async function proxyRails(path: string, options: ProxyOptions = {}) {
  const railsApiUrl = process.env.RAILS_API_URL || 'http://127.0.0.1:3001';
  const token = cookies().get('hne_session_token')?.value;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Property-Code': options.propertyCode || process.env.DEFAULT_PROPERTY_CODE || 'HNE-BTW'
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${railsApiUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => ({
    success: false,
    error: 'Rails API returned an invalid response'
  }));

  return NextResponse.json(payload, { status: response.status });
}
