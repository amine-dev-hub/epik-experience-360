import ExcelJS from "exceljs";
import type { Cell, Table } from "./datasets";

/** Neutralise les formules (injection CSV / Excel) : =, +, -, @ en début de cellule. */
export function safeCell(value: Cell): Cell {
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

/** CSV compatible Excel (séparateur « ; », BOM UTF-8). Plusieurs tables = sections successives. */
export function toCsv(tables: Table[]): string {
  const esc = (v: Cell) => {
    const s = v === null || v === undefined ? "" : String(safeCell(v));
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const parts = tables.map((t) => {
    const lines = [t.columns.map(esc).join(";"), ...t.rows.map((r) => r.map(esc).join(";"))];
    return tables.length > 1 ? [`# ${t.name}`, ...lines].join("\r\n") : lines.join("\r\n");
  });
  return `﻿${parts.join("\r\n\r\n")}\r\n`;
}

export async function toXlsx(tables: Table[], title: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "EPIK EXPERIENCE 360";
  wb.title = title;
  wb.created = new Date();
  const used = new Set<string>();
  for (const t of tables) {
    let name = t.name.replace(/[\\/*?:[\]]/g, " ").slice(0, 31);
    for (let i = 2; used.has(name); i++) name = `${t.name.slice(0, 28)} ${i}`;
    used.add(name);
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(t.columns);
    t.rows.forEach((r) => ws.addRow(r.map(safeCell)));
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004060" } };
    header.alignment = { vertical: "middle", wrapText: true };
    ws.columns.forEach((col, i) => {
      const lengths = [t.columns[i], ...t.rows.map((r) => r[i])].map((v) => String(v ?? "").length);
      col.width = Math.min(60, Math.max(10, ...lengths) + 2);
      col.alignment = { vertical: "top", wrapText: true };
    });
    if (t.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.columns.length } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
