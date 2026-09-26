import { StockStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<StockStatus, { label: string; className: string; dot: string }> = {
  "in-stock": { label: "In stock", className: "bg-success-soft text-success", dot: "bg-success" },
  "low-stock": { label: "Low stock", className: "bg-warn-soft text-warn", dot: "bg-warn" },
  "out-of-stock": { label: "Out of stock", className: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export default function StatusBadge({ status }: { status: StockStatus }) {
  const c = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", c.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
