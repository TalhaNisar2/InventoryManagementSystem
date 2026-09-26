"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Plus, Search, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, stockStatus } from "@/lib/store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Drawer from "@/components/Drawer";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import ProductForm from "@/components/ProductForm";
import { Select } from "@/components/FormControls";
import { Product } from "@/lib/types";

const PAGE_SIZE = 8;

function margin(costPrice: number, sellPrice: number) {
  if (sellPrice <= 0) return 0;
  return ((sellPrice - costPrice) / sellPrice) * 100;
}

function ProductsView() {
  const searchParams = useSearchParams();
  const products = useStore((s) => s.products);
  const currency = useStore((s) => s.currency);
  const categories = useStore((s) => s.categories);
  const suppliers = useStore((s) => s.suppliers);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Product | undefined>(undefined);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const status = stockStatus(p.quantity, p.reorderLevel);
      const matchesQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.categoryId === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "attention" && status !== "in-stock") ||
        status === statusFilter;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [products, query, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() {
    setEditing(undefined);
    setDrawerOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setDrawerOpen(true);
  }
  function handleDelete() {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
    }
    setDeleteTarget(undefined);
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${formatNumber(products.length)} items tracked across your warehouse`}
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
          >
            <Plus size={16} /> Add product
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or SKU"
            className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          wrapperClassName="sm:w-48"
          className="bg-surface"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          wrapperClassName="sm:w-48"
          className="bg-surface"
        >
          <option value="all">All statuses</option>
          <option value="in-stock">In stock</option>
          <option value="low-stock">Low stock</option>
          <option value="out-of-stock">Out of stock</option>
          <option value="attention">Needs attention</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your filters, or add a new product to your inventory."
            action={
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
              >
                <Plus size={16} /> Add product
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="mt-5 space-y-3 md:hidden">
            {paged.map((p) => {
              const status = stockStatus(p.quantity, p.reorderLevel);
              const category = categoryById.get(p.categoryId);
              const supplier = supplierById.get(p.supplierId);
              return (
                <div key={p.id} className="rounded-xl border border-line bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-muted">{p.sku}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink/70">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category?.color }} />
                    {category?.name ?? "—"}
                    <span className="text-line">·</span>
                    <span className="text-muted">{p.location}</span>
                    <span className="text-line">·</span>
                    <span className="text-muted">{supplier?.name ?? "No supplier"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-paper p-2.5 text-center text-xs">
                    <div>
                      <p className="text-muted">Cost</p>
                      <p className="mt-0.5 font-medium text-ink">{formatCurrency(p.costPrice, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Sell</p>
                      <p className="mt-0.5 font-medium text-ink">{formatCurrency(p.sellPrice, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Stock</p>
                      <p className="mt-0.5 font-medium text-ink">
                        {formatNumber(p.quantity)} {p.unit}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper"
                    >
                      <SquarePen size={13} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop / tablet: table */}
          <div className="mt-5 hidden overflow-hidden rounded-xl border border-line bg-surface shadow-card md:block">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-line bg-paper/60 text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Stock</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Cost price</th>
                    <th className="px-5 py-3 font-medium">Sell price</th>
                    <th className="px-5 py-3 font-medium">Margin</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paged.map((p) => {
                    const status = stockStatus(p.quantity, p.reorderLevel);
                    const category = categoryById.get(p.categoryId);
                    const supplier = supplierById.get(p.supplierId);
                    const m = margin(p.costPrice, p.sellPrice);
                    return (
                      <tr key={p.id} className="align-top hover:bg-paper/50">
                        <td className="px-5 py-3.5">
                          <p className="break-words font-medium leading-snug text-ink" title={p.name}>
                            {p.name}
                          </p>
                          <p className="text-xs text-muted">{p.sku}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 break-words text-ink/80">
                            <span
                              className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: category?.color }}
                            />
                            {category?.name ?? "—"}
                          </span>
                          <p className="mt-0.5 truncate text-xs text-muted">{supplier?.name ?? "No supplier"}</p>
                        </td>
                        <td className="px-5 py-3.5 text-ink">
                          {formatNumber(p.quantity)} <span className="text-muted">{p.unit}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-3.5 text-ink">{formatCurrency(p.costPrice, currency)}</td>
                        <td className="px-5 py-3.5 font-medium text-ink">{formatCurrency(p.sellPrice, currency)}</td>
                        <td className="px-5 py-3.5">
                          <span className={m >= 30 ? "text-success" : m >= 10 ? "text-warn" : "text-danger"}>
                            {m.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink"
                              aria-label={`Edit ${p.name}`}
                            >
                              <SquarePen size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-3 text-xs text-muted shadow-card md:mt-0 md:rounded-t-none md:border-t-0">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-line px-2.5 py-1 font-medium text-ink disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-line px-2.5 py-1 font-medium text-ink disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit product" : "Add product"}
        description={editing ? `Editing ${editing.sku}` : "Add a new item to your inventory"}
      >
        <ProductForm product={editing} onDone={() => setDrawerOpen(false)} />
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name ?? "product"}?`}
        description="This removes the product and its stock record. This can't be undone."
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsView />
    </Suspense>
  );
}
