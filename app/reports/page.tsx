"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { useStore, stockStatus } from "@/lib/store";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

type RangeMode = "today" | "7d" | "month" | "lastMonth" | "year" | "all" | "custom";
type Granularity = "day" | "week" | "month";

const RANGE_OPTIONS: { value: RangeMode; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const ATTENTION_PAGE_SIZE = 6;
const RECEIPTS_PAGE_SIZE = 6;

function resolveRange(mode: RangeMode, customStart: string, customEnd: string) {
  const now = new Date();
  switch (mode) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "lastMonth": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "year":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "custom": {
      const start = customStart ? startOfDay(parseISO(customStart)) : startOfDay(subDays(now, 30));
      const end = customEnd ? endOfDay(parseISO(customEnd)) : endOfDay(now);
      return { start, end };
    }
    case "all":
    default:
      return null; // no filtering
  }
}

function bucketKey(date: Date, granularity: Granularity) {
  if (granularity === "day") return format(date, "yyyy-MM-dd");
  if (granularity === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(date, "yyyy-MM");
}

function bucketLabel(key: string, granularity: Granularity) {
  if (granularity === "day") return format(parseISO(key), "MMM d");
  if (granularity === "week") return `Wk of ${format(parseISO(key), "MMM d")}`;
  return format(parseISO(`${key}-01`), "MMM yyyy");
}

export default function ReportsPage() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const receipts = useStore((s) => s.receipts);
  const currency = useStore((s) => s.currency);

  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [attentionPage, setAttentionPage] = useState(1);
  const [receiptsPage, setReceiptsPage] = useState(1);

  const range = useMemo(
    () => resolveRange(rangeMode, customStart, customEnd),
    [rangeMode, customStart, customEnd]
  );

  const filteredReceipts = useMemo(() => {
    if (!range) return receipts;
    return receipts.filter((r) => isWithinInterval(parseISO(r.date), { start: range.start, end: range.end }));
  }, [receipts, range]);

  const topByValue = useMemo(
    () =>
      [...products]
        .map((p) => ({ name: p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name, value: p.quantity * p.costPrice }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7),
    [products]
  );

  const categoryPie = useMemo(
    () =>
      categories
        .map((c) => ({
          name: c.name,
          value: products.filter((p) => p.categoryId === c.id).reduce((sum, p) => sum + p.quantity * p.costPrice, 0),
          color: c.color,
        }))
        .filter((c) => c.value > 0),
    [categories, products]
  );

  // Time series, bucketed by the chosen granularity, built only from
  // receipts inside the selected date range.
  const timeSeries = useMemo(() => {
    const buckets = new Map<string, { sales: number; purchases: number }>();
    for (const r of filteredReceipts) {
      const key = bucketKey(parseISO(r.date), granularity);
      const entry = buckets.get(key) ?? { sales: 0, purchases: 0 };
      if (r.type === "sale") entry.sales += r.total;
      else entry.purchases += r.total;
      buckets.set(key, entry);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, v]) => ({ key, label: bucketLabel(key, granularity), ...v }));
  }, [filteredReceipts, granularity]);

  const totalUnitsHandled = filteredReceipts.reduce(
    (sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const totalRevenue = filteredReceipts.filter((r) => r.type === "sale").reduce((sum, r) => sum + r.total, 0);
  const totalSpend = filteredReceipts.filter((r) => r.type === "purchase").reduce((sum, r) => sum + r.total, 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
  const potentialRevenue = products.reduce((sum, p) => sum + p.quantity * p.sellPrice, 0);

  const attention = useMemo(
    () =>
      [...products]
        .filter((p) => stockStatus(p.quantity, p.reorderLevel) !== "in-stock")
        .sort((a, b) => a.quantity - b.quantity),
    [products]
  );
  const attentionPages = Math.max(1, Math.ceil(attention.length / ATTENTION_PAGE_SIZE));
  const pagedAttention = attention.slice(
    (attentionPage - 1) * ATTENTION_PAGE_SIZE,
    attentionPage * ATTENTION_PAGE_SIZE
  );

  const sortedRangeReceipts = useMemo(
    () => [...filteredReceipts].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [filteredReceipts]
  );
  const receiptsPages = Math.max(1, Math.ceil(sortedRangeReceipts.length / RECEIPTS_PAGE_SIZE));
  const pagedReceipts = sortedRangeReceipts.slice(
    (receiptsPage - 1) * RECEIPTS_PAGE_SIZE,
    receiptsPage * RECEIPTS_PAGE_SIZE
  );

  function changeRange(mode: RangeMode) {
    setRangeMode(mode);
    setReceiptsPage(1);
  }

  return (
    <div>
      <PageHeader title="Reports" description="A closer look at value, movement, and risk across your stock" />

      {/* Date range filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => changeRange(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                rangeMode === opt.value
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-paper text-ink/70 hover:bg-paper/70"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {rangeMode === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setReceiptsPage(1);
              }}
              className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-accent/50 focus:outline-none"
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setReceiptsPage(1);
              }}
              className="rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-accent/50 focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <p className="text-sm text-muted">Inventory cost value</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">{formatCurrency(totalInventoryValue, currency)}</p>
          <p className="mt-1 text-xs text-muted">Current snapshot — not affected by date range</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <p className="text-sm text-muted">Sales revenue in range</p>
          <p className="mt-2 font-display text-2xl font-semibold text-success">{formatCurrency(totalRevenue, currency)}</p>
          <p className="mt-1 text-xs text-muted">{formatNumber(filteredReceipts.filter((r) => r.type === "sale").length)} sales receipts</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <p className="text-sm text-muted">Purchase spend in range</p>
          <p className="mt-2 font-display text-2xl font-semibold text-accent-dim">{formatCurrency(totalSpend, currency)}</p>
          <p className="mt-1 text-xs text-muted">{formatNumber(filteredReceipts.filter((r) => r.type === "purchase").length)} purchase receipts</p>
        </div>
      </div>

      {/* Time series with granularity toggle */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Sales & purchases over time</h2>
            <p className="text-xs text-muted">
              {formatNumber(totalUnitsHandled)} units moved · {formatNumber(filteredReceipts.length)} total receipts in range
            </p>
          </div>
          <div className="flex gap-1 rounded-md border border-line bg-paper p-1">
            {(["day", "week", "month"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  granularity === g ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
                )}
              >
                {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-72">
          {timeSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No receipts in this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E5EA" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7080" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7080" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v, currency)}
                  contentStyle={{ borderRadius: 10, border: "1px solid #E4E5EA", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#1F9D6C" strokeWidth={2.25} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#C97A24" strokeWidth={2.25} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card lg:col-span-3">
          <h2 className="font-display text-base font-semibold text-ink">Highest value products</h2>
          <p className="text-xs text-muted">Cost value of stock currently on hand</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topByValue} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E5EA" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7080" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 12, fill: "#12141F" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v, currency)}
                  contentStyle={{ borderRadius: 10, border: "1px solid #E4E5EA", fontSize: 12 }}
                />
                <Bar dataKey="value" fill="#C97A24" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink">Value by category</h2>
          <p className="text-xs text-muted">Share of total stock value</p>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {categoryPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} contentStyle={{ borderRadius: 10, border: "1px solid #E4E5EA", fontSize: 12 }} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: "#6B7080" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Receipts in range, paginated */}
      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Receipts in range</h2>
            <p className="text-xs text-muted">{formatNumber(sortedRangeReceipts.length)} total receipts</p>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper/60 text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Receipt</th>
                <th className="px-5 py-2.5 font-medium">Party</th>
                <th className="px-5 py-2.5 font-medium">Items</th>
                <th className="px-5 py-2.5 font-medium">Total</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pagedReceipts.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
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
                  <td className="px-5 py-3 text-ink">{r.partyName || "—"}</td>
                  <td className="px-5 py-3 text-muted">{r.items.length}</td>
                  <td className="px-5 py-3 font-medium text-ink">{formatCurrency(r.total, currency)}</td>
                  <td className="px-5 py-3 text-muted">{format(parseISO(r.date), "MMM d, yyyy")}</td>
                </tr>
              ))}
              {pagedReceipts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    No receipts in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {receiptsPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
            <span>
              Page {receiptsPage} of {receiptsPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setReceiptsPage((p) => Math.max(1, p - 1))}
                disabled={receiptsPage === 1}
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setReceiptsPage((p) => Math.min(receiptsPages, p + 1))}
                disabled={receiptsPage === receiptsPages}
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Low stock risk list, paginated */}
      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">Items needing attention</h2>
          <p className="text-xs text-muted">Sorted by lowest stock first · {formatNumber(attention.length)} items</p>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-line">
            {pagedAttention.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-2.5">
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-muted">{p.sku}</p>
                </td>
                <td className="px-5 py-2.5 text-muted">
                  {p.quantity} / {p.reorderLevel} reorder
                </td>
                <td className="px-5 py-2.5 text-right">
                  <StatusBadge status={stockStatus(p.quantity, p.reorderLevel)} />
                </td>
              </tr>
            ))}
            {attention.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-sm text-muted">
                  Every item is above its reorder level.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {attentionPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
            <span>
              Page {attentionPage} of {attentionPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setAttentionPage((p) => Math.max(1, p - 1))}
                disabled={attentionPage === 1}
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setAttentionPage((p) => Math.min(attentionPages, p + 1))}
                disabled={attentionPage === attentionPages}
                className="rounded-md border border-line px-2.5 py-1 font-medium text-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
