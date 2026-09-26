"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { Category, Product, Receipt, ReceiptItem, ReceiptType, StockStatus, Supplier, Transaction } from "./types";
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
  dbInsertReceipt,
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

  addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCategory: (c: Omit<Category, "id">) => Category;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addSupplier: (s: Omit<Supplier, "id">) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addTransaction: (t: Omit<Transaction, "id" | "date"> & { date?: string }) => void;

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

let realtimeStarted = false;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      products: isSupabaseConfigured ? [] : seedProducts,
      categories: isSupabaseConfigured ? [] : seedCategories,
      suppliers: isSupabaseConfigured ? [] : seedSuppliers,
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
          set({
            products: data.products,
            categories: data.categories,
            suppliers: data.suppliers,
            receipts: data.receipts,
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
                  ? s.products.map((p) => (p.id === row.id ? row : p))
                  : [row, ...s.products],
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
        const product: Product = { ...p, id: makeId("p"), createdAt: new Date().toISOString().slice(0, 10) };
        set((s) => ({ products: [product, ...s.products] }));
        if (isSupabaseConfigured) {
          dbInsertProduct(product).catch((err) => {
            toast.error("Couldn't save product to Supabase");
            console.error(err);
          });
        }
      },
      updateProduct: (id, p) => {
        set((s) => ({ products: s.products.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
        if (isSupabaseConfigured) {
          dbUpdateProduct(id, p).catch((err) => {
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

      // Internal ledger used to move stock quantities. Populated
      // automatically by addReceipt below. Only persisted locally — the
      // receipt itself is the durable record in Supabase.
      addTransaction: (t) => {
        const transaction: Transaction = { ...t, id: makeId("t"), date: t.date ?? new Date().toISOString() };
        const delta = t.type === "out" ? -t.quantity : t.quantity;
        const current = get().products.find((p) => p.id === t.productId);
        const newQuantity = Math.max(0, (current?.quantity ?? 0) + delta);

        set((s) => ({
          transactions: [transaction, ...s.transactions],
          products: s.products.map((p) => (p.id === t.productId ? { ...p, quantity: newQuantity } : p)),
        }));

        if (isSupabaseConfigured) {
          dbAdjustProductQuantity(t.productId, newQuantity).catch((err) => {
            toast.error("Couldn't update stock quantity in Supabase");
            console.error(err);
          });
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
        set((s) => ({ receipts: s.receipts.filter((r) => r.id !== id) }));
        if (isSupabaseConfigured) {
          dbDeleteReceipt(id).catch((err) => {
            toast.error("Couldn't delete receipt in Supabase");
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
          };
        }
        return { ...current, ...p };
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
