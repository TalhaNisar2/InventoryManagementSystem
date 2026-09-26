import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  tone?: "default" | "danger" | "warn";
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            tone === "danger" && "bg-danger-soft text-danger",
            tone === "warn" && "bg-warn-soft text-warn",
            tone === "default" && "bg-accent-soft text-accent-dim"
          )}
        >
          <Icon size={17} strokeWidth={2.1} />
        </span>
      </div>
      <p className="mt-3 font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {trend !== undefined && (
        <p className={cn("mt-2.5 text-xs font-medium", positive ? "text-success" : "text-danger")}>
          {positive ? "+" : ""}
          {trend}% <span className="font-normal text-muted">{trendLabel}</span>
        </p>
      )}
    </div>
  );
}
