"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  ShieldCheck,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Product, Receipt, ReceiptItem, ReceiptType } from "@/lib/types";
import { receiptToExcel, receiptToPdf, receiptsToExcel } from "@/lib/receipt-export";
import PageHeader from "@/components/PageHeader";
import ReceiptPreview from "@/components/ReceiptPreview";
import EmptyState from "@/components/EmptyState";
import { Field, Input, Textarea, Select } from "@/components/FormControls";

export default function ReceiptsPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const receipts = useStore((s) => s.receipts);
  const currency = useStore((s) => s.currency);

  const totalSales = receipts.filter((r) => r.type === "sale").reduce((sum, r) => sum + r.total, 0);
  const totalPurchases = receipts.filter((r) => r.type === "purchase").reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      <PageHeader
        title="Receipts"
        description={`${receipts.length} total receipt${receipts.length === 1 ? "" : "s"} recorded so far`}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">Total receipts</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink">{receipts.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">Sales total</p>
          <p className="mt-1 font-display text-xl font-semibold text-success">{formatCurrency(totalSales, currency)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <p className="text-xs text-muted">Purchases total</p>
          <p className="mt-1 font-display text-xl font-semibold text-accent-dim">{formatCurrency(totalPurchases, currency)}</p>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {[
          { value: "new", label: "New receipt" },
          { value: "history", label: "History" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as "new" | "history")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink/70 hover:bg-paper"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "new" ? <ReceiptBuilder onSaved={() => setTab("history")} /> : <ReceiptHistory />}
    </div>
  );
}

// ---------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------

function ReceiptBuilder({ onSaved }: { onSaved: () => void }) {
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const suppliers = useStore((s) => s.suppliers);
  const currency = useStore((s) => s.currency);
  const addReceipt = useStore((s) => s.addReceipt);
  const upsertCustomerByName = useStore((s) => s.upsertCustomerByName);

  const [type, setType] = useState<ReceiptType>("sale");
  const [partyName, setPartyName] = useState("");
  const [partyContact, setPartyContact] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [note, setNote] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveCustomer, setSaveCustomer] = useState(true);

  // Browse + search: show all matching products (not only when typing)
  const productChoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !items.some((i) => i.productId === p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .slice(0, q ? 20 : 12);
  }, [search, products, items]);

  function applyCustomer(id: string) {
    setSelectedPartyId(id);
    if (!id) return;
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setPartyName(c.name);
    setPartyContact(c.contact);
    setPartyAddress(c.address);
  }

  function applySupplier(id: string) {
    setSelectedPartyId(id);
    if (!id) return;
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setPartyName(s.name);
    setPartyContact(s.phone || s.email || "");
    setPartyAddress(s.address);
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discountAmount = subtotal * (Number(discountPercent) / 100 || 0);
  const taxAmount = (subtotal - discountAmount) * (Number(taxPercent) / 100 || 0);
  const total = subtotal - discountAmount + taxAmount;

  const draftReceipt: Receipt = {
    id: "draft",
    receiptNumber: `${type === "sale" ? "INV" : "PO"}-PREVIEW`,
    type,
    partyName,
    partyContact,
    partyAddress,
    date: new Date().toISOString(),
    items,
    discountPercent: Number(discountPercent) || 0,
    taxPercent: Number(taxPercent) || 0,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    note,
  };

  function addItem(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: 1,
        unitPrice: type === "sale" ? product.sellPrice : product.costPrice,
      },
    ]);
    setSearch("");
  }

  function updateItem(index: number, patch: Partial<ReceiptItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setPartyName("");
    setPartyContact("");
    setPartyAddress("");
    setSelectedPartyId("");
    setNote("");
    setDiscountPercent("0");
    setTaxPercent("0");
    setItems([]);
    setSearch("");
  }

  function validate(): string | null {
    if (items.length === 0) return "Add at least one product to the receipt.";
    for (const it of items) {
      if (!it.quantity || it.quantity <= 0) return `Enter a valid quantity for ${it.name}.`;
      if (type === "sale") {
        const product = products.find((p) => p.id === it.productId);
        if (product && it.quantity > product.quantity) {
          return `Only ${product.quantity} ${product.unit} of ${product.name} in stock.`;
        }
      }
    }
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setConfirmOpen(true);
  }

  function handleConfirmSave() {
    setSaving(true);
    const name = partyName.trim();
    if (type === "sale" && name && saveCustomer) {
      upsertCustomerByName({
        name,
        contact: partyContact.trim(),
        address: partyAddress.trim(),
      });
    }
    const receipt = addReceipt({
      type,
      partyName: name,
      partyContact: partyContact.trim(),
      partyAddress: partyAddress.trim(),
      items,
      discountPercent: Number(discountPercent) || 0,
      taxPercent: Number(taxPercent) || 0,
      note: note.trim(),
    });
    toast.success(`${receipt.receiptNumber} saved — stock ${type === "sale" ? "reduced" : "increased"}`);
    setSaving(false);
    setConfirmOpen(false);
    resetForm();
    onSaved();
  }

  function handlePrint() {
    if (items.length === 0) {
      toast.error("Add items before printing.");
      return;
    }
    window.print();
  }

  function handlePdf() {
    if (items.length === 0) {
      toast.error("Add items before exporting.");
      return;
    }
    try {
      receiptToPdf(draftReceipt);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF. Try again or use Print.");
    }
  }

  function handleExcel() {
    if (items.length === 0) {
      toast.error("Add items before exporting.");
      return;
    }
    receiptToExcel(draftReceipt);
    toast.success("Excel file downloaded");
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="no-print space-y-5 lg:col-span-3">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="flex gap-2">
            {(["sale", "purchase"] as ReceiptType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setSelectedPartyId("");
                }}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  type === t ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink/70 hover:bg-paper/70"
                )}
              >
                {t === "sale" ? "Sales receipt" : "Purchase receipt"}
              </button>
            ))}
          </div>

          {type === "sale" ? (
            <div className="mt-4">
              <Field label="Saved customer" hint="Select an existing contact or leave blank to type a new one">
                <Select
                  value={selectedPartyId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setSelectedPartyId("");
                      return;
                    }
                    applyCustomer(id);
                  }}
                  className="bg-paper"
                >
                  <option value="">— New / type below —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.contact ? ` · ${c.contact}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="mt-4">
              <Field label="Saved supplier" hint="Pick from Suppliers or type below">
                <Select
                  value={selectedPartyId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setSelectedPartyId("");
                      return;
                    }
                    applySupplier(id);
                  }}
                  className="bg-paper"
                >
                  <option value="">— New / type below —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={type === "sale" ? "Customer name" : "Supplier name"}>
              <Input
                value={partyName}
                onChange={(e) => {
                  setPartyName(e.target.value);
                  setSelectedPartyId("");
                }}
                placeholder="Acme Co."
              />
            </Field>
            <Field label="Contact (phone or email)">
              <Input
                value={partyContact}
                onChange={(e) => setPartyContact(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Address" hint="Optional">
              <Textarea rows={2} value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} />
            </Field>
          </div>
          {type === "sale" && partyName.trim() && (
            <label className="mt-3 flex items-center gap-2 text-xs text-ink/80">
              <input
                type="checkbox"
                checked={saveCustomer}
                onChange={(e) => setSaveCustomer(e.target.checked)}
                className="rounded border-line"
              />
              Save this customer for next time
            </label>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Items</h2>
          <p className="mt-1 text-xs text-muted">Search or browse products below, then click to add.</p>
          <div className="relative mt-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or SKU…"
              className="w-full rounded-md border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:bg-surface focus:outline-none"
            />
          </div>
          {products.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-line py-4 text-center text-sm text-muted">
              No products yet. Add products first, then come back here.
            </p>
          ) : productChoices.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-line py-4 text-center text-sm text-muted">
              {search.trim() ? "No products match your search." : "All products are already on this receipt."}
            </p>
          ) : (
            <div className="mt-3 max-h-52 overflow-y-auto rounded-md border border-line divide-y divide-line">
              {productChoices.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addItem(p.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-paper"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{p.name}</span>
                    <span className="text-xs text-muted">
                      {p.sku} · available {p.quantity}/{p.totalReceived ?? p.quantity} {p.unit}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent-dim">
                    <Plus size={14} /> Add
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {items.length === 0 && (
              <p className="rounded-md border border-dashed border-line py-6 text-center text-sm text-muted">
                Search above to add products
              </p>
            )}
            {items.map((item, i) => (
              <div key={`${item.productId}-${i}`} className="rounded-md border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-muted">{item.sku}</p>
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="shrink-0 rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: Math.max(0, Math.round(Number(e.target.value))) })}
                      className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-accent/50 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Unit price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: Math.max(0, Number(e.target.value)) })}
                      className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-accent/50 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="mt-4 rounded-md border border-line bg-paper p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <ArrowRight size={12} className="text-muted" /> Stock impact
              </p>
              <p className="mt-1 text-xs text-muted">
                Saving this {type === "sale" ? "sales" : "purchase"} receipt will {type === "sale" ? "reduce" : "increase"} stock
                for each item below, immediately and automatically. There's no separate confirmation step after this — the
                change happens the moment you save.
              </p>
              <div className="mt-2.5 space-y-1.5">
                {items.map((item, i) => {
                  const product = products.find((p) => p.id === item.productId);
                  const current = product?.quantity ?? 0;
                  const after = type === "sale" ? Math.max(0, current - item.quantity) : current + item.quantity;
                  return (
                    <div key={`${item.productId}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-ink/80">{item.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5 font-medium">
                        <span className="text-muted">{current}</span>
                        <ArrowRight size={11} className="text-muted" />
                        <span className={type === "sale" ? "text-danger" : "text-success"}>{after}</span>
                        <span className="text-muted">{item.unit}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Discount %">
              <Input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
            </Field>
            <Field label="Tax %">
              <Input type="number" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Note" hint="Optional — shows on the printed receipt">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-soft disabled:opacity-60"
          >
            <ReceiptIcon size={16} /> Save & record stock
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handlePdf}
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
          >
            <Download size={16} /> PDF
          </button>
          <button
            onClick={handleExcel}
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-20">
          <ReceiptPreview receipt={draftReceipt} />
        </div>
      </div>

      {confirmOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-pop sm:rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-accent">
                <ShieldCheck size={17} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Confirm stock change</h3>
                <p className="text-xs text-muted">
                  {type === "sale" ? "Sales receipt — stock will go down" : "Purchase receipt — stock will go up"}
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-line bg-paper p-3">
              {items.map((item, i) => {
                const product = products.find((p) => p.id === item.productId);
                const current = product?.quantity ?? 0;
                const after = type === "sale" ? Math.max(0, current - item.quantity) : current + item.quantity;
                return (
                  <div key={`${item.productId}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-ink/80">{item.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 font-medium">
                      <span className="text-muted">{current}</span>
                      <ArrowRight size={11} className="text-muted" />
                      <span className={type === "sale" ? "text-danger" : "text-success"}>{after}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted">
              Total: <span className="font-medium text-ink">{formatCurrency(total, currency)}</span>. This updates stock
              immediately — to undo it, create a matching {type === "sale" ? "purchase" : "sales"} receipt for the same
              quantities.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft disabled:opacity-60"
              >
                {saving ? "Saving…" : "Confirm & save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// History
// ---------------------------------------------------------------------

function ReceiptHistory() {
  const receipts = useStore((s) => s.receipts);
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const currency = useStore((s) => s.currency);
  const deleteReceipt = useStore((s) => s.deleteReceipt);
  const updateReceipt = useStore((s) => s.updateReceipt);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ReceiptType>("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [viewing, setViewing] = useState<Receipt | undefined>(undefined);
  const [editing, setEditing] = useState<Receipt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Receipt | undefined>(undefined);

  const partyNames = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      if (r.partyName.trim()) set.add(r.partyName.trim());
    });
    customers.forEach((c) => {
      if (c.name.trim()) set.add(c.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [receipts, customers]);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      const matchesQuery =
        !query.trim() ||
        r.receiptNumber.toLowerCase().includes(query.toLowerCase()) ||
        r.partyName.toLowerCase().includes(query.toLowerCase()) ||
        r.partyContact.toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const matchesContact =
        contactFilter === "all" ||
        r.partyName.trim().toLowerCase() === contactFilter.toLowerCase();
      return matchesQuery && matchesType && matchesContact;
    });
  }, [receipts, query, typeFilter, contactFilter]);

  if (receipts.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="No receipts yet"
        description="Sales and purchase receipts you save will show up here."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search receipt # or party"
              className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | ReceiptType)}
            wrapperClassName="sm:w-40"
            className="bg-surface"
          >
            <option value="all">All types</option>
            <option value="sale">Sales</option>
            <option value="purchase">Purchases</option>
          </Select>
          <Select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            wrapperClassName="sm:w-48"
            className="bg-surface"
          >
            <option value="all">All contacts</option>
            {partyNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <button
          onClick={() => {
            receiptsToExcel(filtered);
            toast.success("Excel file downloaded");
          }}
          className="flex items-center gap-1.5 self-start rounded-md border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper sm:self-auto"
        >
          <FileSpreadsheet size={15} /> Export list
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-xs text-muted">
                <th className="px-5 py-3 font-medium">Receipt</th>
                <th className="px-5 py-3 font-medium">Party</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-paper/50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{r.receiptNumber}</p>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        r.type === "sale" ? "bg-success-soft text-success" : "bg-accent-soft text-accent-dim"
                      )}
                    >
                      {r.type === "sale" ? "Sale" : "Purchase"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink">{r.partyName || "—"}</td>
                  <td className="px-5 py-3.5 text-muted">{r.items.length}</td>
                  <td className="px-5 py-3.5 font-medium text-ink">{formatCurrency(r.total, currency)}</td>
                  <td className="px-5 py-3.5 text-muted">{formatDateTime(r.date)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewing(r)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setEditing(r)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop — hidden when printing */}
          <div className="no-print absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setViewing(undefined)} />
          {/*
            Modal shell must NOT have no-print: the receipt preview lives inside it.
            Print CSS uses visibility + #receipt-print-area; a parent with display:none
            would hide the receipt entirely (this is why History Print was blank).
          */}
          <div className="absolute inset-x-0 bottom-0 top-8 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-paper shadow-pop sm:inset-y-8">
            <div className="no-print flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink">{viewing.receiptNumber}</h2>
              <button onClick={() => setViewing(undefined)} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ReceiptPreview receipt={viewing} />
            </div>
            <div className="no-print flex flex-wrap gap-2 border-t border-line bg-surface px-5 py-4">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                <Printer size={15} /> Print
              </button>
              <button
                onClick={() => {
                  try {
                    receiptToPdf(viewing);
                    toast.success("PDF downloaded");
                  } catch (err) {
                    console.error(err);
                    toast.error("Could not generate PDF. Try again or use Print.");
                  }
                }}
                className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                <Download size={15} /> PDF
              </button>
              <button
                onClick={() => {
                  try {
                    receiptToExcel(viewing);
                    toast.success("Excel file downloaded");
                  } catch (err) {
                    console.error(err);
                    toast.error("Could not export Excel.");
                  }
                }}
                className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                <FileSpreadsheet size={15} /> Excel
              </button>
              <button
                onClick={() => {
                  setViewing(undefined);
                  setEditing(viewing);
                }}
                className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                <SquarePen size={15} /> Edit
              </button>
              <button
                onClick={() => {
                  setViewing(undefined);
                  setDeleteTarget(viewing);
                }}
                className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <ReceiptEditModal
          receipt={editing}
          products={products}
          currency={currency}
          onClose={() => setEditing(undefined)}
          onSave={(patch) => {
            updateReceipt(editing.id, patch);
            toast.success(`${editing.receiptNumber} updated — stock adjusted`);
            setEditing(undefined);
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setDeleteTarget(undefined)} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-pop sm:rounded-2xl">
            <h3 className="font-display text-base font-semibold text-ink">Delete {deleteTarget.receiptNumber}?</h3>
            <p className="mt-2 text-sm text-muted">
              This removes the receipt and reverses its stock effect
              ({deleteTarget.type === "sale" ? "stock will be restored" : "stock will be reduced"} for the line items).
              This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(undefined)}
                className="rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteReceipt(deleteTarget.id);
                  toast.success(`${deleteTarget.receiptNumber} deleted`);
                  setDeleteTarget(undefined);
                  setViewing(undefined);
                }}
                className="rounded-md bg-danger px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptEditModal({
  receipt,
  products,
  currency,
  onClose,
  onSave,
}: {
  receipt: Receipt;
  products: Product[];
  currency: string;
  onClose: () => void;
  onSave: (patch: {
    partyName: string;
    partyContact: string;
    partyAddress: string;
    items: ReceiptItem[];
    discountPercent: number;
    taxPercent: number;
    note: string;
  }) => void;
}) {
  const [partyName, setPartyName] = useState(receipt.partyName);
  const [partyContact, setPartyContact] = useState(receipt.partyContact);
  const [partyAddress, setPartyAddress] = useState(receipt.partyAddress);
  const [note, setNote] = useState(receipt.note);
  const [discountPercent, setDiscountPercent] = useState(String(receipt.discountPercent));
  const [taxPercent, setTaxPercent] = useState(String(receipt.taxPercent));
  const [items, setItems] = useState<ReceiptItem[]>(receipt.items.map((i) => ({ ...i })));

  function updateItem(index: number, patch: Partial<ReceiptItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (items.length === 0) {
      toast.error("Keep at least one item on the receipt.");
      return;
    }
    for (const it of items) {
      if (!it.quantity || it.quantity <= 0) {
        toast.error(`Enter a valid quantity for ${it.name}.`);
        return;
      }
      if (receipt.type === "sale") {
        const product = products.find((p) => p.id === it.productId);
        const originalQty = receipt.items
          .filter((x) => x.productId === it.productId)
          .reduce((s, x) => s + x.quantity, 0);
        const maxAllowed = (product?.quantity ?? 0) + originalQty;
        if (it.quantity > maxAllowed) {
          toast.error(`Only ${maxAllowed} ${it.unit} of ${it.name} available (including this receipt).`);
          return;
        }
      }
    }
    onSave({
      partyName: partyName.trim(),
      partyContact: partyContact.trim(),
      partyAddress: partyAddress.trim(),
      items,
      discountPercent: Number(discountPercent) || 0,
      taxPercent: Number(taxPercent) || 0,
      note: note.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-8 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-paper shadow-pop sm:inset-y-8">
        <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Edit {receipt.receiptNumber}</h2>
            <p className="text-xs text-muted">Stock will be recalculated when you save</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={receipt.type === "sale" ? "Customer name" : "Supplier name"}>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} />
            </Field>
            <Field label="Contact">
              <Input value={partyContact} onChange={(e) => setPartyContact(e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <Textarea rows={2} value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} />
          </Field>

          <div>
            <h3 className="text-sm font-semibold text-ink">Items</h3>
            <div className="mt-2 space-y-3">
              {items.map((item, i) => (
                <div key={`${item.productId}-${i}`} className="rounded-md border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-muted">{item.sku}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-muted">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: Math.max(0, Math.round(Number(e.target.value))) })
                        }
                        className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-accent/50 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-muted">Unit price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, { unitPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-accent/50 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount %">
              <Input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
            </Field>
            <Field label="Tax %">
              <Input type="number" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </Field>
          </div>
          <Field label="Note">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-surface px-5 py-4">
          <button onClick={onClose} className="rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
