export type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
};

export type Customer = {
  id: string;
  name: string;
  contact: string;
  address: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  supplierId: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  /** Current available stock */
  quantity: number;
  /**
   * Lifetime units received (purchases + initial stock + manual restocks).
   * Used to show "available / total" e.g. 80/280. Never decreases on sales.
   */
  totalReceived: number;
  reorderLevel: number;
  location: string;
  createdAt: string;
};

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export type TransactionType = "in" | "out" | "adjustment";

export type Transaction = {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  note: string;
  reference: string;
  date: string;
};

export type ReceiptType = "sale" | "purchase";

export type ReceiptItem = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type Receipt = {
  id: string;
  receiptNumber: string;
  type: ReceiptType;
  partyName: string;
  partyContact: string;
  partyAddress: string;
  date: string;
  items: ReceiptItem[];
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  note: string;
};
