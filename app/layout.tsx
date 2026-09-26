import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ToastProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Stockbase — Inventory Management",
  description: "Track stock, products, suppliers, and warehouse activity in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ToastProvider />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
