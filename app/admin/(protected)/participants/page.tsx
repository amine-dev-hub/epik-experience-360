import { Download, FileSpreadsheet, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, score } from "@/lib/format";

export const metadata: Metadata = { title: "Participants" };

const PAGE_SIZE = 25;

/** Nettoie la recherche pour l'utiliser dans un filtre PostgREST sans injection de syntaxe. */
function cleanQuery(q: string) {
  return q.replace(/[^\p{L}\p{N}@.+\-_ ]/gu, " ").replace(/[.]/g, "_").trim().slice(0, 60);
}

export default async function ParticipantsPage({ searchParams }: PageProps<"/admin/participants">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? cleanQuery(sp.q) : "";
  const eventId = typeof sp.event === "string" && /^[0-9a-f-]{36}$/i.test(sp.event) ? sp.event : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { data: events } = await db.from("events").select("id,name").order("event_date", { ascending: false });

  let query = db
    .from("feedback_submissions")
    .select("id,first_name,last_name,email,phone,submitted_at,event_id,events(name)", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (eventId) query = query.eq("event_id", eventId);
  if (q) {
    const like = `%${q}%`;
    query = query.or(`last_name.ilike.${like},first_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }
  const { data: rows, count } = await query;

  const ids = (rows ?? []).map((r) => r.id);
  const { data: ratings } = ids.length
    ? await db.from("feedback_ratings").select("submission_id,rating").in("submission_id", ids)
    : { data: [] as { submission_id: string; rating: number }[] };
  const avg = new Map<string, number>();
  const acc = new Map<string, number[]>();
  for (const r of ratings ?? []) acc.set(r.submission_id, [...(acc.get(r.submission_id) ?? []), r.rating]);
  acc.forEach((v, k) => avg.set(k, v.reduce((a, b) => a + b, 0) / v.length));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (eventId) params.set("event", eventId);
    params.set("page", String(p));
    return `?${params}`;
  };
  const exportBase = eventId ? `/api/admin/events/${eventId}/export?type=participants` : `/api/admin/participants/export?`;

  return (
    <>
      <PageHeader
        title="Participants"
        subtitle={`${total} réponse${total > 1 ? "s" : ""}${eventId ? " pour cet événement" : " tous événements confondus"}`}
        actions={
          <>
            <a href={`${exportBase}&format=csv`} className="btn-ghost btn-sm"><Download className="size-3.5" /> CSV</a>
            <a href={`${exportBase}&format=xlsx`} className="btn-ghost btn-sm"><FileSpreadsheet className="size-3.5" /> Excel</a>
          </>
        }
      />
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="min-w-56 flex-[2]">
          <span className="label">Recherche</span>
          <span className="relative block">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
            <input name="q" defaultValue={q} placeholder="Nom, prénom, e-mail, téléphone" className="input pl-9" />
          </span>
        </label>
        <label className="min-w-48 flex-1">
          <span className="label">Événement</span>
          <select name="event" defaultValue={eventId} className="input">
            <option value="">Tous les événements</option>
            {(events ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <button className="btn-primary" type="submit">Filtrer</button>
        {(q || eventId) && <Link href="/admin/participants" className="btn-ghost">Réinitialiser</Link>}
      </form>

      {!rows?.length ? (
        <EmptyState title="Aucun participant" text={q || eventId ? "Aucun résultat pour ces filtres." : "Les participants apparaîtront ici après les premières réponses."} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-surface text-left text-xs text-ink-soft">
              <tr>
                {["Nom", "Prénom", "E-mail", "Téléphone", "Événement", "Date", "Moyenne", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-semibold">{r.last_name}</td>
                  <td className="px-4 py-3">{r.first_name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.phone}</td>
                  <td className="max-w-48 truncate px-4 py-3">{(r.events as unknown as { name: string } | null)?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.submitted_at)}</td>
                  <td className="px-4 py-3 font-semibold text-navy tabular-nums">{score(avg.get(r.id) ?? null)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/submissions/${r.id}`} className="font-semibold text-navy">Détail →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="btn-ghost btn-sm">← Précédent</Link> : <span />}
          <span className="text-ink-soft">Page {page} / {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="btn-ghost btn-sm">Suivant →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
