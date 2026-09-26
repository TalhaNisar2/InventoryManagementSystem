import { Receipt } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Boxes } from "lucide-react";

export default function ReceiptPreview({ receipt }: { receipt: Receipt }) {
  const currency = useStore((s) => s.currency);
  const isSale = receipt.type === "sale";
  return (
    <div id="receipt-print-area" className="rounded-xl border border-line bg-surface p-6 text-ink shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-accent">
            <Boxes size={18} strokeWidth={2.3} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">Stockbase</p>
            <p className="text-xs text-muted">Warehouse 04 · Central Distribution</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={
              "inline-block rounded-full px-3 py-1 text-xs font-semibold " +
              (isSale ? "bg-success-soft text-success" : "bg-accent-soft text-accent-dim")
            }
          >
            {isSale ? "Sales Receipt" : "Purchase Receipt"}
          </p>
          <p className="mt-2 text-sm font-medium">{receipt.receiptNumber || "—"}</p>
          <p className="text-xs text-muted">{formatDate(receipt.date)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-y border-line py-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {isSale ? "Billed to" : "Received from"}
          </p>
          <p className="mt-1 font-medium text-ink">{receipt.partyName || "—"}</p>
          {receipt.partyContact && <p className="text-muted">{receipt.partyContact}</p>}
          {receipt.partyAddress && <p className="whitespace-pre-line text-muted">{receipt.partyAddress}</p>}
        </div>
        {receipt.note && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Note</p>
            <p className="mt-1 whitespace-pre-line text-ink/80">{receipt.note}</p>
          </div>
        )}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 font-medium">Qty</th>
              <th className="py-2 pr-3 font-medium">Unit price</th>
              <th className="py-2 pr-0 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {receipt.items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-muted">
                  No items added yet
                </td>
              </tr>
            )}
            {receipt.items.map((item, i) => (
              <tr key={`${item.productId}-${i}`}>
                <td className="py-2.5 pr-3">
                  <p className="break-words font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-muted">{item.sku}</p>
                </td>
                <td className="py-2.5 pr-3 text-ink">
                  {item.quantity} <span className="text-muted">{item.unit}</span>
                </td>
                <td className="py-2.5 pr-3 text-ink">{formatCurrency(item.unitPrice, currency)}</td>
                <td className="py-2.5 pr-0 text-right font-medium text-ink">
                  {formatCurrency(item.quantity * item.unitPrice, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="text-ink">{formatCurrency(receipt.subtotal, currency)}</span>
          </div>
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-muted">
              <span>Discount ({receipt.discountPercent}%)</span>
              <span className="text-danger">-{formatCurrency(receipt.discountAmount, currency)}</span>
            </div>
          )}
          {receipt.taxAmount > 0 && (
            <div className="flex justify-between text-muted">
              <span>Tax ({receipt.taxPercent}%)</span>
              <span className="text-ink">{formatCurrency(receipt.taxAmount, currency)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
            <span>Total</span>
            <span>{formatCurrency(receipt.total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
