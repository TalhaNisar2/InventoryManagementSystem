import { supabase, isSupabaseConfigured } from "./supabase";
import { Category, Customer, Product, Receipt, ReceiptItem, Supplier } from "./types";

/**
 * Everything that actually talks to Supabase lives here. `lib/store.ts`
 * calls these functions when `isSupabaseConfigured` is true; when it's
 * false, the store just uses local state instead (the demo dataset).
 *
 * Table names / columns match the SQL in `lib/supabase.ts`.
 */

// ---------------------------------------------------------------------
// Row <-> app-type mappers (Supabase columns are snake_case, our types
// are camelCase)
// ---------------------------------------------------------------------

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  supplier_id: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  quantity: number;
  total_received?: number;
  reorder_level: number;
  location: string;
  created_at: string;
};

function productFromRow(r: ProductRow): Product {
  const qty = Number(r.quantity);
  const total = r.total_received != null ? Number(r.total_received) : qty;
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    categoryId: r.category_id,
    supplierId: r.supplier_id,
    unit: r.unit,
    costPrice: Number(r.cost_price),
    sellPrice: Number(r.sell_price),
    quantity: qty,
    totalReceived: Math.max(total, qty),
    reorderLevel: Number(r.reorder_level),
    location: r.location,
    createdAt: (r.created_at ?? "").slice(0, 10),
  };
}

function productToRow(p: Partial<Product>) {
  const row: Record<string, unknown> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.name !== undefined) row.name = p.name;
  // Empty string breaks FK constraints — send null instead
  if (p.categoryId !== undefined) row.category_id = p.categoryId || null;
  if (p.supplierId !== undefined) row.supplier_id = p.supplierId || null;
  if (p.unit !== undefined) row.unit = p.unit;
  if (p.costPrice !== undefined) row.cost_price = p.costPrice;
  if (p.sellPrice !== undefined) row.sell_price = p.sellPrice;
  if (p.quantity !== undefined) row.quantity = p.quantity;
  if (p.totalReceived !== undefined) row.total_received = p.totalReceived;
  if (p.reorderLevel !== undefined) row.reorder_level = p.reorderLevel;
  if (p.location !== undefined) row.location = p.location;
  if (p.createdAt !== undefined) row.created_at = p.createdAt;
  return row;
}

type SupplierRow = {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  lead_time_days: number;
};

function supplierFromRow(r: SupplierRow): Supplier {
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    leadTimeDays: Number(r.lead_time_days),
  };
}

function supplierToRow(s: Partial<Supplier>) {
  const row: Record<string, unknown> = {};
  if (s.id !== undefined) row.id = s.id;
  if (s.name !== undefined) row.name = s.name;
  if (s.contactName !== undefined) row.contact_name = s.contactName;
  if (s.email !== undefined) row.email = s.email;
  if (s.phone !== undefined) row.phone = s.phone;
  if (s.address !== undefined) row.address = s.address;
  if (s.leadTimeDays !== undefined) row.lead_time_days = s.leadTimeDays;
  return row;
}


type CustomerRow = {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  created_at: string | null;
};

function customerFromRow(r: CustomerRow): Customer {
  return {
    id: r.id,
    name: r.name ?? "",
    contact: r.contact ?? "",
    address: r.address ?? "",
    createdAt: (r.created_at ?? "").slice(0, 10),
  };
}

function customerToRow(c: Partial<Customer>) {
  const row: Record<string, unknown> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.name !== undefined) row.name = c.name;
  if (c.contact !== undefined) row.contact = c.contact;
  if (c.address !== undefined) row.address = c.address;
  if (c.createdAt !== undefined) row.created_at = c.createdAt;
  return row;
}

function categoryFromRow(r: Category): Category {
  return r;
}

function categoryToRow(c: Partial<Category>) {
  return c;
}

type ReceiptRow = {
  id: string;
  type: Receipt["type"];
  receipt_number: string;
  party_name: string;
  party_contact: string;
  party_address: string;
  date: string;
  items: ReceiptItem[];
  discount_percent: number;
  tax_percent: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  note: string;
};

function receiptFromRow(r: ReceiptRow): Receipt {
  return {
    id: r.id,
    type: r.type,
    receiptNumber: r.receipt_number,
    partyName: r.party_name,
    partyContact: r.party_contact,
    partyAddress: r.party_address,
    date: r.date,
    items: r.items,
    discountPercent: Number(r.discount_percent),
    taxPercent: Number(r.tax_percent),
    subtotal: Number(r.subtotal),
    discountAmount: Number(r.discount_amount),
    taxAmount: Number(r.tax_amount),
    total: Number(r.total),
    note: r.note,
  };
}

function receiptToRow(r: Receipt) {
  return {
    id: r.id,
    type: r.type,
    receipt_number: r.receiptNumber,
    party_name: r.partyName,
    party_contact: r.partyContact,
    party_address: r.partyAddress,
    date: r.date,
    items: r.items,
    discount_percent: r.discountPercent,
    tax_percent: r.taxPercent,
    subtotal: r.subtotal,
    discount_amount: r.discountAmount,
    tax_amount: r.taxAmount,
    total: r.total,
    note: r.note,
  };
}

// ---------------------------------------------------------------------
// Fetch everything (called once on app load)
// ---------------------------------------------------------------------

export async function fetchAllFromSupabase() {
  if (!supabase) throw new Error("Supabase is not configured");

  const [productsRes, categoriesRes, suppliersRes, receiptsRes, customersRes] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("*"),
    supabase.from("suppliers").select("*"),
    supabase.from("receipts").select("*").order("date", { ascending: false }),
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (suppliersRes.error) throw suppliersRes.error;
  if (receiptsRes.error) throw receiptsRes.error;
  // customers table may not exist until migration — don't hard-fail the whole app
  if (customersRes.error) {
    console.warn("customers fetch:", customersRes.error.message);
  }

  return {
    products: (productsRes.data as ProductRow[]).map(productFromRow),
    categories: (categoriesRes.data as Category[]).map(categoryFromRow),
    suppliers: (suppliersRes.data as SupplierRow[]).map(supplierFromRow),
    receipts: (receiptsRes.data as ReceiptRow[]).map(receiptFromRow),
    customers: customersRes.error
      ? []
      : ((customersRes.data as CustomerRow[]) ?? []).map(customerFromRow),
  };
}

// ---------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------

export async function dbInsertProduct(p: Product) {
  if (!supabase) throw new Error("Supabase is not configured");
  const row = productToRow(p);
  const { error } = await supabase.from("products").insert(row);
  if (error) {
    console.error("dbInsertProduct failed", error.message, error.details, error.hint, row);
    throw error;
  }
}

export async function dbUpdateProduct(id: string, patch: Partial<Product>) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("products").update(productToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteProduct(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function dbInsertCategory(c: Category) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("categories").insert(categoryToRow(c));
  if (error) throw error;
}

export async function dbUpdateCategory(id: string, patch: Partial<Category>) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("categories").update(categoryToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteCategory(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function dbInsertSupplier(s: Supplier) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("suppliers").insert(supplierToRow(s));
  if (error) throw error;
}

export async function dbUpdateSupplier(id: string, patch: Partial<Supplier>) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("suppliers").update(supplierToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteSupplier(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}


export async function dbInsertCustomer(c: Customer) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("customers").insert(customerToRow(c));
  if (error) throw error;
}

export async function dbUpdateCustomer(id: string, patch: Partial<Customer>) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("customers").update(customerToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteCustomer(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

export async function dbInsertReceipt(r: Receipt) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("receipts").insert(receiptToRow(r));
  if (error) throw error;
}

export async function dbUpdateReceipt(id: string, r: Receipt) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("receipts").update(receiptToRow(r)).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteReceipt(id: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw error;
}

/** Used when a receipt is saved: moves stock for every line item. */
export async function dbAdjustProductQuantity(id: string, newQuantity: number, totalReceived?: number) {
  if (!supabase) throw new Error("Supabase is not configured");
  // Prefer writing total_received; if the column was never migrated, fall back to quantity-only.
  if (totalReceived !== undefined) {
    const withTotal = await supabase
      .from("products")
      .update({ quantity: newQuantity, total_received: totalReceived })
      .eq("id", id);
    if (!withTotal.error) return;
    // Column missing or other schema issue — still update quantity so stock stays correct.
    console.warn("total_received update failed, writing quantity only:", withTotal.error.message);
  }
  const { error } = await supabase.from("products").update({ quantity: newQuantity }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Realtime — keeps every connected browser in sync automatically
// ---------------------------------------------------------------------

export type RealtimeHandlers = {
  onProduct: (row: Product, deleted?: boolean) => void;
  onCategory: (row: Category, deleted?: boolean) => void;
  onSupplier: (row: Supplier, deleted?: boolean) => void;
  onCustomer: (row: Customer, deleted?: boolean) => void;
  onReceipt: (row: Receipt, deleted?: boolean) => void;
};

export function subscribeRealtime(handlers: RealtimeHandlers) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("stockbase-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          handlers.onProduct(productFromRow(payload.old as ProductRow), true);
        } else {
          handlers.onProduct(productFromRow(payload.new as ProductRow));
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "categories" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          handlers.onCategory(payload.old as Category, true);
        } else {
          handlers.onCategory(payload.new as Category);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "suppliers" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          handlers.onSupplier(supplierFromRow(payload.old as SupplierRow), true);
        } else {
          handlers.onSupplier(supplierFromRow(payload.new as SupplierRow));
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "customers" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          handlers.onCustomer(customerFromRow(payload.old as CustomerRow), true);
        } else {
          handlers.onCustomer(customerFromRow(payload.new as CustomerRow));
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "receipts" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          handlers.onReceipt(receiptFromRow(payload.old as ReceiptRow), true);
        } else {
          handlers.onReceipt(receiptFromRow(payload.new as ReceiptRow));
        }
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export { isSupabaseConfigured };
