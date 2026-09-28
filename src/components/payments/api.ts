export type PaymentRequest = {
  token: string;
  kind: 'ADVANCE' | 'CHECKOUT';
  status: 'PENDING' | 'INITIATED' | 'COMPLETED' | 'FAILED';
  gateway: 'ESEWA' | 'KHALTI' | null;
  amount: number;
  currency: 'NPR';
  folioNumber: string;
  confirmationNumber: string;
  balanceDue: number;
  totalPaid: number;
  receiptNumber?: string | null;
  paymentUrl: string;
  expiresAt: string;
  availableGateways: Array<'ESEWA' | 'KHALTI'>;
  gatewayModes: Partial<Record<'ESEWA' | 'KHALTI', 'LIVE' | 'SANDBOX'>>;
};

type Response<T> = { success: boolean; data: T; error?: string };

async function result<T>(response: globalThis.Response): Promise<T> {
  const body = await response.json() as Response<T>;
  if (!response.ok || !body.success) throw new Error(body.error || 'Payment request failed.');
  return body.data;
}

export async function createPaymentRequest(folioId: string, kind: 'ADVANCE' | 'CHECKOUT', amount?: number) {
  return result<PaymentRequest>(await fetch('/api/payment_requests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folioId, kind, amount })
  }));
}

export async function loadPaymentRequest(token: string) {
  return result<PaymentRequest>(await fetch(`/api/payment_requests/${encodeURIComponent(token)}`));
}

export async function verifyPaymentRequest(token: string) {
  return result<PaymentRequest>(await fetch(`/api/payment_requests/${encodeURIComponent(token)}/verify`, { method: 'POST' }));
}

export async function startPaymentRequest(token: string, gateway: 'ESEWA' | 'KHALTI') {
  return result<PaymentRequest & { redirect: { url: string; fields?: Record<string, string> } }>(await fetch(`/api/payment_requests/${encodeURIComponent(token)}/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gateway })
  }));
}
