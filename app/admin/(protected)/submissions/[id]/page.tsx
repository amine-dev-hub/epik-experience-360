import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSubmissionButton } from "@/components/admin/DeleteSubmissionButton";
import { Card, PageHeader } from "@/components/admin/ui";
import { classifyComment } from "@/lib/analysis/classify";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { COMMENT_QUESTIONS, PULSE_LEVELS, RECOMMENDATION_LABELS } from "@/lib/constants";
import { COMMENT_FIELDS, type SubmissionRow } from "@/types/domain";

export const metadata: Metadata = { title: "Détail d'une soumission" };

const SENTIMENT: Record<string, string> = { positive: "Positif", negative: "Négatif", neutral: "Neutre", suggestion: "Suggestion", mixed: "Mitigé" };

export default async function SubmissionPage({ params }: PageProps<"/admin/submissions/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db } = await requireAdmin();
  const { data: s } = await db.from("feedback_submissions").select("*, events(id,name)").eq("id", id).maybeSingle();
  if (!s) notFound();
  const sub = s as SubmissionRow & { events: { id: string; name: string } };

  const [{ data: ratings }, { data: pulse }] = await Promise.all([
    db.from("feedback_ratings").select("rating, event_criteria(label,category,display_order)").eq("submission_id", id),
    db.from("live_pulse_responses").select("pulse_score").eq("submission_id", id).maybeSingle(),
  ]);
  const rows = (ratings ?? [])
    .map((r) => ({ rating: r.rating, ...(r.event_criteria as unknown as { label: string; category: string; display_order: number }) }))
    .sort((a, b) => a.display_order - b.display_order);
  const level = pulse ? PULSE_LEVELS[pulse.pulse_score - 1] : null;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/participants" className="text-sm font-semibold text-navy">← Participants</Link>
      <PageHeader
        title={`${sub.first_name} ${sub.last_name}`}
        subtitle={<>Réponse à <Link className="font-semibold text-navy" href={`/admin/events/${sub.events.id}`}>{sub.events.name}</Link> · {formatDateTime(sub.submitted_at)}</>}
        actions={<DeleteSubmissionButton id={sub.id} eventId={sub.events.id} />}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Coordonnées">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">E-mail</dt><dd className="font-medium">{sub.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Téléphone</dt><dd className="font-medium">{sub.phone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Recommande EPIK</dt><dd className="font-medium">{RECOMMENDATION_LABELS[sub.recommendation]}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Live Pulse</dt><dd className="font-medium">{level ? `${level.emoji} ${level.label}` : "—"}</dd></div>
          </dl>
        </Card>
        <Card title="Notes">
          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.label} className="flex justify-between gap-4 py-2">
                <span>{r.label}</span>
                <span className="font-semibold text-epik-red tabular-nums" aria-label={`${r.rating} sur 5`}>{"★".repeat(r.rating)}<span className="text-navy-100">{"★".repeat(5 - r.rating)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Commentaires" subtitle="Avec l'interprétation d'EPIK IMPACT AI" className="mt-6">
        <div className="space-y-4">
          {COMMENT_FIELDS.map((f) => {
            const text = sub[f];
            const c = text ? classifyComment(text, f) : null;
            return (
              <div key={f}>
                <p className="text-sm font-semibold text-ink-soft">{COMMENT_QUESTIONS[f]}</p>
                <p className="mt-1 whitespace-pre-wrap text-ink">{text || "—"}</p>
                {c && !c.empty && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Tonalité : <strong>{SENTIMENT[c.overall]}</strong> · Thèmes : {[...new Set(c.mentions.map((m) => m.theme))].join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
