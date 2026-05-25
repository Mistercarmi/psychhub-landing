import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "default"
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 text-center",
        variant === "default" ? "px-6 py-12" : "px-4 py-6",
        className
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "mb-3 flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            variant === "default" ? "h-12 w-12" : "h-9 w-9"
          )}
        >
          <Icon className={variant === "default" ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />
        </div>
      ) : null}
      <p className={cn("font-medium", variant === "default" ? "text-base" : "text-sm")}>
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
