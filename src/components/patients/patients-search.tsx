"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PatientsSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <div className="relative w-72">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Rechercher un patient..."
        defaultValue={params.get("q") ?? ""}
        className="pl-9"
        onChange={(e) => {
          const value = e.target.value;
          startTransition(() => {
            const next = new URLSearchParams(params);
            if (value) next.set("q", value);
            else next.delete("q");
            router.replace(`/patients?${next.toString()}`);
          });
        }}
      />
    </div>
  );
}
