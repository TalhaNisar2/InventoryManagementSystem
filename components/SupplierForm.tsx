"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Supplier } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Field, Input } from "./FormControls";

export default function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone: () => void }) {
  const addSupplier = useStore((s) => s.addSupplier);
  const updateSupplier = useStore((s) => s.updateSupplier);

  const [values, setValues] = useState({
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    address: supplier?.address ?? "",
    leadTimeDays: supplier ? String(supplier.leadTimeDays) : "7",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: keyof typeof values, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!values.name.trim()) err.name = "Supplier name is required";
    if (!values.contactName.trim()) err.contactName = "Contact name is required";
    if (!values.email.trim()) err.email = "Email is required";
    setErrors(err);
    if (Object.keys(err).length) return;

    const payload = {
      name: values.name.trim(),
      contactName: values.contactName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      leadTimeDays: Math.max(0, Math.round(Number(values.leadTimeDays) || 0)),
    };
    if (supplier) {
      updateSupplier(supplier.id, payload);
      toast.success(`${payload.name} updated`);
    } else {
      addSupplier(payload);
      toast.success(`${payload.name} added`);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Supplier name">
        <Input value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Atlas Supply Partners" />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
      </Field>
      <Field label="Contact name">
        <Input value={values.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Full name" />
        {errors.contactName && <p className="mt-1 text-xs text-danger">{errors.contactName}</p>}
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Email">
          <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
        </Field>
        <Field label="Phone">
          <Input value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
        </Field>
      </div>
      <Field label="Address">
        <Input value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, city, state" />
      </Field>
      <Field label="Lead time (days)" hint="Typical time from order to delivery">
        <Input type="number" min="0" value={values.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} />
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
          {supplier ? "Save changes" : "Add supplier"}
        </button>
      </div>
    </form>
  );
}
