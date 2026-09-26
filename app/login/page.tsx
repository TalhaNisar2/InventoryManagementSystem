"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { checkCredentials, setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Tiny delay so it feels like a real request, not required.
    setTimeout(() => {
      if (checkCredentials(email, password)) {
        setSession(email.trim());
        toast.success("Welcome back!");
        router.replace("/");
      } else {
        setError("That email or password doesn't match our records.");
        setLoading(false);
      }
    }, 350);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-accent shadow-card">
            <Boxes size={22} strokeWidth={2.3} />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
            Sign in to Stockbase
          </h1>
          <p className="mt-1 text-sm text-muted">Manage your inventory in one place</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-6 shadow-card"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-line bg-paper py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:bg-surface focus:outline-none"
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-line bg-paper py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:bg-surface focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

        </form>
      </div>
    </div>
  );
}
