"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gauge,
  Package,
  Tags,
  Truck,
  Receipt,
  BarChart3,
  Boxes,
  X,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clearSession } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/products", label: "Products", icon: Package },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-ink-soft text-white"
                : "text-white/55 hover:bg-ink-soft/60 hover:text-white/90"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                active
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-white/10 text-white/45 group-hover:text-white/80"
              )}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton() {
  const router = useRouter();
  function handleLogout() {
    clearSession();
    toast.success("Signed out");
    router.replace("/login");
  }
  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/55 transition-colors hover:bg-ink-soft/60 hover:text-white/90"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/45">
        <LogOut size={15} strokeWidth={2} />
      </span>
      Sign out
    </button>
  );
}

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-line bg-ink lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-ink-line px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-ink">
            <Boxes size={17} strokeWidth={2.4} />
          </div>
          <span className="font-display text-[17px] font-semibold tracking-tight text-white">
            Stockbase
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </div>
        <div className="border-t border-ink-line px-3 py-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/60 animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in flex-col bg-ink">
            <div className="flex h-16 items-center justify-between border-b border-ink-line px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-ink">
                  <Boxes size={17} strokeWidth={2.4} />
                </div>
                <span className="font-display text-[17px] font-semibold tracking-tight text-white">
                  Stockbase
                </span>
              </div>
              <button
                onClick={onCloseMobile}
                className="rounded-md p-1.5 text-white/60 hover:bg-ink-soft hover:text-white"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavLinks onNavigate={onCloseMobile} />
            </div>
            <div className="border-t border-ink-line px-3 py-3">
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
