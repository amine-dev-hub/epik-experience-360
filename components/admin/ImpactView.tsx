import { Lightbulb, ThumbsDown, ThumbsUp } from "lucide-react";
import type { EventAnalysisSummary, TopicInsight } from "@/lib/analysis/engine";
import { PRIORITY_LABELS, type Priority } from "@/lib/analysis/recommendations";
import { score } from "@/lib/format";
import { Card } from "./ui";

const PRIORITY_STYLE: Record<Priority, string> = {
  critical: "bg-epik-red text-white",
  high: "bg-epik-red-50 text-epik-red",
  medium: "bg-amber-50 text-amber-800",
  low: "bg-navy-50 text-navy",
};

const SENTIMENT_ROWS = [
  { key: "positive", label: "Positifs", color: "#1f6f9a" },
  { key: "mixed", label: "Mitigés", color: "#9bbbcd" },
  { key: "neutral", label: "Neutres", color: "#8a96a0" },
  { key: "suggestion", label: "Suggestions", color: "#c98a00" },
  { key: "negative", label: "Négatifs", color: "#C01030" },
] as const;

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Positif",
  negative: "Négatif",
  neutral: "Neutre",
  suggestion: "Suggestion",
};

/** Présentation des résultats d'EPIK IMPACT AI pour un événement. */
export function ImpactView({ summary }: { summary: EventAnalysisSummary }) {
  const s = summary.sentiment;
  const total = s.commentsAnalyzed;
  const suggestions = summary.themes
    .filter((t) => t.suggestion > 0)
    .flatMap((t) => t.examples.filter((e) => e.sentiment === "suggestion").map((e) => ({ theme: t.label, text: e.text })))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <InsightList title="Points forts" icon={<ThumbsUp className="size-4 text-navy" />} items={summary.strengths} kind="strength" />
        <InsightList title="Points à améliorer" icon={<ThumbsDown className="size-4 text-epik-red" />} items={summary.weaknesses} kind="weakness" />
      </div>

      <Card
        title="Recommandations prioritaires"
        subtitle="Générées à partir des notes et des commentaires réels. Aucune recommandation n'est produite sans donnée qui la justifie."
      >
        {summary.recommendations.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun problème récurrent détecté pour le moment.</p>
        ) : (
          <ol className="space-y-3">
            {summary.recommendations.map((r) => (
              <li key={r.topic} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${PRIORITY_STYLE[r.priority]}`}>Priorité : {PRIORITY_LABELS[r.priority]}</span>
                  <span className="text-sm font-bold text-ink">{r.label}</span>
                </div>
                <p className="mt-2 flex items-start gap-2 text-sm text-ink">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-epik-red" /> {r.text}
                </p>
                <ul className="mt-2 space-y-0.5 pl-6 text-xs text-ink-soft">
                  {r.evidence.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Tonalité des commentaires" subtitle={`${total} commentaire${total > 1 ? "s" : ""} analysé${total > 1 ? "s" : ""}`}>
          {total === 0 ? (
            <p className="text-sm text-ink-soft">Aucun commentaire libre pour le moment.</p>
          ) : (
            <>
              <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {SENTIMENT_ROWS.map((r) =>
                  s[r.key] > 0 ? <div key={r.key} style={{ width: `${(s[r.key] / total) * 100}%`, background: r.color }} /> : null,
                )}
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {SENTIMENT_ROWS.map((r) => (
                  <li key={r.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="size-3 rounded-sm" style={{ background: r.color }} /> {r.label}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {s[r.key]} <span className="text-ink-soft">({Math.round((s[r.key] / total) * 100)} %)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Thèmes récurrents" subtitle="Nombre de participants ayant abordé chaque thème">
          {summary.themes.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun thème détecté pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-ink-soft">
                  <tr>
                    <th className="py-2 font-semibold">Thème</th>
                    <th className="py-2 text-right font-semibold">👍</th>
                    <th className="py-2 text-right font-semibold">👎</th>
                    <th className="py-2 text-right font-semibold">💡</th>
                    <th className="py-2 text-right font-semibold">Neutre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {summary.themes.map((t) => (
                    <tr key={t.key}>
                      <td className="py-2 font-medium">{t.label}</td>
                      <td className="py-2 text-right tabular-nums">{t.positive || "·"}</td>
                      <td className="py-2 text-right tabular-nums">{t.negative || "·"}</td>
                      <td className="py-2 text-right tabular-nums">{t.suggestion || "·"}</td>
                      <td className="py-2 text-right tabular-nums">{t.neutral || "·"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {suggestions.length > 0 && (
        <Card title="Suggestions des participants" subtitle="Extraits anonymisés">
          <ul className="space-y-2">
            {suggestions.map((e, i) => (
              <li key={i} className="rounded-xl bg-surface p-3 text-sm">
                <span className="badge mb-1 bg-amber-50 text-amber-800">{e.theme}</span>
                <p className="text-ink">« {e.text} »</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.themes.length > 0 && (
        <Card title="Exemples de commentaires par thème" subtitle="Extraits anonymisés (e-mails, numéros et noms masqués)">
          <div className="grid gap-4 md:grid-cols-2">
            {summary.themes.slice(0, 8).map((t) => (
              <div key={t.key}>
                <p className="mb-1.5 text-sm font-bold text-navy">{t.label}</p>
                <ul className="space-y-1.5">
                  {t.examples.slice(0, 3).map((e, i) => (
                    <li key={i} className="rounded-lg border border-line p-2.5 text-sm">
                      <span className="mr-1 text-xs font-semibold text-ink-soft">[{SENTIMENT_LABEL[e.sentiment]}]</span>« {e.text} »
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InsightList({ title, icon, items, kind }: { title: string; icon: React.ReactNode; items: TopicInsight[]; kind: "strength" | "weakness" }) {
  return (
    <Card title={title} actions={icon}>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {kind === "strength" ? "Pas encore de point fort identifié." : "Aucun point faible récurrent identifié."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((t) => (
            <li key={t.topic} className="flex items-center justify-between gap-3 py-2.5">
              <span className="font-semibold text-ink">{t.label}</span>
              <span className="flex shrink-0 gap-3 text-xs text-ink-soft tabular-nums">
                {t.average !== null && <span>{score(t.average)}/5</span>}
                {kind === "strength" && t.positiveMentions > 0 && <span>{t.positiveMentions} avis +</span>}
                {kind === "weakness" && t.negativeMentions > 0 && <span className="text-epik-red">{t.negativeMentions} avis −</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
