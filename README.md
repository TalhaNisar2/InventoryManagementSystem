# Stockbase — Inventory Management Dashboard

A complete inventory management system built with **Next.js 14** (App Router), **TypeScript**, and **Tailwind CSS**. Data is stored in your browser via `localStorage` (Zustand persist) for now, with the codebase wired so you can drop in Supabase later without a rewrite.

## Login

There's no backend yet, so login uses a hardcoded email/password check. Change it any time in `lib/auth.ts`:

```
email:    admin@stockbase.app
password: stockbase123
```

## Features

- **Login** — simple gate in front of the app (`lib/auth.ts`). Swap for Supabase Auth later.
- **Dashboard** — simplified: key stats, a "needs attention" low-stock list, value-by-category breakdown, recent receipts, and quick actions.
- **Products** — searchable, filterable (category/status) table with cost price, sell price, and margin columns. Long product names wrap instead of being cut off. Below `md` screens it switches to a stacked card layout so nothing gets squeezed.
- **Categories** — card grid showing each category's product count and stock value.
- **Suppliers** — vendor directory with contact info, lead times, and linked product counts.
- **Receipts** — build sales or purchase receipts: search products by name/SKU, add line items with quantity & price, apply discount/tax, then Save (which moves stock automatically), Print, or download as **PDF** or **Excel**. A History tab lists every saved receipt, searchable, each viewable/printable/exportable individually, plus a bulk Excel export.
- **Reports** — top products by value, value-by-category pie chart, sales-vs-purchases chart (from receipts), and a low-stock risk list.
- **Settings** — business profile and notification preferences.
- **Toasts** — every create/update/delete/export action gives feedback via `sonner`.
- **Responsive** — sidebar collapses to a mobile drawer, forms stack to one column, products/receipts adapt to small screens.

*Stock movements as a separate page has been removed — receipts are now the single place stock quantities change (sale = stock out, purchase = stock in), which also gives you a clean paper trail (the receipt itself) instead of a raw ledger.*

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and log in with the credentials above.

To build for production:

```bash
npm run build
npm run start
```

## Connecting Supabase (when you're ready)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, only if you add API routes later)
3. `lib/supabase.ts` already exports a ready `supabase` client, plus SQL for suggested tables (`categories`, `suppliers`, `products`, `receipts`) in a comment at the bottom of that file.
4. In `lib/store.ts`, every action (`addProduct`, `updateProduct`, `addReceipt`, etc.) has a `// TODO: SUPABASE` comment right above it showing the exact query to swap in. Nothing else in the app needs to change — components only ever talk to the store.
5. For real authentication, replace `lib/auth.ts`'s `checkCredentials` with `supabase.auth.signInWithPassword(...)`.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (custom design tokens — see `tailwind.config.ts`)
- Zustand with `persist` middleware (localStorage) for state
- Recharts for charts
- `sonner` for toast notifications
- `jspdf` + `jspdf-autotable` for PDF receipt export
- `xlsx` (SheetJS) for Excel export
- `@supabase/supabase-js` — installed and ready, unused until you add env vars
- lucide-react for icons

## Project structure

```
app/
  login/             Login page
  page.tsx           Dashboard
  products/          Products list + drawer form
  receipts/          Receipt builder + history (new/purchase/sale, PDF/Excel/print)
  categories/        Category cards
  suppliers/         Supplier directory
  reports/           Charts & risk list
  settings/          Business profile & preferences
components/          Sidebar, Topbar, forms, drawer, receipt preview, etc.
lib/
  types.ts           Domain types (Product, Category, Supplier, Receipt, ...)
  store.ts           Zustand store + actions — this is what you'll wire to Supabase
  supabase.ts         Supabase client + suggested schema (inert until env vars are set)
  auth.ts            Hardcoded login check + session helpers
  receipt-export.ts  PDF / Excel export logic for receipts
  seed-data.ts        Deterministic demo dataset
  utils.ts           Formatting helpers (currency, dates, classnames)
```

## Notes

- All data lives in your browser's `localStorage` under the key `stockbase-inventory-storage`. Clearing site data resets the app back to the seeded demo dataset.
- The login session is a simple flag in `localStorage` (`stockbase-session`) — fine for a single-user demo, not real security. Don't rely on it to protect sensitive data until it's backed by real auth.
- The design avoids Google Fonts so the project builds and runs with zero external network dependency — it uses a refined system font stack (San Francisco / Segoe UI / Roboto depending on OS).
