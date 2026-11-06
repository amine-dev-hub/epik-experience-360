import type { Metadata } from "next";
import Link from "next/link";
import { ImpactView } from "@/components/admin/ImpactView";
import { EmptyState, PageHeader, SampleWarning, StatTile } from "@/components/admin/ui";
import { getFreshAnalysis } from "@/lib/analysis/run";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, percent, score } from "@/lib/format";

export const metadata: Metadata = { title: "EPIK IMPACT AI" };

export default async function ImpactPage({ searchParams }: PageProps<"/admin/impact">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const { data: events } = await db.from("events").select("id,name,event_date").order("event_date", { ascending: false });
  if (!events?.length) {
    return (
      <>
        <PageHeader title="EPIK IMPACT AI" />
        <EmptyState title="Aucun événement" text="Créez un événement pour obtenir une analyse." />
      </>
    );
  }
  const selected = events.find((e) => e.id === sp.event) ?? events[0];
  const { summary, generatedAt } = await getFreshAnalysis(selected.id);
  const s = summary.sentiment;

  return (
    <>
      <PageHeader
        title="EPIK IMPACT AI"
        subtitle="Analyse automatique des réponses par un moteur de règles linguistiques (sans IA générative ni service externe)."
      />
      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-64 flex-1">
          <span className="label">Événement analysé</span>
          <select name="event" defaultValue={selected.id} className="input">
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <button className="btn-primary" type="submit">Afficher</button>
        <Link href={`/admin/events/${selected.id}`} className="btn-ghost">Statistiques détaillées</Link>
      </form>

      <p className="mb-4 text-xs text-ink-soft">
        {summary.responseCount} participant(s) analysé(s) · {s.commentsAnalyzed} commentaire(s) · mise à jour {formatDateTime(generatedAt)} · actualisation automatique après chaque soumission
      </p>
      <SampleWarning level={summary.sample} count={summary.responseCount} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Moyenne générale" value={score(summary.averages.overall)} hint="sur 5" />
        <StatTile label="Live Pulse" value={score(summary.averages.pulse)} hint="sur 5" accent />
        <StatTile label="Commentaires positifs" value={s.commentsAnalyzed ? percent((s.positive / s.commentsAnalyzed) * 100) : "—"} />
        <StatTile label="Commentaires négatifs" value={s.commentsAnalyzed ? percent((s.negative / s.commentsAnalyzed) * 100) : "—"} />
      </div>

      {summary.responseCount === 0 ? (
        <EmptyState title="Pas encore de réponse" text="L'analyse apparaîtra automatiquement dès la première soumission." />
      ) : (
        <ImpactView summary={summary} />
      )}
    </>
  );
}
