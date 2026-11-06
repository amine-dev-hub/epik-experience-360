"use client";

import { ArrowLeft, ArrowRight, Calendar, Check, Loader2, MapPin, Mic, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import {
  APP_NAME,
  COMMENT_MAX_LENGTH,
  COMMENT_QUESTIONS,
  PULSE_LEVELS,
  RECOMMENDATION_LABELS,
  SLOGAN,
} from "@/lib/constants";
import { participantSchema } from "@/lib/validation";
import { COMMENT_FIELDS, type CommentField, type CriterionRow, type Recommendation } from "@/types/domain";
import { StarRating } from "./StarRating";

export interface WizardEvent {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  speaker: string | null;
  speaker_title: string | null;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
}

interface FormState {
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  privacy_consent: boolean;
  ratings: Record<string, number>;
  pulse_score: number | null;
  recommendation: Recommendation | null;
  comments: Record<CommentField, string>;
}

const emptyComments = Object.fromEntries(COMMENT_FIELDS.map((f) => [f, ""])) as Record<CommentField, string>;

const STEPS = [
  "Accueil",
  "Vos informations",
  "L'événement",
  "La formation",
  "Live Pulse",
  "Vos commentaires",
  "Recommandation",
  "Récapitulatif",
] as const;

export function FeedbackWizard({ event, criteria }: { event: WizardEvent; criteria: CriterionRow[] }) {
  const router = useRouter();
  const draftKey = `epik-draft-${event.id}`;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    last_name: "",
    first_name: "",
    email: "",
    phone: "",
    privacy_consent: false,
    ratings: {},
    pulse_score: null,
    recommendation: null,
    comments: emptyComments,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const startedAt = useRef<number>(0);
  const topRef = useRef<HTMLDivElement>(null);

  const eventCriteria = useMemo(() => criteria.filter((c) => c.category === "event"), [criteria]);
  const trainingCriteria = useMemo(() => criteria.filter((c) => c.category === "training"), [criteria]);

  // Brouillon local : seules les réponses non personnelles sont conservées (sessionStorage,
  // effacé à la fermeture de l'onglet). Nom, e-mail et téléphone ne sont jamais stockés.
  useEffect(() => {
    startedAt.current = Date.now();
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<FormState>;
        const validIds = new Set(criteria.map((c) => c.id));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration unique du brouillon au montage
        setForm((f) => ({
          ...f,
          ratings: Object.fromEntries(
            Object.entries(draft.ratings ?? {}).filter(([k, v]) => validIds.has(k) && v >= 1 && v <= 5),
          ),
          pulse_score: draft.pulse_score ?? null,
          recommendation: draft.recommendation ?? null,
          comments: { ...emptyComments, ...(draft.comments ?? {}) },
        }));
      }
    } catch {
      /* stockage indisponible : on continue sans brouillon */
    }
  }, [draftKey, criteria]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ratings: form.ratings,
          pulse_score: form.pulse_score,
          recommendation: form.recommendation,
          comments: form.comments,
        }),
      );
    } catch {
      /* ignoré */
    }
  }, [draftKey, form.ratings, form.pulse_score, form.recommendation, form.comments]);

  const goTo = (next: number) => {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      const r = participantSchema.safeParse(form);
      if (!r.success) {
        for (const issue of r.error.issues) {
          const k = String(issue.path[0]);
          if (!e[k]) e[k] = issue.message;
        }
      }
    }
    if (s === 2 || s === 3) {
      const list = s === 2 ? eventCriteria : trainingCriteria;
      for (const c of list) if (!form.ratings[c.id]) e[`rating_${c.id}`] = "required";
      if (Object.keys(e).length) e._step = "Merci de noter chaque critère.";
    }
    if (s === 4 && !form.pulse_score) e._step = "Merci de choisir comment vous avez vécu l'expérience.";
    if (s === 5) {
      for (const f of COMMENT_FIELDS) {
        if (form.comments[f].length > COMMENT_MAX_LENGTH) e[f] = `${COMMENT_MAX_LENGTH} caractères maximum`;
      }
    }
    if (s === 6 && !form.recommendation) e._step = "Merci de choisir une réponse.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    // On saute une étape de notation vide (événement sans critère de formation, par ex.)
    let target = step + 1;
    if (target === 2 && eventCriteria.length === 0) target++;
    if (target === 3 && trainingCriteria.length === 0) target++;
    goTo(target);
  };

  const back = () => {
    let target = step - 1;
    if (target === 3 && trainingCriteria.length === 0) target--;
    if (target === 2 && eventCriteria.length === 0) target--;
    goTo(Math.max(0, target));
  };

  const submit = async () => {
    for (const s of [1, 2, 3, 4, 6]) {
      if (!validateStep(s)) {
        goTo(s);
        setTimeout(() => validateStep(s), 0);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(event.slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_name: form.last_name,
          first_name: form.first_name,
          email: form.email,
          phone: form.phone,
          privacy_consent: form.privacy_consent,
          ratings: form.ratings,
          pulse_score: form.pulse_score,
          recommendation: form.recommendation,
          ...form.comments,
          website,
          started_at: startedAt.current,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setSubmitError(data?.error ?? "Une erreur est survenue. Merci de réessayer.");
        setSubmitting(false);
        return;
      }
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* ignoré */
      }
      router.replace(`/event/${event.slug}/merci`);
    } catch {
      setSubmitError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
      setSubmitting(false);
    }
  };

  const setRating = (id: string, v: number) => setForm((f) => ({ ...f, ratings: { ...f.ratings, [id]: v } }));
  const progress = step === 0 ? 0 : Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div ref={topRef} className="mx-auto w-full max-w-xl scroll-mt-4 px-4 pt-4 pb-28 sm:pt-8">
      {step > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-5 bg-surface/90 px-4 pt-2 pb-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>
              Étape {step} / {STEPS.length - 1} · {STEPS[step]}
            </span>
            <span>{progress} %</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-navy to-epik-red transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div key={step} className="animate-fade-up">
        {step === 0 && <Welcome event={event} onStart={() => goTo(1)} />}

        {step === 1 && (
          <Section title="Vos informations" subtitle="Ces informations nous permettent d'éviter les doublons. Elles ne sont jamais publiées.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" error={errors.last_name}>
                <input className="input" autoComplete="family-name" value={form.last_name} aria-invalid={!!errors.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })} maxLength={80} />
              </Field>
              <Field label="Prénom" error={errors.first_name}>
                <input className="input" autoComplete="given-name" value={form.first_name} aria-invalid={!!errors.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })} maxLength={80} />
              </Field>
            </div>
            <Field label="Adresse e-mail" error={errors.email}>
              <input className="input" type="email" inputMode="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} placeholder="prenom.nom@exemple.com" />
            </Field>
            <Field label="Numéro de téléphone" error={errors.phone}>
              <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} aria-invalid={!!errors.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} placeholder="+216 20 123 456" />
            </Field>
            {/* Champ piège anti-robots, invisible pour les humains */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Site web
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
            <div className="rounded-xl border border-navy-100 bg-navy-50/60 p-4 text-sm text-ink-soft">
              <p className="mb-3 flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-navy" />
                <span>
                  Vos données sont utilisées uniquement par EPIK LEADERS pour analyser la satisfaction et améliorer nos
                  événements. Elles ne sont ni vendues ni partagées.{" "}
                  <Link href="/confidentialite" target="_blank" className="font-semibold text-navy underline">
                    Politique de confidentialité
                  </Link>
                </span>
              </p>
              <label className="flex cursor-pointer items-start gap-3 text-ink">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-navy" checked={form.privacy_consent}
                  onChange={(e) => setForm({ ...form, privacy_consent: e.target.checked })} aria-invalid={!!errors.privacy_consent} />
                <span>J&apos;accepte que mes réponses et mes coordonnées soient collectées et traitées dans ce but.</span>
              </label>
              {errors.privacy_consent && <p className="field-error">{errors.privacy_consent}</p>}
            </div>
          </Section>
        )}

        {(step === 2 || step === 3) && (
          <Section
            title={step === 2 ? "Évaluation globale de l'événement" : "Évaluation de la formation"}
            subtitle="Notez chaque critère de 1 à 5 étoiles."
          >
            {(step === 2 ? eventCriteria : trainingCriteria).map((c) => (
              <div key={c.id} className="card p-4">
                <p className="font-semibold text-ink">{c.label}</p>
                {c.description && <p className="mt-0.5 mb-3 text-sm text-ink-soft">{c.description}</p>}
                <StarRating name={c.label} value={form.ratings[c.id]} onChange={(v) => setRating(c.id, v)} invalid={!!errors[`rating_${c.id}`]} />
              </div>
            ))}
          </Section>
        )}

        {step === 4 && (
          <Section title="EPIK LIVE PULSE" subtitle="Comment avez-vous vécu cette expérience ?" accent>
            <div className="grid grid-cols-5 gap-2">
              {PULSE_LEVELS.map((l) => {
                const selected = form.pulse_score === l.score;
                return (
                  <button
                    key={l.score}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setForm({ ...form, pulse_score: l.score })}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-1 py-3 transition ${
                      selected ? "scale-105 border-epik-red bg-epik-red-50 shadow-md" : "border-line bg-white hover:border-navy-200"
                    }`}
                  >
                    <span className={`text-3xl sm:text-4xl ${selected ? "animate-pop" : ""}`} aria-hidden>
                      {l.emoji}
                    </span>
                    <span className="text-[11px] leading-tight font-semibold text-ink sm:text-xs">{l.label}</span>
                  </button>
                );
              })}
            </div>
            {form.pulse_score && (
              <div key={form.pulse_score} className="animate-fade-up rounded-2xl bg-navy p-5 text-center text-white">
                <div className="animate-float text-5xl" aria-hidden>
                  {PULSE_LEVELS[form.pulse_score - 1].emoji}
                </div>
                <p className="mt-2 font-semibold">
                  {form.pulse_score >= 4
                    ? "Merci, ravi que l'expérience vous ait plu !"
                    : form.pulse_score === 3
                      ? "Merci ! Dites-nous à l'étape suivante ce qui aurait pu être mieux."
                      : "Merci pour votre franchise. Vos commentaires nous aideront à nous améliorer."}
                </p>
              </div>
            )}
          </Section>
        )}

        {step === 5 && (
          <Section title="Vos commentaires" subtitle="Exprimez-vous librement. Toutes les questions sont facultatives.">
            {COMMENT_FIELDS.map((f) => (
              <Field key={f} label={COMMENT_QUESTIONS[f]} error={errors[f]}>
                <textarea
                  className="input min-h-24 py-3"
                  rows={3}
                  maxLength={COMMENT_MAX_LENGTH}
                  value={form.comments[f]}
                  onChange={(e) => setForm({ ...form, comments: { ...form.comments, [f]: e.target.value } })}
                />
                <p className="mt-1 text-right text-xs text-ink-soft">
                  {form.comments[f].length} / {COMMENT_MAX_LENGTH}
                </p>
              </Field>
            ))}
          </Section>
        )}

        {step === 6 && (
          <Section title="Recommandation" subtitle="Recommanderiez-vous un événement organisé par EPIK LEADERS à un ami ?">
            <div className="grid gap-3">
              {(["yes", "maybe", "no"] as const).map((r) => {
                const selected = form.recommendation === r;
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setForm({ ...form, recommendation: r })}
                    className={`flex min-h-14 items-center justify-between rounded-2xl border-2 px-5 text-left text-base font-semibold transition ${
                      selected ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy-200"
                    }`}
                  >
                    {RECOMMENDATION_LABELS[r]}
                    {selected && <Check className="size-5 animate-pop" />}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === 7 && (
          <Section title="Récapitulatif" subtitle="Vérifiez vos réponses avant l'envoi. Vous pouvez encore les modifier.">
            <Recap
              title="Vos informations"
              onEdit={() => goTo(1)}
              rows={[
                ["Nom", `${form.first_name} ${form.last_name}`],
                ["E-mail", form.email],
                ["Téléphone", form.phone],
              ]}
            />
            {eventCriteria.length > 0 && (
              <Recap title="L'événement" onEdit={() => goTo(2)} rows={eventCriteria.map((c) => [c.label, stars(form.ratings[c.id])])} />
            )}
            {trainingCriteria.length > 0 && (
              <Recap title="La formation" onEdit={() => goTo(3)} rows={trainingCriteria.map((c) => [c.label, stars(form.ratings[c.id])])} />
            )}
            <Recap
              title="Live Pulse & recommandation"
              onEdit={() => goTo(4)}
              rows={[
                ["Expérience", form.pulse_score ? `${PULSE_LEVELS[form.pulse_score - 1].emoji} ${PULSE_LEVELS[form.pulse_score - 1].label}` : "—"],
                ["Recommandation", form.recommendation ? RECOMMENDATION_LABELS[form.recommendation] : "—"],
              ]}
            />
            <Recap
              title="Commentaires"
              onEdit={() => goTo(5)}
              rows={COMMENT_FIELDS.map((f) => [COMMENT_QUESTIONS[f], form.comments[f].trim() || "—"])}
              stacked
            />
            {submitError && (
              <div role="alert" className="rounded-xl border border-epik-red/30 bg-epik-red-50 p-4 text-sm font-medium text-epik-red">
                {submitError}
              </div>
            )}
          </Section>
        )}

        {errors._step && (
          <p role="alert" className="mt-4 rounded-xl bg-epik-red-50 p-3 text-sm font-medium text-epik-red">
            {errors._step}
          </p>
        )}
      </div>

      {step > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" className="btn-ghost" onClick={back} disabled={submitting}>
              <ArrowLeft className="size-4" /> Retour
            </button>
            {step < 7 ? (
              <button type="button" className="btn-primary flex-1" onClick={next}>
                Continuer <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" className="btn-accent flex-1" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {submitting ? "Envoi en cours…" : "Envoyer mon avis"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function stars(v: number | undefined) {
  return v ? `${"★".repeat(v)}${"☆".repeat(5 - v)}  ${v}/5` : "—";
}

function Welcome({ event, onStart }: { event: WizardEvent; onStart: () => void }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-navy text-white shadow-xl">
      <div className="relative px-6 pt-8 pb-7">
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-epik-red/25 blur-2xl" />
        <div className="relative">
          <div className="mb-6 inline-flex rounded-2xl ring-1 ring-white/15">
            <Logo size={44} />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] text-white/70">{APP_NAME}</p>
          <h1 className="mt-2 text-2xl leading-tight font-extrabold sm:text-3xl">{event.name}</h1>
          {event.subtitle && <p className="mt-1 text-white/80">{event.subtitle}</p>}
          <p className="mt-4 text-lg font-semibold text-white">{SLOGAN}</p>
        </div>
      </div>
      <div className="space-y-2 border-t border-white/10 bg-navy-700/60 px-6 py-4 text-sm text-white/85">
        <p className="flex items-center gap-2">
          <Calendar className="size-4 shrink-0" /> {event.dateLabel}
          {event.timeLabel && ` · ${event.timeLabel}`}
        </p>
        {event.location && (
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" /> {event.location}
          </p>
        )}
        {event.speaker && (
          <p className="flex items-center gap-2">
            <Mic className="size-4 shrink-0" /> {event.speaker}
            {event.speaker_title && ` — ${event.speaker_title}`}
          </p>
        )}
      </div>
      <div className="bg-white px-6 py-6 text-ink">
        <p className="leading-relaxed text-ink-soft">
          Votre expérience compte. Prenez quelques minutes pour partager votre avis sur cet événement. Vos réponses nous
          aideront à améliorer nos prochaines expériences.
        </p>
        <button type="button" onClick={onStart} className="btn-accent mt-5 w-full text-base">
          Commencer l&apos;évaluation <ArrowRight className="size-5" />
        </button>
        <p className="mt-3 text-center text-xs text-ink-soft">Environ 3 minutes · Aucun compte nécessaire</p>
      </div>
    </div>
  );
}

function Section({ title, subtitle, accent, children }: { title: string; subtitle?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className={`text-xl font-extrabold sm:text-2xl ${accent ? "text-epik-red" : "text-navy"}`}>{title}</h2>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}

function Recap({ title, rows, onEdit, stacked }: { title: string; rows: [string, string][]; onEdit: () => void; stacked?: boolean }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-navy">{title}</h3>
        <button type="button" onClick={onEdit} className="btn-ghost btn-sm">
          <Pencil className="size-3.5" /> Modifier
        </button>
      </div>
      <dl className="divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className={stacked ? "py-2" : "flex justify-between gap-4 py-2"}>
            <dt className="text-ink-soft">{k}</dt>
            <dd className={`font-medium text-ink ${stacked ? "mt-0.5 whitespace-pre-wrap" : "text-right"}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
