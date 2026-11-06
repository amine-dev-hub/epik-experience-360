import { CalendarDays, Download, FileSpreadsheet, FileText, MapPin, Mic } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CriteriaBarChart, CriteriaRadar, DistributionChart, TimelineChart } from "@/components/admin/charts";
import { EventActions } from "@/components/admin/EventActions";
import { ImpactView } from "@/components/admin/ImpactView";
import { QrPanel } from "@/components/admin/QrPanel";
import { Card, PageHeader, SampleWarning, StatTile, StatusBadge } from "@/components/admin/ui";
import { getFreshAnalysis } from "@/lib/analysis/run";
import { requireAdmin } from "@/lib/auth";
import { getEventById } from "@/lib/data/admin";
import { siteUrl } from "@/lib/env";
import { formatDate, formatDateTime, formatTimeRange, percent, score } from "@/lib/format";
import { PULSE_LEVELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Détail de l'événement" };

const EXPORTS = [
  { type: "report", label: "Rapport complet", formats: ["pdf", "xlsx"] },
  { type: "responses", label: "Réponses détaillées", formats: ["csv", "xlsx"] },
  { type: "participants", label: "Participants", formats: ["csv", "xlsx"] },
  { type: "ratings", label: "Évaluations", formats: ["csv", "xlsx"] },
  { type: "comments", label: "Commentaires", formats: ["csv", "xlsx"] },
  { type: "stats", label: "Statistiques", formats: ["csv", "xlsx"] },
] as const;

export default async function EventDetailPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const event = await getEventById(db, id);
  if (!event) notFound();

  const { summary, generatedAt } = await getFreshAnalysis(event.id);
  const publicUrl = `${siteUrl()}/event/${event.slug}`;
  const eventCriteria = summary.criteria.filter((c) => c.category === "event");
  const trainingCriteria = summary.criteria.filter((c) => c.category === "training");
  const n = summary.responseCount;

  return (
    <>
      <Link href="/admin/events" className="text-sm font-semibold text-navy">← Événements</Link>
      <PageHeader
        title={event.name}
        subtitle={
          <div className="space-y-2">
            <StatusBadge status={event.status} active={event.is_active} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(event.event_date)} {formatTimeRange(event.start_time, event.end_time)}</span>
              {event.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {event.location}</span>}
              {event.speaker && <span className="flex items-center gap-1"><Mic className="size-3.5" /> {event.speaker}</span>}
            </div>
          </div>
        }
      />
      <div className="mb-6">
        <EventActions id={event.id} slug={event.slug} status={event.status} isActive={event.is_active} />
      </div>

      <p className="mb-4 text-xs text-ink-soft">
        EPIK IMPACT AI · {n} réponse{n > 1 ? "s" : ""} analysée{n > 1 ? "s" : ""} · dernière mise à jour {formatDateTime(generatedAt)} · analyse
        automatique après chaque soumission
      </p>
      <SampleWarning level={summary.sample} count={n} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Réponses" value={n} />
        <StatTile label="Moyenne générale" value={score(summary.averages.overall)} hint="sur 5" />
        <StatTile label="Événement" value={score(summary.averages.event)} hint={`satisfaction ${percent(summary.satisfaction.event)}`} />
        <StatTile label="Formation" value={score(summary.averages.training)} hint={`satisfaction ${percent(summary.satisfaction.training)}`} />
        <StatTile label="Live Pulse" value={score(summary.averages.pulse)} hint="sur 5" accent />
        <StatTile label="Recommandent" value={percent(summary.recommendation.rate)} hint={`${summary.recommendation.yes} oui · ${summary.recommendation.maybe} peut-être · ${summary.recommendation.no} non`} />
      </div>

      {n > 0 && (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card title="Satisfaction par critère — événement" subtitle="Moyenne sur 5 · en rouge sous 3,5">
              <CriteriaBarChart data={eventCriteria} />
            </Card>
            <Card title="Satisfaction par critère — formation" subtitle="Moyenne sur 5 · en rouge sous 3,5">
              <CriteriaBarChart data={trainingCriteria} />
            </Card>
            <Card title="Profil global" subtitle="Tous les critères (moyenne sur 5)">
              <CriteriaRadar data={summary.criteria} />
            </Card>
            <Card title="EPIK LIVE PULSE" subtitle={`Moyenne ${score(summary.pulse.average)}/5 · ${summary.pulse.count} réponses`}>
              <DistributionChart distribution={summary.pulse.distribution} labels={PULSE_LEVELS.map((l) => `${l.emoji} ${l.label}`)} />
            </Card>
          </div>

          <Card title="Détail des notes" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-ink-soft">
                  <tr>
                    <th className="py-2 font-semibold">Critère</th>
                    <th className="py-2 text-right font-semibold">Moyenne</th>
                    <th className="py-2 text-right font-semibold">Satisfaits (≥4)</th>
                    {[1, 2, 3, 4, 5].map((k) => <th key={k} className="py-2 text-right font-semibold">{k}★</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {summary.criteria.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 font-medium">{c.label}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{score(c.average)}</td>
                      <td className="py-2 text-right tabular-nums">{percent(c.satisfaction)}</td>
                      {c.distribution.map((d, k) => <td key={k} className="py-2 text-right text-ink-soft tabular-nums">{d}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {summary.timeline.length > 1 && (
            <Card title="Évolution des réponses" className="mt-6">
              <TimelineChart data={summary.timeline} />
            </Card>
          )}

          <h2 className="mt-10 mb-4 text-xl font-extrabold text-navy">EPIK IMPACT AI</h2>
          <ImpactView summary={summary} />
        </>
      )}

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <Card title="QR code & lien public" className="scroll-mt-6" subtitle={event.status !== "published" ? "⚠ L'événement n'est pas publié : le lien affichera une page 404." : undefined}>
          <div id="qr" />
          <QrPanel url={publicUrl} slug={event.slug} eventId={event.id} />
        </Card>
        <Card title="Exports & rapports" subtitle="Données de cet événement uniquement">
          <ul className="divide-y divide-line">
            {EXPORTS.map((x) => (
              <li key={x.type} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-semibold">{x.label}</span>
                <span className="flex gap-2">
                  {x.formats.map((f) => (
                    <a key={f} href={`/api/admin/events/${event.id}/export?type=${x.type}&format=${f}`} className="btn-ghost btn-sm">
                      {f === "pdf" ? <FileText className="size-3.5" /> : f === "xlsx" ? <FileSpreadsheet className="size-3.5" /> : <Download className="size-3.5" />}
                      {f.toUpperCase()}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
