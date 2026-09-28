"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { Category, Customer, Product, Receipt, ReceiptItem, ReceiptType, StockStatus, Supplier, Transaction } from "./types";
import { seedCategories, seedProducts, seedSuppliers, seedTransactions } from "./seed-data";
import {
  isSupabaseConfigured,
  fetchAllFromSupabase,
  subscribeRealtime,
  dbInsertProduct,
  dbUpdateProduct,
  dbDeleteProduct,
  dbInsertCategory,
  dbUpdateCategory,
  dbDeleteCategory,
  dbInsertSupplier,
  dbUpdateSupplier,
  dbDeleteSupplier,
  dbInsertCustomer,
  dbUpdateCustomer,
  dbDeleteCustomer,
  dbInsertReceipt,
  dbUpdateReceipt,
  dbDeleteReceipt,
  dbAdjustProductQuantity,
} from "./db";

// ---------------------------------------------------------------------
// Two modes, switched automatically by whether Supabase env vars are set
// (see lib/supabase.ts / isSupabaseConfigured):
//
//  - NOT configured -> everything lives in localStorage, starting from the
//    seeded demo dataset. This is what you get out of the box.
//  - Configured -> every action below writes straight to Supabase, and a
//    realtime subscription (lib/db.ts) keeps every open tab/device in sync
//    automatically. The demo dataset is never written to Supabase — your
//    tables start empty and stay exactly what you put in them.
// ---------------------------------------------------------------------

type State = {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  transactions: Transaction[];
  receipts: Receipt[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  isSupabaseConfigured: boolean;
  supabaseSynced: boolean;
  supabaseError: string | null;
  initSupabase: () => Promise<void>;

  // App-wide preference — always kept in localStorage (per-browser),
  // regardless of whether Supabase is connected. Set from the Topbar.
  currency: string;
  setCurrency: (currency: string) => void;

  addProduct: (p: Omit<Product, "id" | "createdAt" | "totalReceived"> & { totalReceived?: number }) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCategory: (c: Omit<Category, "id">) => Category;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addSupplier: (s: Omit<Supplier, "id">) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  /** Find by name (case-insensitive) or create and return. */
  upsertCustomerByName: (c: Omit<Customer, "id" | "createdAt">) => Customer;

  addTransaction: (t: Omit<Transaction, "id" | "date"> & { date?: string; skipTotalReceived?: boolean }) => void;

  addReceipt: (r: {
    type: ReceiptType;
    partyName: string;
    partyContact: string;
    partyAddress: string;
    items: ReceiptItem[];
    discountPercent: number;
    taxPercent: number;
    note: string;
  }) => Receipt;
  deleteReceipt: (id: string) => void;
  updateReceipt: (
    id: string,
    patch: {
      partyName: string;
      partyContact: string;
      partyAddress: string;
      items: ReceiptItem[];
      discountPercent: number;
      taxPercent: number;
      note: string;
    }
  ) => void;
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function nextReceiptNumber(type: ReceiptType, existing: Receipt[]) {
  const prefix = type === "sale" ? "INV" : "PO";
  const count = existing.filter((r) => r.type === type).length + 1;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
}


/** Apply quantity / totalReceived deltas for one product (clamped). */
function applyStockDelta(
  set: (fn: (s: State) => Partial<State>) => void,
  get: () => State,
  productId: string,
  qtyDelta: number,
  totalDelta: number
) {
  const current = get().products.find((p) => p.id === productId);
  if (!current) return;
  const newQuantity = Math.max(0, current.quantity + qtyDelta);
  let newTotal = Math.max(0, (current.totalReceived ?? current.quantity) + totalDelta);
  if (newTotal < newQuantity) newTotal = newQuantity;

  set((s) => ({
    products: s.products.map((p) =>
      p.id === productId ? { ...p, quantity: newQuantity, totalReceived: newTotal } : p
    ),
  }));

  if (isSupabaseConfigured) {
    dbAdjustProductQuantity(productId, newQuantity, newTotal).catch((err) => {
      toast.error("Couldn't update stock quantity in Supabase");
      console.error(err);
    });
  }
}

function sumItemsByProduct(items: ReceiptItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return map;
}

/** Prefer DB/local totalReceived; do not re-inflate from receipt history during live edits. */
function mergeProductPreserveTotals(prev: Product | undefined, incoming: Product, _receipts: Receipt[]): Product {
  const base = { ...incoming };
  const qty = base.quantity ?? 0;
  const incomingTotal = base.totalReceived;
  const prevTotal = prev?.totalReceived;
  // Trust a concrete total from the row we just wrote / received
  if (incomingTotal != null && incomingTotal >= qty) {
    base.totalReceived = incomingTotal;
    return base;
  }
  if (prevTotal != null && prevTotal >= qty) {
    base.totalReceived = prevTotal;
    return base;
  }
  base.totalReceived = qty;
  return base;
}


let realtimeStarted = false;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      products: isSupabaseConfigured ? [] : seedProducts,
      categories: isSupabaseConfigured ? [] : seedCategories,
      suppliers: isSupabaseConfigured ? [] : seedSuppliers,
      customers: [],
      transactions: isSupabaseConfigured ? [] : seedTransactions,
      receipts: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      isSupabaseConfigured,
      supabaseSynced: false,
      supabaseError: null,

      currency: "PKR",
      setCurrency: (currency) => set({ currency }),

      // Fetches everything once, then opens a realtime subscription so
      // every connected browser stays in sync automatically. Safe to call
      // more than once (e.g. on every AppShell mount) — only runs once.
      initSupabase: async () => {
        if (!isSupabaseConfigured) {
          set({ supabaseSynced: true });
          return;
        }
        try {
          const data = await fetchAllFromSupabase();
          const receipts = data.receipts;
          const products = data.products.map((prod) =>
            mergeProductPreserveTotals(undefined, prod, receipts)
          );
          set({
            products,
            categories: data.categories,
            suppliers: data.suppliers,
            customers: data.customers ?? [],
            receipts,
            supabaseSynced: true,
            supabaseError: null,
          });
        } catch (err) {
          console.error(err);
          set({ supabaseError: err instanceof Error ? err.message : "Failed to load from Supabase" });
          toast.error("Couldn't load data from Supabase — check your connection details.");
        }

        if (!realtimeStarted) {
          realtimeStarted = true;
          subscribeRealtime({
            onProduct: (row, deleted) =>
              set((s) => ({
                products: deleted
                  ? s.products.filter((p) => p.id !== row.id)
                  : s.products.some((p) => p.id === row.id)
                  ? s.products.map((p) =>
                      p.id === row.id ? mergeProductPreserveTotals(p, row, s.receipts) : p
                    )
                  : [mergeProductPreserveTotals(undefined, row, s.receipts), ...s.products],
              })),
            onCategory: (row, deleted) =>
              set((s) => ({
                categories: deleted
                  ? s.categories.filter((c) => c.id !== row.id)
                  : s.categories.some((c) => c.id === row.id)
                  ? s.categories.map((c) => (c.id === row.id ? row : c))
                  : [...s.categories, row],
              })),
            onSupplier: (row, deleted) =>
              set((s) => ({
                suppliers: deleted
                  ? s.suppliers.filter((sup) => sup.id !== row.id)
                  : s.suppliers.some((sup) => sup.id === row.id)
                  ? s.suppliers.map((sup) => (sup.id === row.id ? row : sup))
                  : [...s.suppliers, row],
              })),
            onCustomer: (row, deleted) =>
              set((s) => ({
                customers: deleted
                  ? s.customers.filter((c) => c.id !== row.id)
                  : s.customers.some((c) => c.id === row.id)
                  ? s.customers.map((c) => (c.id === row.id ? row : c))
                  : [row, ...s.customers],
              })),
            onReceipt: (row, deleted) =>
              set((s) => ({
                receipts: deleted
                  ? s.receipts.filter((r) => r.id !== row.id)
                  : s.receipts.some((r) => r.id === row.id)
                  ? s.receipts.map((r) => (r.id === row.id ? row : r))
                  : [row, ...s.receipts],
              })),
          });
        }
      },

      addProduct: (p) => {
        const product: Product = {
          ...p,
          id: makeId("p"),
          createdAt: new Date().toISOString().slice(0, 10),
          totalReceived: p.totalReceived ?? p.quantity,
        };
        set((s) => ({ products: [product, ...s.products] }));
        if (isSupabaseConfigured) {
          dbInsertProduct(product).catch((err) => {
            // Roll back optimistic local add so UI matches DB
            set((s) => ({ products: s.products.filter((x) => x.id !== product.id) }));
            const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Unknown error";
            toast.error(`Couldn't save product to Supabase: ${msg}`);
            console.error(err);
          });
        }
      },
      updateProduct: (id, p) => {
        const prev = get().products.find((x) => x.id === id);
        let patch: Partial<Product> = { ...p };
        if (prev) {
          // Restock via Products tab: raising quantity on hand also raises Total added
          if (p.quantity !== undefined && p.quantity > prev.quantity) {
            const delta = p.quantity - prev.quantity;
            const baseTotal = prev.totalReceived ?? prev.quantity;
            // Only auto-bump when caller didn't set totalReceived explicitly to something else
            if (p.totalReceived === undefined) {
              patch.totalReceived = baseTotal + delta;
            }
          }
          // Lowering quantity on hand does NOT reduce Total added (units still "were received")
          const nextQty = p.quantity ?? prev.quantity;
          const nextTotal = patch.totalReceived ?? prev.totalReceived ?? prev.quantity;
          if (nextTotal < nextQty) {
            patch.totalReceived = nextQty;
          }
        }
        set((s) => ({ products: s.products.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        if (isSupabaseConfigured) {
          dbUpdateProduct(id, patch).catch((err) => {
            toast.error("Couldn't update product in Supabase");
            console.error(err);
          });
        }
      },
      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((x) => x.id !== id) }));
        if (isSupabaseConfigured) {
          dbDeleteProduct(id).catch((err) => {
            toast.error("Couldn't delete product in Supabase");
            console.error(err);
          });
        }
      },

      addCategory: (c) => {
        const category: Category = { ...c, id: makeId("cat") };
        set((s) => ({ categories: [...s.categories, category] }));
        if (isSupabaseConfigured) {
          dbInsertCategory(category).catch((err) => {
            toast.error("Couldn't save category to Supabase");
            console.error(err);
          });
        }
        return category;
      },
      updateCategory: (id, c) => {
        set((s) => ({ categories: s.categories.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
        if (isSupabaseConfigured) {
          dbUpdateCategory(id, c).catch((err) => {
            toast.error("Couldn't update category in Supabase");
            console.error(err);
          });
        }
      },
      deleteCategory: (id) => {
        set((s) => ({ categories: s.categories.filter((x) => x.id !== id) }));
        if (isSupabaseConfigured) {
          dbDeleteCategory(id).catch((err) => {
            toast.error("Couldn't delete category in Supabase");
            console.error(err);
          });
        }
      },

      addSupplier: (sup) => {
        const supplier: Supplier = { ...sup, id: makeId("sup") };
        set((s) => ({ suppliers: [...s.suppliers, supplier] }));
        if (isSupabaseConfigured) {
          dbInsertSupplier(supplier).catch((err) => {
            toast.error("Couldn't save supplier to Supabase");
            console.error(err);
          });
        }
        return supplier;
      },
      updateSupplier: (id, sup) => {
        set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...sup } : x)) }));
        if (isSupabaseConfigured) {
          dbUpdateSupplier(id, sup).catch((err) => {
            toast.error("Couldn't update supplier in Supabase");
            console.error(err);
          });
        }
      },
      deleteSupplier: (id) => {
        set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) }));
        if (isSupabaseConfigured) {
          dbDeleteSupplier(id).catch((err) => {
            toast.error("Couldn't delete supplier in Supabase");
            console.error(err);
          });
        }
      },

      addCustomer: (c) => {
        const customer: Customer = {
          ...c,
          id: makeId("cust"),
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ customers: [customer, ...s.customers] }));
        if (isSupabaseConfigured) {
          dbInsertCustomer(customer).catch((err) => {
            toast.error("Couldn't save customer to Supabase");
            console.error(err);
          });
        }
        return customer;
      },
      updateCustomer: (id, c) => {
        set((s) => ({ customers: s.customers.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
        if (isSupabaseConfigured) {
          dbUpdateCustomer(id, c).catch((err) => {
            toast.error("Couldn't update customer in Supabase");
            console.error(err);
          });
        }
      },
      deleteCustomer: (id) => {
        set((s) => ({ customers: s.customers.filter((x) => x.id !== id) }));
        if (isSupabaseConfigured) {
          dbDeleteCustomer(id).catch((err) => {
            toast.error("Couldn't delete customer in Supabase");
            console.error(err);
          });
        }
      },
      upsertCustomerByName: (c) => {
        const name = c.name.trim();
        if (!name) {
          return { id: "", name: "", contact: "", address: "", createdAt: "" };
        }
        const existing = get().customers.find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          const patch = {
            contact: c.contact.trim() || existing.contact,
            address: c.address.trim() || existing.address,
          };
          get().updateCustomer(existing.id, patch);
          return { ...existing, ...patch };
        }
        return get().addCustomer({
          name,
          contact: c.contact.trim(),
          address: c.address.trim(),
        });
      },

      // Internal ledger used to move stock quantities. Populated
      // automatically by addReceipt below. Only persisted locally — the
      // receipt itself is the durable record in Supabase.
      addTransaction: (t) => {
        const { skipTotalReceived, ...rest } = t;
        const transaction: Transaction = {
          id: makeId("t"),
          date: t.date ?? new Date().toISOString(),
          productId: rest.productId,
          type: rest.type,
          quantity: rest.quantity,
          note: rest.note,
          reference: rest.reference,
        };
        set((s) => ({ transactions: [transaction, ...s.transactions] }));

        // Sales: qty down, total unchanged
        // Purchases: qty up, total up
        // Reversals use skipTotalReceived + opposite type (handled via explicit deltas below)
        if (skipTotalReceived) {
          if (t.type === "in") {
            // reverse sale → qty up, total unchanged
            applyStockDelta(set, get, t.productId, t.quantity, 0);
          } else {
            // reverse purchase → qty down, total down
            applyStockDelta(set, get, t.productId, -t.quantity, -t.quantity);
          }
        } else if (t.type === "out") {
          applyStockDelta(set, get, t.productId, -t.quantity, 0);
        } else {
          applyStockDelta(set, get, t.productId, t.quantity, t.quantity);
        }
      },

      // Creates a sales or purchase receipt, records it in history, and
      // moves stock automatically (sale = stock out, purchase = stock in).
      addReceipt: (r) => {
        const subtotal = r.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        const discountAmount = subtotal * (r.discountPercent / 100);
        const taxable = subtotal - discountAmount;
        const taxAmount = taxable * (r.taxPercent / 100);
        const total = taxable + taxAmount;

        const receipt: Receipt = {
          id: makeId("rcpt"),
          receiptNumber: nextReceiptNumber(r.type, get().receipts),
          type: r.type,
          partyName: r.partyName,
          partyContact: r.partyContact,
          partyAddress: r.partyAddress,
          date: new Date().toISOString(),
          items: r.items,
          discountPercent: r.discountPercent,
          taxPercent: r.taxPercent,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          note: r.note,
        };

        set((s) => ({ receipts: [receipt, ...s.receipts] }));

        if (isSupabaseConfigured) {
          dbInsertReceipt(receipt).catch((err) => {
            toast.error("Couldn't save receipt to Supabase");
            console.error(err);
          });
        }

        // Move stock for every line item.
        for (const item of r.items) {
          get().addTransaction({
            productId: item.productId,
            type: r.type === "sale" ? "out" : "in",
            quantity: item.quantity,
            reference: receipt.receiptNumber,
            note: r.type === "sale" ? `Sold to ${r.partyName || "customer"}` : `Received from ${r.partyName || "supplier"}`,
          });
        }

        return receipt;
      },
      deleteReceipt: (id) => {
        const existing = get().receipts.find((r) => r.id === id);
        if (existing) {
          const byProduct = sumItemsByProduct(existing.items);
          for (const [productId, qty] of byProduct) {
            if (existing.type === "sale") {
              // Put sold units back; Total added unchanged
              applyStockDelta(set, get, productId, qty, 0);
            } else {
              // Undo purchase: available and total both down
              applyStockDelta(set, get, productId, -qty, -qty);
            }
          }
        }
        set((s) => ({ receipts: s.receipts.filter((r) => r.id !== id) }));
        if (isSupabaseConfigured) {
          dbDeleteReceipt(id).catch((err) => {
            toast.error("Couldn't delete receipt in Supabase");
            console.error(err);
          });
        }
      },

      updateReceipt: (id, patch) => {
        const existing = get().receipts.find((r) => r.id === id);
        if (!existing) return;

        const oldByProduct = sumItemsByProduct(existing.items);
        const newByProduct = sumItemsByProduct(patch.items);
        const productIds = new Set([...oldByProduct.keys(), ...newByProduct.keys()]);

        // Net stock change only — never reverse+reapply (that raced with realtime and inflated Total)
        for (const productId of productIds) {
          const oldQ = oldByProduct.get(productId) ?? 0;
          const newQ = newByProduct.get(productId) ?? 0;
          const diff = newQ - oldQ; // positive = more on this receipt than before
          if (diff === 0) continue;
          if (existing.type === "sale") {
            // More sold → available down; less sold → available up. Total added never changes.
            applyStockDelta(set, get, productId, -diff, 0);
          } else {
            // Purchase: more received → available + total up; less → both down
            applyStockDelta(set, get, productId, diff, diff);
          }
        }

        set((s) => ({
          transactions: [
            {
              id: makeId("t"),
              productId: "edit",
              type: "adjustment" as const,
              quantity: 0,
              note: `Edited ${existing.receiptNumber}`,
              reference: existing.receiptNumber,
              date: new Date().toISOString(),
            },
            ...s.transactions,
          ],
        }));

        const subtotal = patch.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        const discountAmount = subtotal * (patch.discountPercent / 100);
        const taxable = subtotal - discountAmount;
        const taxAmount = taxable * (patch.taxPercent / 100);
        const total = taxable + taxAmount;

        const updated: Receipt = {
          ...existing,
          partyName: patch.partyName,
          partyContact: patch.partyContact,
          partyAddress: patch.partyAddress,
          items: patch.items,
          discountPercent: patch.discountPercent,
          taxPercent: patch.taxPercent,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          note: patch.note,
        };

        set((s) => ({
          receipts: s.receipts.map((r) => (r.id === id ? updated : r)),
        }));

        if (isSupabaseConfigured) {
          dbUpdateReceipt(id, updated).catch((err) => {
            toast.error("Couldn't update receipt in Supabase");
            console.error(err);
          });
        }
      },
    }),
    {
      name: "stockbase-inventory-storage",
      skipHydration: true,
      // When Supabase is configured, Supabase is the source of truth for
      // products/categories/suppliers/receipts — don't even persist them
      // locally, and never let a stale local cache overwrite a fresh
      // fetch. Preferences (currency) always persist.
      partialize: (s) =>
        isSupabaseConfigured
          ? { transactions: s.transactions, currency: s.currency }
          : {
              products: s.products,
              categories: s.categories,
              suppliers: s.suppliers,
              customers: s.customers,
              transactions: s.transactions,
              receipts: s.receipts,
              currency: s.currency,
            },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        if (isSupabaseConfigured) {
          // Ignore any products/categories/suppliers/receipts left over
          // from a previous local-only session — Supabase always wins.
          return {
            ...current,
            transactions: p.transactions ?? current.transactions,
            currency: p.currency ?? current.currency,
            // customers come from Supabase only when configured
          };
        }
        const products = (p.products ?? current.products).map((prod) => ({
          ...prod,
          totalReceived: prod.totalReceived ?? prod.quantity,
        }));
        return { ...current, ...p, products };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function stockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= reorderLevel) return "low-stock";
  return "in-stock";
}
