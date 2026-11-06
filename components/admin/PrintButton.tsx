"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <button type="button" className="btn-primary btn-sm" onClick={() => window.print()}>
      <Printer className="size-3.5" /> {label}
    </button>
  );
}
