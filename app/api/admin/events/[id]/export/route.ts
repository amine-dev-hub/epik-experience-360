import { NextResponse, type NextRequest } from "next/server";
import { getFreshAnalysis, loadEventData } from "@/lib/analysis/run";
import { getAdminOrNull } from "@/lib/auth";
import { getEventById } from "@/lib/data/admin";
import { tablesFor } from "@/lib/export/datasets";
import { toCsv, toXlsx } from "@/lib/export/formats";
import { loadLogoDataUrl } from "@/lib/export/logo";
import { buildEventReportPdf } from "@/lib/export/pdf";

const FORMATS = new Set(["csv", "xlsx", "pdf"]);

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/events/[id]/export">) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;
  const type = request.nextUrl.searchParams.get("type") ?? "report";
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  if (!FORMATS.has(format)) return NextResponse.json({ error: "Format inconnu" }, { status: 400 });

  const event = await getEventById(admin.db, id);
  if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

  // Lecture via la session administrateur (RLS) et filtrage strict par event_id.
  const [data, analysis] = await Promise.all([loadEventData(admin.db, event.id), getFreshAnalysis(event.id)]);
  const dataset = { event, ...data, criteria: data.criteria.filter((c) => c.is_active), summary: analysis.summary };
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `epik360-${event.slug}-${type}-${stamp}`;

  if (format === "pdf") {
    if (type !== "report") return NextResponse.json({ error: "PDF disponible pour le rapport uniquement" }, { status: 400 });
    const pdf = buildEventReportPdf(dataset, await loadLogo(request));
    return file(pdf, `${base}.pdf`, "application/pdf");
  }

  const tables = tablesFor(type, dataset);
  if (!tables) return NextResponse.json({ error: "Type d'export inconnu" }, { status: 400 });

  if (format === "csv") {
    return file(Buffer.from(toCsv(tables), "utf8"), `${base}.csv`, "text/csv; charset=utf-8");
  }
  const xlsx = await toXlsx(tables, `${event.name} — ${type}`);
  return file(xlsx, `${base}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function loadLogo(request: NextRequest) {
  const data = await loadLogoDataUrl(request.nextUrl.origin);
  return data ? { data } : null;
}

function file(body: Buffer, filename: string, type: string) {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
