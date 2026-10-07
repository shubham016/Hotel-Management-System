export type OrderItem = { menuItemId: string; name: string; quantity: number; unitPrice: string };
export type KitchenOrder = { id: string; number: string; tableId: string; table: string; outlet: string; outletCode: string; server: string; createdAt: string; status: 'PLACED' | 'PREPARING' | 'READY' | 'SERVED'; notes?: string; items: OrderItem[] };
export type DiningTable = { id: string; table_number: string; capacity: number; status: string; orders: KitchenOrder[] };
export type MenuItem = { id: string; name: string; category: string; price: number };
export type Outlet = { id: string; name: string; outletCode: string; items: MenuItem[] };

export async function posRequest(path: string, method = 'GET', body?: object) {
  const response = await fetch(`/api/pos/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to complete this request.');
  return result;
}
