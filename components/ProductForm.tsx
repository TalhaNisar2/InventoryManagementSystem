"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, TriangleAlert, X } from "lucide-react";
import { Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Field, Input, Select } from "./FormControls";

const QUICK_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

type FormValues = {
  name: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  unit: string;
  costPrice: string;
  sellPrice: string;
  quantity: string;
  reorderLevel: string;
  location: string;
};

function toValues(p?: Product): FormValues {
  return {
    name: p?.name ?? "",
    sku: p?.sku ?? "",
    categoryId: p?.categoryId ?? "",
    supplierId: p?.supplierId ?? "",
    unit: p?.unit ?? "pcs",
    costPrice: p ? String(p.costPrice) : "",
    sellPrice: p ? String(p.sellPrice) : "",
    quantity: p ? String(p.quantity) : "0",
    reorderLevel: p ? String(p.reorderLevel) : "20",
    location: p?.location ?? "",
  };
}

export default function ProductForm({
  product,
  onDone,
}: {
  product?: Product;
  onDone: () => void;
}) {
  const categories = useStore((s) => s.categories);
  const suppliers = useStore((s) => s.suppliers);
  const currency = useStore((s) => s.currency);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const addCategory = useStore((s) => s.addCategory);
  const addSupplier = useStore((s) => s.addSupplier);

  const [values, setValues] = useState<FormValues>(toValues(product));
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  /** Units to add on top of current stock when editing (restock). */
  const [addMore, setAddMore] = useState("");

  function set<K extends keyof FormValues>(key: K, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function handleQuickAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const color = QUICK_COLORS[categories.length % QUICK_COLORS.length];
    const created = addCategory({ name, description: "", color });
    set("categoryId", created.id);
    setNewCategoryName("");
    setAddingCategory(false);
    toast.success(`${name} category created`);
  }

  function handleQuickAddSupplier() {
    const name = newSupplierName.trim();
    if (!name) return;
    const created = addSupplier({
      name,
      contactName: "",
      email: "",
      phone: "",
      address: "",
      leadTimeDays: 7,
    });
    set("supplierId", created.id);
    setNewSupplierName("");
    setAddingSupplier(false);
    toast.success(`${name} supplier created`);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!values.name.trim()) e.name = "Product name is required";
    if (!values.sku.trim()) e.sku = "SKU is required";
    if (values.costPrice === "" || Number(values.costPrice) < 0) e.costPrice = "Enter a valid cost";
    if (values.sellPrice === "" || Number(values.sellPrice) < 0) e.sellPrice = "Enter a valid price";
    if (values.quantity === "" || Number(values.quantity) < 0) e.quantity = "Enter a valid quantity";
    if (values.reorderLevel === "" || Number(values.reorderLevel) < 0) e.reorderLevel = "Enter a valid level";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const addQty = product ? Math.max(0, Math.round(Number(addMore) || 0)) : 0;
    const baseQty = Math.round(Number(values.quantity));
    // When editing, quantity on hand = current field value + "add more" restock
    const qty = product ? baseQty + addQty : baseQty;
    const base = {
      name: values.name.trim(),
      sku: values.sku.trim().toUpperCase(),
      categoryId: values.categoryId,
      supplierId: values.supplierId,
      unit: values.unit.trim() || "pcs",
      costPrice: Number(values.costPrice),
      sellPrice: Number(values.sellPrice),
      quantity: qty,
      reorderLevel: Math.round(Number(values.reorderLevel)),
      location: values.location.trim() || "—",
    };

    if (product) {
      // Store bumps Total added when quantity increases vs previous
      updateProduct(product.id, base);
      if (addQty > 0) {
        toast.success(`${base.name} updated — added ${addQty} ${base.unit} to stock`);
      } else {
        toast.success(`${base.name} updated`);
      }
    } else {
      addProduct({ ...base, totalReceived: qty });
      toast.success(`${base.name} added`);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Product name">
        <Input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Wireless Mouse M2"
        />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="SKU">
          <Input value={values.sku} onChange={(e) => set("sku", e.target.value)} placeholder="ELX-1002" />
          {errors.sku && <p className="mt-1 text-xs text-danger">{errors.sku}</p>}
        </Field>
        <Field label="Unit">
          <Input value={values.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs, box, kg…" />
        </Field>
      </div>

      <Field label="Category" hint={categories.length === 0 ? "No categories yet — create one below, or leave uncategorized" : "Optional"}>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">{categories.length === 0 ? "Uncategorized" : "Select a category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => setAddingCategory((v) => !v)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-dashed border-line px-2.5 text-xs font-medium text-ink/70 hover:border-accent/50 hover:text-accent-dim"
          >
            {addingCategory ? <X size={13} /> : <Plus size={13} />} New
          </button>
        </div>
        {addingCategory && (
          <div className="mt-2 flex gap-2 rounded-md border border-line bg-paper p-2.5">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAddCategory();
                }
              }}
              placeholder="New category name"
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleQuickAddCategory}
              className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-soft"
            >
              Create
            </button>
          </div>
        )}
      </Field>

      <Field label="Supplier" hint={suppliers.length === 0 ? "No suppliers yet — create one below, or leave unassigned" : "Optional"}>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={values.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
              <option value="">{suppliers.length === 0 ? "Unassigned" : "Select a supplier"}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.contactName ? ` — ${s.contactName}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => setAddingSupplier((v) => !v)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-dashed border-line px-2.5 text-xs font-medium text-ink/70 hover:border-accent/50 hover:text-accent-dim"
          >
            {addingSupplier ? <X size={13} /> : <Plus size={13} />} New
          </button>
        </div>
        {addingSupplier && (
          <div className="mt-2 flex gap-2 rounded-md border border-line bg-paper p-2.5">
            <input
              autoFocus
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAddSupplier();
                }
              }}
              placeholder="New supplier name"
              className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleQuickAddSupplier}
              className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-soft"
            >
              Create
            </button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted">
          Quick-add just sets a name — fill in contact details later from the Suppliers page.
        </p>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`Cost price (${currency})`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.costPrice}
            onChange={(e) => set("costPrice", e.target.value)}
            placeholder="0.00"
          />
          {errors.costPrice && <p className="mt-1 text-xs text-danger">{errors.costPrice}</p>}
        </Field>
        <Field label={`Sell price (${currency})`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.sellPrice}
            onChange={(e) => set("sellPrice", e.target.value)}
            placeholder="0.00"
          />
          {errors.sellPrice && <p className="mt-1 text-xs text-danger">{errors.sellPrice}</p>}
        </Field>
      </div>

      {values.costPrice !== "" && values.sellPrice !== "" && Number(values.sellPrice) < Number(values.costPrice) && (
        <p className="flex items-start gap-1.5 rounded-md bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          Sell price is below cost price — this product will show a negative margin.
        </p>
      )}

      {product ? (
        <div className="space-y-3 rounded-xl border border-line bg-paper p-4">
          <p className="text-sm font-semibold text-ink">Stock</p>
          {(() => {
            const currentAvail = Math.round(Number(values.quantity) || 0);
            const currentTotal = product.totalReceived ?? product.quantity;
            const currentSold = Math.max(0, currentTotal - product.quantity);
            const addQty = Math.max(0, Math.round(Number(addMore) || 0));
            const afterAvail = currentAvail + addQty;
            const afterTotal = currentTotal + addQty;
            const unit = values.unit.trim() || product.unit || "pcs";
            return (
              <>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-surface px-2 py-2">
                    <p className="text-muted">Available</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {currentAvail} <span className="font-normal text-muted">{unit}</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-surface px-2 py-2">
                    <p className="text-muted">Sold</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {currentSold} <span className="font-normal text-muted">{unit}</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-surface px-2 py-2">
                    <p className="text-muted">Total added</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {currentTotal} <span className="font-normal text-muted">{unit}</span>
                    </p>
                  </div>
                </div>

                <Field label="Add more stock" hint="Restock — increases Available and Total added">
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 20, 50, 100].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAddMore(String(n))}
                        className={
                          "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                          (Number(addMore) === n
                            ? "border-ink bg-ink text-white"
                            : "border-line bg-surface text-ink hover:bg-paper")
                        }
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    className="mt-2"
                    value={addMore}
                    onChange={(e) => setAddMore(e.target.value)}
                    placeholder="Or type amount to add, e.g. 15"
                  />
                </Field>

                {addQty > 0 && (
                  <div className="rounded-md border border-accent/30 bg-accent-soft/40 px-3 py-2.5 text-xs text-ink">
                    <p className="font-medium">After save</p>
                    <p className="mt-1 text-muted">
                      Available: <span className="font-semibold text-ink">{currentAvail}</span>
                      {" → "}
                      <span className="font-semibold text-success">{afterAvail}</span> {unit}
                    </p>
                    <p className="mt-0.5 text-muted">
                      Total added: <span className="font-semibold text-ink">{currentTotal}</span>
                      {" → "}
                      <span className="font-semibold text-success">{afterTotal}</span> {unit}
                    </p>
                    <p className="mt-0.5 text-muted">Sold stays {currentSold} {unit}</p>
                  </div>
                )}

                <Field label="Quantity on hand" hint="Current available — change only to correct a mistake">
                  <Input
                    type="number"
                    min="0"
                    value={values.quantity}
                    onChange={(e) => set("quantity", e.target.value)}
                  />
                  {errors.quantity && <p className="mt-1 text-xs text-danger">{errors.quantity}</p>}
                </Field>
              </>
            );
          })()}
          <Field label="Reorder level" hint="Alert when stock falls to this">
            <Input
              type="number"
              min="0"
              value={values.reorderLevel}
              onChange={(e) => set("reorderLevel", e.target.value)}
            />
            {errors.reorderLevel && <p className="mt-1 text-xs text-danger">{errors.reorderLevel}</p>}
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Opening quantity" hint="Becomes both Available and Total added">
            <Input
              type="number"
              min="0"
              value={values.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
            {errors.quantity && <p className="mt-1 text-xs text-danger">{errors.quantity}</p>}
          </Field>
          <Field label="Reorder level" hint="Alert when stock falls to this">
            <Input
              type="number"
              min="0"
              value={values.reorderLevel}
              onChange={(e) => set("reorderLevel", e.target.value)}
            />
            {errors.reorderLevel && <p className="mt-1 text-xs text-danger">{errors.reorderLevel}</p>}
          </Field>
        </div>
      )}

      <Field label="Warehouse location" hint="Aisle-shelf reference, e.g. A1-04">
        <Input value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="A1-04" />
      </Field>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft">
          {product ? "Save changes" : "Add product"}
        </button>
      </div>
    </form>
  );
}