"use client";

import { Download, FileText, FileType2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function PatientExportButton({ patientId }: { patientId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          Exporter dossier
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Formats disponibles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`/api/pdf/patient/${patientId}`} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4" />
            <span>PDF (consultation)</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/docx/patient/${patientId}`} download>
            <FileType2 className="h-4 w-4" />
            <span>Word (.docx)</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
