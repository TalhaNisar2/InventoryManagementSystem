"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Plus, SquarePen, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatNumber, initials } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import Drawer from "@/components/Drawer";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import SupplierForm from "@/components/SupplierForm";
import { Supplier } from "@/lib/types";

export default function SuppliersPage() {
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const deleteSupplier = useStore((s) => s.deleteSupplier);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | undefined>(undefined);

  function openAdd() {
    setEditing(undefined);
    setDrawerOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setDrawerOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendors you purchase stock from"
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
          >
            <Plus size={16} /> Add supplier
          </button>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Add a supplier to start linking them to products."
          action={
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
            >
              <Plus size={16} /> Add supplier
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => {
            const linkedProducts = products.filter((p) => p.supplierId === s.id);
            return (
              <div
                key={s.id}
                className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                    {initials(s.name)}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink">{s.name}</h3>
                    <p className="text-sm text-muted">{s.contactName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {s.email || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {s.phone || "—"}
                      </span>
                      {s.address && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {s.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5 sm:gap-8">
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatNumber(linkedProducts.length)}</p>
                    <p className="text-xs text-muted">Products</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{s.leadTimeDays}d</p>
                    <p className="text-xs text-muted">Lead time</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink"
                      aria-label={`Edit ${s.name}`}
                    >
                      <SquarePen size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
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
        title={editing ? "Edit supplier" : "Add supplier"}
      >
        <SupplierForm supplier={editing} onDone={() => setDrawerOpen(false)} />
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name ?? "supplier"}?`}
        description="Products linked to this supplier will keep their record but lose the supplier link."
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSupplier(deleteTarget.id);
            toast.success(`${deleteTarget.name} deleted`);
          }
          setDeleteTarget(undefined);
        }}
      />
    </div>
  );
}
