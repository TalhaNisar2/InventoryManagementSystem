/**
 * Temporary, hardcoded login.
 *
 * There's no backend yet, so credentials just live here in code. Change
 * these two values to whatever you want the login to be.
 *
 * When you connect Supabase later, swap `checkCredentials` for
 * `supabase.auth.signInWithPassword(...)` and delete this file.
 */
export const APP_CREDENTIALS = {
  email: "admin@stockbase.app",
  password: "stockbase123",
};

const SESSION_KEY = "stockbase-session";

export function checkCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === APP_CREDENTIALS.email.toLowerCase() &&
    password === APP_CREDENTIALS.password
  );
}

export function setSession(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSession(): { email: string; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
