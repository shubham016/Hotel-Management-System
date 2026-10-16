import { currencyLabel } from '@/lib/display-preferences';
export type Store = { id: string; code: string; name: string };
export type Item = { id: string; sku: string; name: string; category: string; unit: string; unitPrice: number; standardCost: number; currentStock: number; minStock: number; isLow: boolean; totalValuation: number; storesBreakdown: { storeId: string; storeName: string; qty: number; value: number }[] };
export type Movement = { id: string; number: string; kind: string; itemId: string; itemName: string; sku: string; quantity: number; unit: string; totalCost: number; sourceStore: string | null; destinationStore: string | null; department: string | null; notes: string | null; businessDate: string; staff: string };
export type Supplier = { id: string; name: string; phone: string | null; email: string | null; address: string | null };
export type CatalogItem = { id: string; sku: string; name: string; unit: string; cost: number };
export type OrderLine = { id: string; itemId: string | null; description: string; unit: string | null; quantity: number; receivedQuantity: number; unitPrice: number; lineTotal: number };
export type Receipt = { id: string; number: string; store: string; deliveryReference: string; businessDate: string; staff: string; notes: string | null; accountingPosted:boolean;voucherNumber:string|null; items: (Movement & {orderUnitPrice:number;unbilledQuantity:number})[] };
export type SupplierInvoice = {id:string;documentNumber:string;invoiceReference:string;invoiceDate:string;dueDate:string;orderId:string;supplierName:string;status:string;version:number;subTotal:number;taxRate:number;taxAmount:number;grandTotal:number;declaredTotal:number;totalPaid:number;balanceDue:number;voucherNumber:string|null;reversalVoucher:string|null;voidReason:string|null;notes:string|null;matchErrors:string[];matched:boolean;items:{id:string;movementId:string;name:string;receiptNumber:string;quantity:number;unitPrice:number;lineTotal:number}[];payments:{id:string;number:string;amount:number;method:string;reference:string;businessDate:string;account:string;staff:string;voucherNumber:string}[]};
export type CashAccount = {id:string;code:string;name:string};
export type VatRate = {rate:number;from:string;until:string|null};
export type PurchaseOrder = { id: string; poNumber: string; supplierId: string | null; supplier: Supplier | null; orderDate: string; grandTotal: number; status: string; notes: string | null; cancellationReason: string | null; version: number; items: OrderLine[]; receipts: Receipt[];invoices:SupplierInvoice[] };
export const money = (amount: number) => `${currencyLabel()} ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export async function supplyRequest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/${path}`, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const json = await response.json();
  if (!response.ok || !json.success) {
    const details = json.details ? Object.entries(json.details).map(([field, errors]) => `${field.replaceAll('_', ' ')}: ${(Array.isArray(errors) ? errors : [errors]).join(', ')}`).join('; ') : '';
    throw new Error(details || json.error || 'Unable to save changes.');
  }
  return json;
}
