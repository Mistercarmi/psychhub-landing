"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button size="icon" variant="ghost" aria-label="Thème">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const labels = { light: "Clair", dark: "Sombre", system: "Système" } as const;
  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setTheme(next)}
      aria-label={`Thème: ${labels[theme as keyof typeof labels] ?? "Système"}`}
      title={`Thème: ${labels[theme as keyof typeof labels] ?? "Système"} (clic pour basculer)`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
