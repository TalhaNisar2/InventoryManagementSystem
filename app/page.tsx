"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, DollarSign, PackageX, TriangleAlert, ArrowRight, Plus, Receipt as ReceiptIcon, BarChart3 } from "lucide-react";
import { useStore, stockStatus } from "@/lib/store";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";

export default function DashboardPage() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const receipts = useStore((s) => s.receipts);
  const currency = useStore((s) => s.currency);
  const [name, setName] = useState("");

  useEffect(() => {
    const email = getSession()?.email ?? "";
    setName(email ? email.split("@")[0].replace(/[._]/g, " ") : "");
  }, []);

  const stats = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
    const lowStock = products.filter((p) => stockStatus(p.quantity, p.reorderLevel) === "low-stock");
    const outOfStock = products.filter((p) => stockStatus(p.quantity, p.reorderLevel) === "out-of-stock");
    return { totalValue, lowStock, outOfStock };
  }, [products]);

  const categoryBreakdown = useMemo(() => {
    return categories
      .map((c) => {
        const items = products.filter((p) => p.categoryId === c.id);
        const value = items.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
        return { ...c, value, count: items.length };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [categories, products]);

  const maxCategoryValue = Math.max(...categoryBreakdown.map((c) => c.value), 1);

  const attentionItems = useMemo(
    () =>
      [...stats.outOfStock, ...stats.lowStock]
        .sort((a, b) => a.quantity / (a.reorderLevel || 1) - b.quantity / (b.reorderLevel || 1))
        .slice(0, 5),
    [stats]
  );

  const recentReceipts = receipts.slice(0, 6);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold capitalize tracking-tight text-ink">
            {name ? `Welcome back, ${name}` : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted">Here&apos;s a quick look at your inventory today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/receipts"
            className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
          >
            <ReceiptIcon size={15} /> New receipt
          </Link>
          <Link
            href="/products"
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            <Plus size={15} /> Add product
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products tracked" value={formatNumber(products.length)} icon={Boxes} />
        <StatCard label="Stock value on hand" value={formatCurrency(stats.totalValue, currency)} icon={DollarSign} />
        <StatCard
          label="Low stock items"
          value={formatNumber(stats.lowStock.length)}
          icon={TriangleAlert}
          tone="warn"
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(stats.outOfStock.length)}
          icon={PackageX}
          tone="danger"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Needs attention</h2>
            <Link href="/products?status=attention" className="flex items-center gap-1 text-xs font-medium text-accent-dim hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <p className="text-xs text-muted">Products at or below their reorder level</p>
          <div className="mt-3 divide-y divide-line">
            {attentionItems.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">All stock levels look healthy.</p>
            )}
            {attentionItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.sku} · {p.quantity} on hand, reorder at {p.reorderLevel}
                  </p>
                </div>
                <StatusBadge status={stockStatus(p.quantity, p.reorderLevel)} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Value by category</h2>
          <p className="text-xs text-muted">Cost value of stock on hand</p>
          <div className="mt-4 space-y-3.5">
            {categoryBreakdown.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-ink">{c.name}</span>
                  <span className="shrink-0 text-muted">{formatCurrency(c.value, currency)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.value / maxCategoryValue) * 100}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Recent receipts</h2>
            <p className="text-xs text-muted">Latest sales & purchase receipts</p>
          </div>
          <Link href="/receipts" className="flex items-center gap-1 text-xs font-medium text-accent-dim hover:underline">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        <div className="mt-3 divide-y divide-line">
          {recentReceipts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BarChart3 size={20} className="text-muted" />
              <p className="text-sm text-muted">No receipts yet. Create one to record a sale or purchase.</p>
              <Link
                href="/receipts"
                className="mt-1 flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-soft"
              >
                <Plus size={15} /> New receipt
              </Link>
            </div>
          )}
          {recentReceipts.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {r.receiptNumber} <span className="font-normal text-muted">· {r.partyName || "—"}</span>
                </p>
                <p className="text-xs text-muted">
                  {r.items.length} item{r.items.length === 1 ? "" : "s"} · {formatDate(r.date)}
                </p>
              </div>
              <span className={"shrink-0 text-sm font-semibold " + (r.type === "sale" ? "text-success" : "text-accent-dim")}>
                {formatCurrency(r.total, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
