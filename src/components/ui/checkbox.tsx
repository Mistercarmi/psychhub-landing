"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox simple (HTML natif) — API compatible Radix : `checked` (boolean | "indeterminate"),
 * `onCheckedChange(next: boolean | "indeterminate") => void`, `disabled`, `aria-label`.
 *
 * Volontairement sans `@radix-ui/react-checkbox` pour éviter une dépendance supplémentaire.
 * Si un jour on veut le focus-trap et la gestion clavier de Radix, basculer dessus.
 */
type CheckedState = boolean | "indeterminate";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLButtonElement>, "onChange" | "checked" | "type"> {
  checked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, onClick, disabled, ...rest }, ref) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === "indeterminate";
    const state = isChecked ? "checked" : isIndeterminate ? "indeterminate" : "unchecked";

    function toggle(e: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(e);
      if (e.defaultPrevented || disabled) return;
      onCheckedChange?.(isChecked ? false : true);
    }

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={isIndeterminate ? "mixed" : isChecked}
        data-state={state}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          (isChecked || isIndeterminate) && "bg-primary text-primary-foreground",
          className
        )}
        {...rest}
      >
        {isIndeterminate ? (
          <Minus className="h-3 w-3" aria-hidden="true" />
        ) : isChecked ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : null}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
