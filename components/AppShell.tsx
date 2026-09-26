"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useStore } from "@/lib/store";
import { getSession } from "@/lib/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const hasHydrated = useStore((s) => s.hasHydrated);
  const supabaseSynced = useStore((s) => s.supabaseSynced);
  const supabaseConfigured = useStore((s) => s.isSupabaseConfigured);
  const initSupabase = useStore((s) => s.initSupabase);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/login";
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      await useStore.persist.rehydrate();
      await initSupabase();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const session = getSession();
    setAuthed(!!session);
    setAuthChecked(true);
    if (!session && !isLoginRoute) {
      router.replace("/login");
    }
    if (session && isLoginRoute) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The login page renders full-bleed, without the sidebar/topbar chrome.
  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!authChecked || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {hasHydrated && (!supabaseConfigured || supabaseSynced) ? (
            <div className="animate-fade-in">{children}</div>
          ) : (
            <ShellSkeleton />
          )}
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-line/60" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-surface border border-line" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-surface border border-line" />
    </div>
  );
}
