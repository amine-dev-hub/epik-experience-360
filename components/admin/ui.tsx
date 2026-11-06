import { AlertTriangle, Info } from "lucide-react";
import type { SampleLevel } from "@/lib/analysis/engine";
import { STATUS_LABELS } from "@/lib/constants";
import type { EventStatus } from "@/types/domain";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-ink-soft">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl ${accent ? "text-epik-red" : "text-navy"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Card({ title, subtitle, children, className = "", actions }: { title?: string; subtitle?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-bold text-navy">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLE: Record<EventStatus, string> = {
  draft: "bg-surface text-ink-soft border border-line",
  published: "bg-navy-50 text-navy",
  archived: "bg-ink/5 text-ink-soft",
};

export function StatusBadge({ status, active }: { status: EventStatus; active?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABELS[status]}</span>
      {status === "published" && (
        <span className={`badge ${active ? "bg-emerald-50 text-emerald-700" : "bg-epik-red-50 text-epik-red"}`}>
          {active ? "● Formulaire ouvert" : "○ Formulaire fermé"}
        </span>
      )}
    </span>
  );
}

export function SampleWarning({ level, count }: { level: SampleLevel; count: number }) {
  if (level === "sufficient") return null;
  const text =
    level === "none"
      ? "Aucune réponse pour le moment : les statistiques apparaîtront dès la première soumission."
      : level === "small"
        ? `Échantillon réduit (${count} réponse${count > 1 ? "s" : ""}) : les résultats ne sont pas représentatifs et doivent être lus avec prudence.`
        : `Échantillon limité (${count} réponses) : résultats indicatifs, non statistiquement significatifs.`;
  const Icon = level === "indicative" ? Info : AlertTriangle;
  return (
    <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center p-10 text-center">
      <p className="font-bold text-navy">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
