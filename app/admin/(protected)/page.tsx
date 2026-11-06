import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CompareBarChart } from "@/components/admin/charts";
import { Card, EmptyState, PageHeader, StatTile, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { listEventsWithStats } from "@/lib/data/admin";
import { formatDate, formatDateTime, percent, score } from "@/lib/format";
import { RECOMMENDATION_LABELS } from "@/lib/constants";
import type { Recommendation } from "@/types/domain";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function AdminHome() {
  const { db } = await requireAdmin();
  const [events, { data: recent }, ratingsAgg] = await Promise.all([
    listEventsWithStats(db),
    db
      .from("feedback_submissions")
      .select("id,first_name,last_name,submitted_at,recommendation,event_id,events(name)")
      .order("submitted_at", { ascending: false })
      .limit(8),
    db.from("feedback_submissions").select("email_normalized"),
  ]);

  const totalFeedback = events.reduce((a, e) => a + e.responseCount, 0);
  const uniqueParticipants = new Set((ratingsAgg.data ?? []).map((r) => r.email_normalized)).size;
  const active = events.filter((e) => e.status === "published" && e.is_active).length;

  // Moyennes globales pondérées par le nombre de réponses de chaque événement.
  const weighted = (pick: (e: (typeof events)[number]) => number | null) => {
    let sum = 0;
    let n = 0;
    for (const e of events) {
      const v = pick(e);
      if (v !== null && e.responseCount > 0) {
        sum += v * e.responseCount;
        n += e.responseCount;
      }
    }
    return n ? Math.round((sum / n) * 100) / 100 : null;
  };
  const withData = events.filter((e) => e.responseCount > 0).slice().sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de tous les événements EPIK LEADERS"
        actions={<Link href="/admin/events/new" className="btn-accent"><Plus className="size-4" /> Nouvel événement</Link>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Événements" value={events.length} />
        <StatTile label="Formulaires ouverts" value={active} />
        <StatTile label="Participants uniques" value={uniqueParticipants} hint="par adresse e-mail" />
        <StatTile label="Feedbacks" value={totalFeedback} />
        <StatTile label="Satisfaction moyenne" value={score(weighted((e) => e.overallAverage))} hint="sur 5, tous événements" accent />
        <StatTile label="Recommandent" value={percent(weighted((e) => e.recommendationRate))} hint="tous événements" />
      </div>

      {events.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Aucun événement" text="Créez votre premier événement pour commencer à collecter des avis." action={<Link href="/admin/events/new" className="btn-primary">Créer un événement</Link>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card title="Évolution des évaluations" subtitle="Moyenne générale /5 par événement (ordre chronologique)">
            {withData.length === 0 ? (
              <p className="text-sm text-ink-soft">Les évaluations apparaîtront après les premières réponses.</p>
            ) : (
              <CompareBarChart data={withData.map((e) => ({ name: `${formatDate(e.event_date, { month: "short" })} · ${e.name}`, value: e.overallAverage }))} max={5} unit="/ 5" />
            )}
          </Card>
          <Card title="Dernières soumissions" actions={<Link href="/admin/participants" className="text-sm font-semibold text-navy">Tout voir →</Link>}>
            {!recent?.length ? (
              <p className="text-sm text-ink-soft">Aucune soumission pour le moment.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/submissions/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.first_name} {r.last_name}</span>
                        <span className="block truncate text-xs text-ink-soft">{(r.events as unknown as { name: string } | null)?.name}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-ink-soft">
                        {formatDateTime(r.submitted_at)}
                        <span className="block">Recommande : {RECOMMENDATION_LABELS[r.recommendation as Recommendation]}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Événements récents" className="xl:col-span-2">
            <ul className="divide-y divide-line">
              {events.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/events/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-surface">
                    <span className="min-w-0">
                      <span className="block font-semibold">{e.name}</span>
                      <span className="text-xs text-ink-soft">{formatDate(e.event_date)}</span>
                    </span>
                    <span className="flex items-center gap-4 text-sm tabular-nums">
                      <StatusBadge status={e.status} active={e.is_active} />
                      <span>{e.responseCount} rép.</span>
                      <span className="font-semibold text-navy">{score(e.overallAverage)}/5</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
