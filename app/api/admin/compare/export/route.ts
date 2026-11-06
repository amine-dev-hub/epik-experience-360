import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { listEventsWithStats } from "@/lib/data/admin";
import type { Table } from "@/lib/export/datasets";
import { toXlsx } from "@/lib/export/formats";
import { formatDate } from "@/lib/format";

/** Export Excel de la comparaison (indicateurs agrégés uniquement, aucune donnée personnelle). */
export async function GET(request: NextRequest) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const ids = new Set(request.nextUrl.searchParams.getAll("e"));
  const events = (await listEventsWithStats(admin.db)).filter((e) => e.responseCount > 0 && (!ids.size || ids.has(e.id)));

  const tables: Table[] = [
    {
      name: "Comparaison",
      columns: ["Événement", "Date", "Réponses", "Moyenne générale /5", "Événement /5", "Formation /5", "Live Pulse /5", "Recommandent (%)"],
      rows: events.map((e) => [
        e.name,
        formatDate(e.event_date),
        e.responseCount,
        e.overallAverage,
        e.summary?.averages.event ?? null,
        e.summary?.averages.training ?? null,
        e.pulseAverage,
        e.recommendationRate,
      ]),
    },
    {
      name: "Points faibles",
      columns: ["Événement", "Sujet", "Moyenne /5", "Avis négatifs"],
      rows: events.flatMap((e) => (e.summary?.weaknesses ?? []).map((w) => [e.name, w.label, w.average, w.negativeMentions])),
    },
  ];
  const body = await toXlsx(tables, "Comparaison des événements");
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="epik360-comparaison-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
