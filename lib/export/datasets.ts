import { classifyComment } from "@/lib/analysis/classify";
import type { EventAnalysisSummary } from "@/lib/analysis/engine";
import { OTHER_THEME, SUGGESTION_THEME, THEMES } from "@/lib/analysis/lexicon";
import { PRIORITY_LABELS } from "@/lib/analysis/recommendations";
import { COMMENT_QUESTIONS, PULSE_LEVELS, RECOMMENDATION_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { COMMENT_FIELDS, type CriterionRow, type EventRow, type PulseRow, type RatingRow, type SubmissionRow } from "@/types/domain";

export type Cell = string | number | null;
export interface Table {
  name: string;
  columns: string[];
  rows: Cell[][];
}

export interface EventDataset {
  event: EventRow;
  criteria: CriterionRow[];
  submissions: SubmissionRow[];
  ratings: RatingRow[];
  pulses: PulseRow[];
  summary: EventAnalysisSummary;
}

const THEME_LABELS = new Map<string, string>([
  ...THEMES.map((t) => [t.key, t.label] as [string, string]),
  [SUGGESTION_THEME.key, SUGGESTION_THEME.label],
  [OTHER_THEME.key, OTHER_THEME.label],
]);
const SENTIMENT_FR: Record<string, string> = {
  positive: "Positif",
  negative: "Négatif",
  neutral: "Neutre",
  suggestion: "Suggestion",
  mixed: "Mitigé",
};

function index(d: EventDataset) {
  const ratingsBySubmission = new Map<string, Map<string, number>>();
  for (const r of d.ratings) {
    const m = ratingsBySubmission.get(r.submission_id) ?? new Map();
    m.set(r.criterion_id, r.rating);
    ratingsBySubmission.set(r.submission_id, m);
  }
  const pulse = new Map(d.pulses.map((p) => [p.submission_id, p.pulse_score]));
  const avgOf = (id: string) => {
    const values = [...(ratingsBySubmission.get(id)?.values() ?? [])];
    return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null;
  };
  return { ratingsBySubmission, pulse, avgOf };
}

export function participantsTable(d: EventDataset): Table {
  const { avgOf } = index(d);
  return {
    name: "Participants",
    columns: ["Nom", "Prénom", "E-mail", "Téléphone", "Événement", "Date de participation", "Évaluation moyenne", "Recommandation"],
    rows: d.submissions.map((s) => [
      s.last_name,
      s.first_name,
      s.email,
      s.phone,
      d.event.name,
      formatDateTime(s.submitted_at),
      avgOf(s.id),
      RECOMMENDATION_LABELS[s.recommendation],
    ]),
  };
}

export function responsesTable(d: EventDataset): Table {
  const { ratingsBySubmission, pulse, avgOf } = index(d);
  return {
    name: "Réponses",
    columns: [
      "Date",
      "Nom",
      "Prénom",
      "E-mail",
      "Téléphone",
      ...d.criteria.map((c) => c.label),
      "Moyenne",
      "Live Pulse",
      "Recommandation",
      ...COMMENT_FIELDS.map((f) => COMMENT_QUESTIONS[f]),
    ],
    rows: d.submissions.map((s) => {
      const r = ratingsBySubmission.get(s.id);
      const p = pulse.get(s.id);
      return [
        formatDateTime(s.submitted_at),
        s.last_name,
        s.first_name,
        s.email,
        s.phone,
        ...d.criteria.map((c) => r?.get(c.id) ?? null),
        avgOf(s.id),
        p ? `${p} — ${PULSE_LEVELS[p - 1].label}` : null,
        RECOMMENDATION_LABELS[s.recommendation],
        ...COMMENT_FIELDS.map((f) => s[f] ?? ""),
      ];
    }),
  };
}

export function ratingsTable(d: EventDataset): Table {
  const names = new Map(d.submissions.map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
  const crit = new Map(d.criteria.map((c) => [c.id, c]));
  return {
    name: "Évaluations",
    columns: ["Participant", "Catégorie", "Critère", "Note /5"],
    rows: d.ratings
      .filter((r) => names.has(r.submission_id) && crit.has(r.criterion_id))
      .map((r) => {
        const c = crit.get(r.criterion_id)!;
        return [names.get(r.submission_id)!, c.category === "event" ? "Événement" : "Formation", c.label, r.rating];
      }),
  };
}

export function commentsTable(d: EventDataset): Table {
  const rows: Cell[][] = [];
  for (const s of d.submissions) {
    for (const f of COMMENT_FIELDS) {
      const text = s[f];
      if (!text?.trim()) continue;
      const c = classifyComment(text, f);
      rows.push([
        formatDateTime(s.submitted_at),
        `${s.first_name} ${s.last_name}`,
        COMMENT_QUESTIONS[f],
        text,
        c.empty ? "—" : SENTIMENT_FR[c.overall],
        c.empty ? "Réponse vide" : [...new Set(c.mentions.map((m) => THEME_LABELS.get(m.theme) ?? m.theme))].join(", "),
      ]);
    }
  }
  return { name: "Commentaires", columns: ["Date", "Participant", "Question", "Commentaire", "Tonalité", "Thèmes détectés"], rows };
}

export function statsTables(d: EventDataset): Table[] {
  const s = d.summary;
  return [
    {
      name: "Synthèse",
      columns: ["Indicateur", "Valeur"],
      rows: [
        ["Événement", d.event.name],
        ["Date", formatDate(d.event.event_date)],
        ["Lieu", d.event.location ?? ""],
        ["Intervenant", [d.event.speaker, d.event.speaker_title].filter(Boolean).join(" — ")],
        ["Nombre de réponses", s.responseCount],
        ["Moyenne générale (/5)", s.averages.overall],
        ["Moyenne événement (/5)", s.averages.event],
        ["Moyenne formation (/5)", s.averages.training],
        ["Live Pulse moyen (/5)", s.averages.pulse],
        ["Satisfaction globale (% de notes ≥ 4)", s.satisfaction.overall],
        ["Recommandent (% de « Oui »)", s.recommendation.rate],
        ["Oui / Peut-être / Non", `${s.recommendation.yes} / ${s.recommendation.maybe} / ${s.recommendation.no}`],
        ["Commentaires analysés", s.sentiment.commentsAnalyzed],
        ["Analyse générée le", formatDateTime(s.generatedAt)],
        [
          "Représentativité",
          s.sample === "sufficient" ? "Suffisante" : s.sample === "indicative" ? "Indicative (moins de 30 réponses)" : "Échantillon réduit (moins de 10 réponses)",
        ],
      ],
    },
    {
      name: "Critères",
      columns: ["Catégorie", "Critère", "Moyenne /5", "Satisfaits (%)", "Notes", "1★", "2★", "3★", "4★", "5★"],
      rows: s.criteria.map((c) => [
        c.category === "event" ? "Événement" : "Formation",
        c.label,
        c.average,
        c.satisfaction,
        c.count,
        ...c.distribution,
      ]),
    },
    {
      name: "Live Pulse",
      columns: ["Niveau", "Réponses"],
      rows: PULSE_LEVELS.map((l, i) => [`${l.emoji} ${l.label}`, s.pulse.distribution[i]]),
    },
  ];
}

export function insightTables(d: EventDataset): Table[] {
  const s = d.summary;
  return [
    {
      name: "Points forts",
      columns: ["Sujet", "Moyenne /5", "Avis positifs", "Sources"],
      rows: s.strengths.map((t) => [t.label, t.average, t.positiveMentions, t.sources.join(", ")]),
    },
    {
      name: "Points faibles",
      columns: ["Sujet", "Moyenne /5", "Avis négatifs", "Sources"],
      rows: s.weaknesses.map((t) => [t.label, t.average, t.negativeMentions, t.sources.join(", ")]),
    },
    {
      name: "Recommandations",
      columns: ["Priorité", "Sujet", "Recommandation", "Justification"],
      rows: s.recommendations.map((r) => [PRIORITY_LABELS[r.priority], r.label, r.text, r.evidence.join(" | ")]),
    },
    {
      name: "Thèmes",
      columns: ["Thème", "Positifs", "Négatifs", "Suggestions", "Neutres", "Total"],
      rows: s.themes.map((t) => [t.label, t.positive, t.negative, t.suggestion, t.neutral, t.total]),
    },
  ];
}

export function tablesFor(type: string, d: EventDataset): Table[] | null {
  switch (type) {
    case "participants":
      return [participantsTable(d)];
    case "responses":
      return [responsesTable(d)];
    case "ratings":
      return [ratingsTable(d)];
    case "comments":
      return [commentsTable(d)];
    case "stats":
      return statsTables(d);
    case "report":
      return [...statsTables(d), ...insightTables(d), responsesTable(d)];
    default:
      return null;
  }
}
