"use client";

import { useState } from "react";
import { Plus, SquarePen, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import Drawer from "@/components/Drawer";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import CategoryForm from "@/components/CategoryForm";
import { Category } from "@/lib/types";

export default function CategoriesPage() {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const currency = useStore((s) => s.currency);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Category | undefined>(undefined);

  function openAdd() {
    setEditing(undefined);
    setDrawerOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setDrawerOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group products so stock and value are easy to track"
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
          >
            <Plus size={16} /> Add category
          </button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create your first category to start organizing products."
          action={
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
            >
              <Plus size={16} /> Add category
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const items = products.filter((p) => p.categoryId === c.id);
            const value = items.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
            return (
              <div key={c.id} className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <h3 className="font-display text-base font-semibold text-ink">{c.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink"
                      aria-label={`Edit ${c.name}`}
                    >
                      <SquarePen size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 min-h-[2.5rem] text-sm text-muted">{c.description || "No description"}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{formatNumber(items.length)}</p>
                    <p className="text-xs text-muted">Products</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatCurrency(value, currency)}</p>
                    <p className="text-xs text-muted">Stock value</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit category" : "Add category"}
      >
        <CategoryForm category={editing} onDone={() => setDrawerOpen(false)} />
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name ?? "category"}?`}
        description="Products in this category will no longer show a category tag."
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCategory(deleteTarget.id);
            toast.success(`${deleteTarget.name} deleted`);
          }
          setDeleteTarget(undefined);
        }}
      />
    </div>
  );
}
