import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PRIORITY_LABELS } from "@/lib/analysis/recommendations";
import { APP_NAME, ORG_NAME, PULSE_LEVELS, SLOGAN } from "@/lib/constants";
import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format";
import type { EventDataset } from "./datasets";

const NAVY: [number, number, number] = [0, 64, 96];
const RED: [number, number, number] = [192, 16, 48];
const INK: [number, number, number] = [21, 42, 56];
const SOFT: [number, number, number] = [74, 93, 106];

/** Les polices PDF standard ne couvrent que le jeu WinAnsi : on remplace le reste. */
function t(value: unknown): string {
  return String(value ?? "")
    .replace(/[  ]/g, " ")
    .replace(/≥/g, ">=")
    .replace(/★/g, "*")
    .replace(/[^\x20-\x7E\xA0-\xFFŒœŠšŸŽž–—‘’“”•…€\n]/g, "");
}

const num = (v: number | null, d = 2) => (v === null ? "—" : v.toFixed(d).replace(".", ","));
const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1).replace(".", ",")} %`);

export interface Logo {
  data: string; // data URL PNG
}

export function buildEventReportPdf(d: EventDataset, logo: Logo | null): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  const s = d.summary;

  // ----- En-tête
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 46, "F");
  let textX = M;
  if (logo) {
    try {
      const props = doc.getImageProperties(logo.data);
      const h = 22;
      const w = Math.min(50, (props.width / props.height) * h);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M - 2, 10, w + 4, h + 4, 2, 2, "F");
      doc.addImage(logo.data, "PNG", M, 12, w, h);
      textX = M + w + 8;
    } catch {
      /* logo illisible : ignoré */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(t(`${APP_NAME} · RAPPORT D'ÉVÉNEMENT`), textX, 15);
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(t(d.event.name), W - textX - M), textX, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const meta = [formatDate(d.event.event_date), formatTimeRange(d.event.start_time, d.event.end_time), d.event.location]
    .filter(Boolean)
    .join(" · ");
  doc.text(t(meta), textX, 38);
  doc.text(t(ORG_NAME), textX, 42.5);

  let y = 56;
  doc.setTextColor(...SOFT);
  doc.setFontSize(8.5);
  doc.text(
    t(`${s.responseCount} réponse(s) analysée(s) · analyse du ${formatDateTime(s.generatedAt)} · moteur EPIK IMPACT AI (règles déterministes)`),
    M,
    y,
  );
  y += 5;
  if (s.sample !== "sufficient") {
    doc.setTextColor(...RED);
    doc.text(
      t(
        s.sample === "none"
          ? "Aucune réponse : aucune statistique disponible."
          : `Échantillon ${s.sample === "small" ? "réduit (< 10 réponses)" : "limité (< 30 réponses)"} : résultats indicatifs, non statistiquement significatifs.`,
      ),
      M,
      y,
    );
    y += 5;
  }

  // ----- Indicateurs clés
  const tiles: [string, string][] = [
    ["Réponses", String(s.responseCount)],
    ["Moyenne générale", `${num(s.averages.overall)}/5`],
    ["Événement", `${num(s.averages.event)}/5`],
    ["Formation", `${num(s.averages.training)}/5`],
    ["Live Pulse", `${num(s.averages.pulse)}/5`],
    ["Recommandent", pct(s.recommendation.rate)],
  ];
  const tw = (W - 2 * M - 5 * 3) / 6;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tw + 3);
    doc.setDrawColor(226, 232, 238);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y + 2, tw, 18, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setTextColor(...SOFT);
    doc.text(t(label), x + 2.5, y + 7.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(t(value), x + 2.5, y + 15.5);
    doc.setFont("helvetica", "normal");
  });
  y += 28;

  // ----- Graphique : moyenne par critère
  const title = (label: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(t(label), M, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  };

  if (s.responseCount > 0) {
    title("Satisfaction par critère (moyenne /5)");
    const labelW = 62;
    const barMax = W - 2 * M - labelW - 14;
    for (const c of s.criteria) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text(t(c.label), M, y + 3.2, { maxWidth: labelW - 2 });
      doc.setFillColor(230, 238, 243);
      doc.roundedRect(M + labelW, y, barMax, 4.5, 1, 1, "F");
      const v = c.average ?? 0;
      doc.setFillColor(...(v < 3.5 ? RED : NAVY));
      if (v > 0) doc.roundedRect(M + labelW, y, (v / 5) * barMax, 4.5, 1, 1, "F");
      doc.setTextColor(...INK);
      doc.text(t(num(c.average)), M + labelW + barMax + 2, y + 3.4);
      y += 7;
    }
    y += 4;

    title("EPIK LIVE PULSE — répartition");
    const maxP = Math.max(1, ...s.pulse.distribution);
    const colW = (W - 2 * M) / 5;
    PULSE_LEVELS.forEach((l, i) => {
      const count = s.pulse.distribution[i];
      const h = (count / maxP) * 22;
      const x = M + i * colW + colW * 0.25;
      doc.setFillColor(...NAVY);
      if (h > 0) doc.rect(x, y + 22 - h, colW * 0.5, h, "F");
      doc.setFontSize(8);
      doc.setTextColor(...INK);
      doc.text(String(count), x + colW * 0.25, y + 20 - h, { align: "center" });
      doc.text(t(`${l.score} · ${l.label}`), x + colW * 0.25, y + 27, { align: "center" });
    });
    y += 34;
  }

  // ----- Tableaux
  const table = (head: string[], body: (string | number)[][], opts: { widths?: Record<number, number> } = {}) => {
    autoTable(doc, {
      startY: y,
      head: [head.map(t)],
      body: body.map((r) => r.map((c) => t(c))),
      margin: { left: M, right: M },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, textColor: INK, lineColor: [226, 232, 238], lineWidth: 0.1 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: Object.fromEntries(Object.entries(opts.widths ?? {}).map(([k, w]) => [k, { cellWidth: w }])),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  };

  title("Points forts");
  if (s.strengths.length) table(["Sujet", "Moyenne /5", "Avis positifs"], s.strengths.map((x) => [x.label, num(x.average), x.positiveMentions]));
  else empty("Aucun point fort identifié à ce stade.");

  title("Points à améliorer");
  if (s.weaknesses.length) table(["Sujet", "Moyenne /5", "Avis négatifs"], s.weaknesses.map((x) => [x.label, num(x.average), x.negativeMentions]));
  else empty("Aucun point faible récurrent identifié.");

  title("Recommandations");
  if (s.recommendations.length)
    table(
      ["Priorité", "Sujet", "Recommandation", "Justification"],
      s.recommendations.map((r) => [PRIORITY_LABELS[r.priority], r.label, r.text, r.evidence.join("\n")]),
      { widths: { 0: 20, 1: 30 } },
    );
  else empty("Aucune recommandation : pas de problème récurrent détecté.");

  title("Thèmes des commentaires");
  if (s.themes.length) table(["Thème", "Positifs", "Négatifs", "Suggestions", "Neutres"], s.themes.map((x) => [x.label, x.positive, x.negative, x.suggestion, x.neutral]));
  else empty("Aucun commentaire analysé.");

  function empty(text: string) {
    doc.setFontSize(9);
    doc.setTextColor(...SOFT);
    doc.text(t(text), M, y);
    y += 10;
  }

  // ----- Pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...SOFT);
    doc.text(t(`${APP_NAME} · ${ORG_NAME} · ${SLOGAN}`), M, 290);
    doc.text(`${i} / ${pages}`, W - M, 290, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
