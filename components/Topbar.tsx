"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Menu, PackageX, Search, TriangleAlert } from "lucide-react";
import { useStore, stockStatus } from "@/lib/store";
import { initials } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { Select } from "@/components/FormControls";
import Link from "next/link";

const CURRENCIES = [
  { code: "PKR", label: "PKR" },
  { code: "USD", label: "USD" },
  { code: "EUR", label: "EUR" },
  { code: "GBP", label: "GBP" },
];

export default function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);
  const products = useStore((s) => s.products);
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);

  useEffect(() => {
    setEmail(getSession()?.email ?? "");
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const alerts = useMemo(
    () =>
      products
        .filter((p) => stockStatus(p.quantity, p.reorderLevel) !== "in-stock")
        .sort((a, b) => a.quantity - b.quantity),
    [products]
  );

  const displayName = email ? email.split("@")[0].replace(/[._]/g, " ") : "Account";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : "/products");
  }

  function goToProduct(sku: string) {
    setAlertsOpen(false);
    router.push(`/products?q=${encodeURIComponent(sku)}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <button
        onClick={onOpenMobileNav}
        className="shrink-0 rounded-md p-2 text-ink/70 transition-colors hover:bg-paper lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <form onSubmit={handleSearch} className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search products, SKUs…"
          className="w-full rounded-md border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted transition-colors focus:border-accent/50 focus:bg-surface focus:outline-none"
        />
      </form>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          wrapperClassName="hidden sm:block"
          className="!py-1.5 !pl-3 bg-paper text-xs font-medium"
          aria-label="Display currency"
          title="Display currency — applies across the whole app"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>

        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            className="relative rounded-md p-2 text-ink/70 transition-colors hover:bg-paper"
            aria-label={`${alerts.length} stock alerts`}
            aria-expanded={alertsOpen}
          >
            <Bell size={19} />
            {alerts.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {alertsOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="font-display text-sm font-semibold text-ink">Stock alerts</h3>
                <span className="text-xs text-muted">{alerts.length} item{alerts.length === 1 ? "" : "s"}</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <Bell size={18} className="text-muted" />
                    <p className="text-sm text-muted">All stock levels look healthy — nothing needs attention.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {alerts.map((p) => {
                      const status = stockStatus(p.quantity, p.reorderLevel);
                      const outOfStock = status === "out-of-stock";
                      return (
                        <li key={p.id}>
                          <button
                            onClick={() => goToProduct(p.sku)}
                            className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-paper"
                          >
                            <span
                              className={
                                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full " +
                                (outOfStock ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")
                              }
                            >
                              {outOfStock ? <PackageX size={14} /> : <TriangleAlert size={14} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                              <span className="block text-xs text-muted">
                                {p.sku} · {outOfStock ? "Out of stock" : `${p.quantity} left, reorder at ${p.reorderLevel}`}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {alerts.length > 0 && (
                <Link
                  href="/products?status=attention"
                  onClick={() => setAlertsOpen(false)}
                  className="block border-t border-line px-4 py-2.5 text-center text-xs font-medium text-accent-dim hover:bg-paper"
                >
                  View all in Products
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <div className="flex items-center gap-2.5 pr-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white ring-2 ring-line">
            {initials(displayName || "Account")}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="max-w-[140px] truncate text-sm font-medium capitalize text-ink">{displayName}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
        </div>
      </div>
    </header>
  );
}
