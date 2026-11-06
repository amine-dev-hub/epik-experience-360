import { CalendarDays, MapPin, Plus, QrCode, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EventActions } from "@/components/admin/EventActions";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { listEventsWithStats } from "@/lib/data/admin";
import { siteUrl } from "@/lib/env";
import { formatDate, percent, score } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";
import type { EventStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Événements" };

export default async function EventsPage({ searchParams }: PageProps<"/admin/events">) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const all = await listEventsWithStats(db);
  const events = all.filter(
    (e) => (!status || e.status === status) && (!from || e.event_date >= from) && (!to || e.event_date <= to),
  );
  const base = siteUrl();

  return (
    <>
      <PageHeader
        title="Événements"
        subtitle={`${all.length} événement${all.length > 1 ? "s" : ""} au total`}
        actions={
          <Link href="/admin/events/new" className="btn-accent">
            <Plus className="size-4" /> Nouvel événement
          </Link>
        }
      />

      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="min-w-40 flex-1">
          <span className="label">Statut</span>
          <select name="status" defaultValue={status} className="input">
            <option value="">Tous</option>
            {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-40 flex-1">
          <span className="label">Du</span>
          <input type="date" name="from" defaultValue={from} className="input" />
        </label>
        <label className="min-w-40 flex-1">
          <span className="label">Au</span>
          <input type="date" name="to" defaultValue={to} className="input" />
        </label>
        <button className="btn-primary" type="submit">
          Filtrer
        </button>
        {(status || from || to) && (
          <Link href="/admin/events" className="btn-ghost">
            Réinitialiser
          </Link>
        )}
      </form>

      {events.length === 0 ? (
        <EmptyState
          title="Aucun événement"
          text={all.length ? "Aucun événement ne correspond à ces filtres." : "Créez votre premier événement pour générer son formulaire et son QR code."}
          action={!all.length && <Link href="/admin/events/new" className="btn-primary">Créer un événement</Link>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {events.map((e) => (
            <article key={e.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <StatusBadge status={e.status} active={e.is_active} />
                  <Link href={`/admin/events/${e.id}`} className="mt-2 block text-lg font-bold text-ink hover:text-navy">
                    {e.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" /> {formatDate(e.event_date)}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" /> {e.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <dl className="my-4 grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-center">
                <div>
                  <dt className="text-xs text-ink-soft"><Users className="mr-1 inline size-3" />Réponses</dt>
                  <dd className="text-lg font-extrabold text-navy tabular-nums">{e.responseCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft">Satisfaction</dt>
                  <dd className="text-lg font-extrabold text-navy tabular-nums">{score(e.overallAverage)}<span className="text-xs font-semibold">/5</span></dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft">Recommandent</dt>
                  <dd className="text-lg font-extrabold text-navy tabular-nums">{percent(e.recommendationRate)}</dd>
                </div>
              </dl>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2 py-1.5 font-mono text-xs text-ink-soft">
                  {base}/event/{e.slug}
                </code>
                <Link href={`/admin/events/${e.id}#qr`} className="btn-ghost btn-sm">
                  <QrCode className="size-3.5" /> QR code
                </Link>
              </div>
              <EventActions id={e.id} slug={e.slug} status={e.status} isActive={e.is_active} compact />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
