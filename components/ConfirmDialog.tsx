"use client";

import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onCancel} aria-hidden />
      <div role="alertdialog" aria-modal className="relative w-full max-w-sm animate-fade-in rounded-xl bg-surface p-6 shadow-pop">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle size={19} />
        </div>
        <h3 className="mt-4 font-display text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-danger px-3.5 py-2 text-sm font-medium text-white hover:bg-danger/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
