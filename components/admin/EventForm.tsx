"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save } from "lucide-react";
import { useActionState, useState } from "react";
import type { EventFormState } from "@/app/admin/(protected)/events/actions";
import { DEFAULT_CRITERIA, ORG_NAME, STATUS_LABELS } from "@/lib/constants";
import { slugify } from "@/lib/validation";
import type { CriterionCategory, CriterionRow, EventRow, EventStatus } from "@/types/domain";

interface CriterionDraft {
  id?: string;
  key: string;
  category: CriterionCategory;
  code: string;
  label: string;
  description: string | null;
  is_active: boolean;
}

export function EventForm({
  action,
  event,
  criteria,
  submitLabel,
}: {
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  event?: EventRow;
  criteria?: CriterionRow[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!event);
  const [items, setItems] = useState<CriterionDraft[]>(() =>
    criteria?.length
      ? criteria.map((c) => ({ ...c, key: c.id }))
      : DEFAULT_CRITERIA.map((c) => ({ ...c, key: c.code, is_active: true })),
  );
  const e = state.errors ?? {};

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  };
  const update = (i: number, patch: Partial<CriterionDraft>) => setItems(items.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const add = (category: CriterionCategory) => {
    const used = new Set(items.map((c) => c.code));
    let n = items.length + 1;
    while (used.has(`critere_${n}`)) n++;
    const code = `critere_${n}`;
    setItems([...items, { key: code, category, code, label: "", description: "", is_active: true }]);
  };

  const criteriaPayload = JSON.stringify(
    items.map(({ id, category, code, label, description, is_active }) => ({ id, category, code, label, description: description || null, is_active })),
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-bold text-navy">Informations</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Nom de l'événement *" error={e.name} className="sm:col-span-2">
            <input
              name="name"
              className="input"
              required
              value={name}
              onChange={(ev) => {
                setName(ev.target.value);
                if (!slugTouched) setSlug(slugify(ev.target.value));
              }}
            />
          </F>
          <F label="Lien public (slug) *" error={e.slug} hint={`/event/${slug || "mon-evenement"}`}>
            <input
              name="slug"
              className="input font-mono"
              required
              value={slug}
              onChange={(ev) => {
                setSlugTouched(true);
                setSlug(slugify(ev.target.value));
              }}
            />
          </F>
          <F label="Sous-titre" error={e.subtitle}>
            <input name="subtitle" className="input" defaultValue={event?.subtitle ?? ""} />
          </F>
          <F label="Description" error={e.description} className="sm:col-span-2">
            <textarea name="description" rows={3} className="input py-3" defaultValue={event?.description ?? ""} />
          </F>
          <F label="Organisateur *" error={e.organizer}>
            <input name="organizer" className="input" required defaultValue={event?.organizer ?? ORG_NAME} />
          </F>
          <F label="Lieu" error={e.location}>
            <input name="location" className="input" defaultValue={event?.location ?? ""} />
          </F>
          <F label="Intervenant" error={e.speaker}>
            <input name="speaker" className="input" defaultValue={event?.speaker ?? ""} />
          </F>
          <F label="Fonction de l'intervenant" error={e.speaker_title}>
            <input name="speaker_title" className="input" defaultValue={event?.speaker_title ?? ""} />
          </F>
          <F label="Date *" error={e.event_date}>
            <input type="date" name="event_date" className="input" required defaultValue={event?.event_date ?? ""} />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Début" error={e.start_time}>
              <input type="time" name="start_time" className="input" defaultValue={event?.start_time?.slice(0, 5) ?? ""} />
            </F>
            <F label="Fin" error={e.end_time}>
              <input type="time" name="end_time" className="input" defaultValue={event?.end_time?.slice(0, 5) ?? ""} />
            </F>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold text-navy">Publication</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <F label="Statut" error={e.status}>
            <select name="status" className="input" defaultValue={event?.status ?? "draft"}>
              {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </F>
          <F label="Conservation des réponses (jours)" error={e.data_retention_days}>
            <input type="number" name="data_retention_days" min={30} max={3650} className="input" defaultValue={event?.data_retention_days ?? 365} />
          </F>
          <label className="flex items-center gap-3 self-end rounded-xl border border-line px-4 py-3">
            <input type="checkbox" name="is_active" defaultChecked={event?.is_active ?? true} className="size-5 accent-navy" />
            <span className="text-sm font-semibold">Formulaire ouvert aux réponses</span>
          </label>
        </div>
        <p className="text-sm text-ink-soft">
          « Publié » rend la page visible ; le formulaire n&apos;accepte des réponses que s&apos;il est aussi ouvert.
        </p>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-bold text-navy">Critères d&apos;évaluation (1 à 5 étoiles)</h2>
          <p className="text-sm text-ink-soft">
            Un critère qui a déjà reçu des notes ne peut pas être supprimé : décochez « Actif » pour le masquer.
          </p>
        </div>
        {(["event", "training"] as const).map((cat) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-bold text-ink">{cat === "event" ? "Évaluation de l'événement" : "Évaluation de la formation"}</h3>
            {items.map((c, i) =>
              c.category !== cat ? null : (
                <div key={c.key} className={`grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1.4fr_auto] ${c.is_active ? "" : "opacity-60"}`}>
                  <input className="input" placeholder="Libellé" value={c.label} onChange={(ev) => update(i, { label: ev.target.value })} maxLength={120} required />
                  <input className="input" placeholder="Description (facultatif)" value={c.description ?? ""} onChange={(ev) => update(i, { description: ev.target.value })} maxLength={300} />
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1.5 px-2 text-xs font-semibold">
                      <input type="checkbox" checked={c.is_active} onChange={(ev) => update(i, { is_active: ev.target.checked })} className="size-4 accent-navy" /> Actif
                    </label>
                    <button type="button" className="btn-ghost btn-sm px-2" onClick={() => move(i, -1)} aria-label="Monter"><ArrowUp className="size-3.5" /></button>
                    <button type="button" className="btn-ghost btn-sm px-2" onClick={() => move(i, 1)} aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
                    {!c.id && (
                      <button type="button" className="btn-ghost btn-sm px-2 text-epik-red" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label="Retirer">✕</button>
                    )}
                  </div>
                </div>
              ),
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={() => add(cat)}>
              <Plus className="size-3.5" /> Ajouter un critère
            </button>
          </div>
        ))}
        <input type="hidden" name="criteria" value={criteriaPayload} />
      </section>

      {state.message && (
        <p role="alert" className="rounded-xl bg-epik-red-50 p-3 text-sm font-medium text-epik-red">
          {state.message}
        </p>
      )}
      {Object.keys(e).length > 0 && (
        <p role="alert" className="rounded-xl bg-epik-red-50 p-3 text-sm font-medium text-epik-red">
          Merci de corriger les champs signalés.
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

function F({ label, error, hint, className = "", children }: { label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block font-mono text-xs text-ink-soft">{hint}</span>}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}
