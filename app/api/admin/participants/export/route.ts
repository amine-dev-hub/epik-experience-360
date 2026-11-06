import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import type { Table } from "@/lib/export/datasets";
import { toCsv, toXlsx } from "@/lib/export/formats";
import { formatDateTime } from "@/lib/format";
import { RECOMMENDATION_LABELS } from "@/lib/constants";
import type { Recommendation } from "@/types/domain";

/** Export global des participants (tous événements), chaque ligne indiquant son événement. */
export async function GET(request: NextRequest) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows: Table["rows"] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.db
      .from("feedback_submissions")
      .select("last_name,first_name,email,phone,submitted_at,recommendation,events(name)")
      .order("submitted_at", { ascending: false })
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 });
    for (const r of data ?? []) {
      rows.push([
        r.last_name,
        r.first_name,
        r.email,
        r.phone,
        (r.events as unknown as { name: string } | null)?.name ?? "",
        formatDateTime(r.submitted_at),
        RECOMMENDATION_LABELS[r.recommendation as Recommendation],
      ]);
    }
    if (!data || data.length < 1000) break;
  }
  const table: Table = {
    name: "Participants",
    columns: ["Nom", "Prénom", "E-mail", "Téléphone", "Événement", "Date de participation", "Recommandation"],
    rows,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const body = format === "csv" ? Buffer.from(toCsv([table]), "utf8") : await toXlsx([table], "Participants");
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="epik360-participants-${stamp}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
