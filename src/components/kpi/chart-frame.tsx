"use client";

import { useRef, type ReactNode } from "react";
import { MoreHorizontal, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { downloadCsv, rowsToCsv, type CsvField } from "@/lib/export/csv";
import { toast } from "sonner";

export interface ChartFrameProps<T> {
  title?: string;
  filenameBase: string;
  data: T[];
  csvFields: CsvField<T>[];
  children: ReactNode;
  /** Désactive l'export PNG si la sérialisation SVG n'est pas pertinente. */
  disablePng?: boolean;
}

/**
 * Wrapper autour d'un chart (Recharts) qui ajoute un menu d'export CSV/PNG.
 * - CSV : utilise `papaparse` via `rowsToCsv` (BOM UTF-8, séparateur `;` pour Excel FR).
 * - PNG : sérialise le SVG du chart en image via canvas (sans dépendance externe).
 */
export function ChartFrame<T>({
  title,
  filenameBase,
  data,
  csvFields,
  children,
  disablePng = false
}: ChartFrameProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  function exportCsv() {
    if (!data || data.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    downloadCsv(`${filenameBase}.csv`, rowsToCsv(data, csvFields));
    toast.success("CSV téléchargé");
  }

  async function exportPng() {
    const container = ref.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) {
      toast.error("Graphique non disponible pour l'export image");
      return;
    }
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const img64 = `data:image/svg+xml;base64,${svg64}`;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Impossible de charger le SVG"));
        img.src = img64;
      });
      const canvas = document.createElement("canvas");
      const width = svg.viewBox.baseVal.width || svg.clientWidth || 800;
      const height = svg.viewBox.baseVal.height || svg.clientHeight || 400;
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponible");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Échec de l'export PNG");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenameBase}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PNG téléchargé");
      }, "image/png");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur export PNG");
    }
  }

  return (
    <div className="relative h-full" ref={ref}>
      <div className="absolute right-0 top-0 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-60 hover:opacity-100"
              aria-label={title ? `Options ${title}` : "Options du graphique"}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" />
              Exporter CSV
            </DropdownMenuItem>
            {!disablePng ? (
              <DropdownMenuItem onClick={exportPng}>
                <ImageIcon className="h-4 w-4" />
                Exporter PNG
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </div>
  );
}
