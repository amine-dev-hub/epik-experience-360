import { FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import { CompareBarChart } from "@/components/admin/charts";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { listEventsWithStats } from "@/lib/data/admin";
import { formatDate, percent, score } from "@/lib/format";

export const metadata: Metadata = { title: "Comparaison des événements" };

export default async function ComparePage({ searchParams }: PageProps<"/admin/compare">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const all = (await listEventsWithStats(db)).filter((e) => e.responseCount > 0);
  const picked = new Set(([] as string[]).concat(sp.e ?? []));
  const events = (picked.size ? all.filter((e) => picked.has(e.id)) : all)
    .slice()
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  if (all.length === 0) {
    return (
      <>
        <PageHeader title="Comparaison des événements" />
        <EmptyState title="Pas encore de données" text="La comparaison sera disponible dès que des événements auront reçu des réponses." />
      </>
    );
  }

  const metrics: { label: string; unit: string; max?: number; value: (e: (typeof events)[number]) => number | null }[] = [
    { label: "Nombre de participants", unit: "réponses", value: (e) => e.responseCount },
    { label: "Satisfaction générale", unit: "/ 5", max: 5, value: (e) => e.overallAverage },
    { label: "Organisation (moyenne événement)", unit: "/ 5", max: 5, value: (e) => e.summary?.averages.event ?? null },
    { label: "Formation", unit: "/ 5", max: 5, value: (e) => e.summary?.averages.training ?? null },
    { label: "EPIK LIVE PULSE", unit: "/ 5", max: 5, value: (e) => e.pulseAverage },
    { label: "Taux de recommandation", unit: "%", max: 100, value: (e) => e.recommendationRate },
  ];

  // Points faibles récurrents : sujets signalés comme faibles dans plusieurs événements.
  const weakCount = new Map<string, { label: string; events: string[] }>();
  for (const e of events) {
    for (const w of e.summary?.weaknesses ?? []) {
      const entry = weakCount.get(w.topic) ?? { label: w.label, events: [] };
      entry.events.push(e.name);
      weakCount.set(w.topic, entry);
    }
  }
  const recurring = [...weakCount.values()].filter((w) => w.events.length > 1).sort((a, b) => b.events.length - a.events.length);
  const exportQs = events.map((e) => `e=${e.id}`).join("&");

  return (
    <>
      <PageHeader
        title="Comparaison des événements"
        subtitle="Chaque graphique compare une seule mesure, sur une seule échelle."
        actions={<a href={`/api/admin/compare/export?${exportQs}`} className="btn-ghost btn-sm"><FileSpreadsheet className="size-3.5" /> Export Excel</a>}
      />
      <form method="get" className="card mb-6 p-4">
        <p className="label">Événements comparés</p>
        <div className="flex flex-wrap gap-2">
          {all.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <input type="checkbox" name="e" value={e.id} defaultChecked={!picked.size || picked.has(e.id)} className="accent-navy" />
              {e.name}
            </label>
          ))}
        </div>
        <button className="btn-primary btn-sm mt-3" type="submit">Comparer</button>
      </form>

      <Card title="Tableau comparatif" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-ink-soft">
              <tr>
                <th className="py-2 font-semibold">Événement</th>
                <th className="py-2 text-right font-semibold">Réponses</th>
                <th className="py-2 text-right font-semibold">Générale</th>
                <th className="py-2 text-right font-semibold">Événement</th>
                <th className="py-2 text-right font-semibold">Formation</th>
                <th className="py-2 text-right font-semibold">Pulse</th>
                <th className="py-2 text-right font-semibold">Recommandent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="py-2"><span className="font-semibold">{e.name}</span><span className="block text-xs text-ink-soft">{formatDate(e.event_date)}</span></td>
                  <td className="py-2 text-right tabular-nums">{e.responseCount}</td>
                  <td className="py-2 text-right tabular-nums">{score(e.overallAverage)}</td>
                  <td className="py-2 text-right tabular-nums">{score(e.summary?.averages.event)}</td>
                  <td className="py-2 text-right tabular-nums">{score(e.summary?.averages.training)}</td>
                  <td className="py-2 text-right tabular-nums">{score(e.pulseAverage)}</td>
                  <td className="py-2 text-right tabular-nums">{percent(e.recommendationRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {metrics.map((m) => (
          <Card key={m.label} title={m.label} subtitle={`En ${m.unit}`}>
            <CompareBarChart data={events.map((e) => ({ name: e.name, value: m.value(e) }))} max={m.max} unit={m.unit} />
          </Card>
        ))}
      </div>

      <Card title="Axes d'amélioration communs" subtitle="Sujets signalés comme points faibles dans au moins deux événements" className="mt-6">
        {recurring.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun point faible récurrent entre les événements sélectionnés.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recurring.map((w) => (
              <li key={w.label} className="py-2.5">
                <p className="font-semibold">{w.label} <span className="text-sm font-normal text-ink-soft">· {w.events.length} événements</span></p>
                <p className="text-xs text-ink-soft">{w.events.join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
