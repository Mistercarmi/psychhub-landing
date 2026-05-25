import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertLevel = "info" | "warning" | "critical" | "success";

export interface AlertBannerProps {
  level?: AlertLevel;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const STYLES: Record<AlertLevel, { bg: string; border: string; text: string; Icon: typeof AlertCircle }> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-900 dark:text-blue-300",
    Icon: AlertCircle
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-300 dark:border-amber-900",
    text: "text-amber-900 dark:text-amber-300",
    Icon: AlertTriangle
  },
  critical: {
    bg: "bg-rose-50 dark:bg-rose-950",
    border: "border-rose-300 dark:border-rose-900",
    text: "text-rose-900 dark:text-rose-300",
    Icon: AlertCircle
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-300 dark:border-emerald-900",
    text: "text-emerald-900 dark:text-emerald-300",
    Icon: CheckCircle2
  }
};

export function AlertBanner({
  level = "info",
  title,
  description,
  action,
  className
}: AlertBannerProps) {
  const s = STYLES[level];
  const Icon = s.Icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
        s.bg,
        s.border,
        s.text,
        className
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <div className="text-xs opacity-90">{description}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
