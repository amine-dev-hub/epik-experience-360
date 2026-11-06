import { INDICATIVE_SAMPLE_THRESHOLD, SMALL_SAMPLE_THRESHOLD } from "@/lib/constants";
import {
  COMMENT_FIELDS,
  type CommentField,
  type CriterionCategory,
  type CriterionRow,
  type PulseRow,
  type RatingRow,
  type SubmissionRow,
} from "@/types/domain";
import { classifyComment, type OverallSentiment, type Sentiment } from "./classify";
import { OTHER_THEME, RULES_VERSION, SUGGESTION_THEME, THEMES } from "./lexicon";
import { computePriority, recommendationFor, round, type Priority } from "./recommendations";
import { anonymizeExcerpt } from "./text";

export type SampleLevel = "none" | "small" | "indicative" | "sufficient";

export interface CriterionStat {
  id: string;
  code: string;
  label: string;
  category: CriterionCategory;
  count: number;
  average: number | null;
  satisfaction: number | null; // % de notes >= 4
  distribution: number[]; // index 0 = 1 étoile
}

export interface ThemeStat {
  key: string;
  label: string;
  positive: number;
  negative: number;
  neutral: number;
  suggestion: number;
  total: number;
  examples: { sentiment: Sentiment; text: string }[];
}

export interface TopicInsight {
  topic: string;
  label: string;
  average: number | null;
  satisfaction: number | null;
  positiveMentions: number;
  negativeMentions: number;
  suggestionMentions: number;
  sources: ("ratings" | "comments")[];
}

export interface RecommendationItem {
  topic: string;
  label: string;
  text: string;
  priority: Priority;
  score: number;
  evidence: string[];
}

export interface EventAnalysisSummary {
  rulesVersion: number;
  responseCount: number;
  generatedAt: string;
  sample: SampleLevel;
  lastSubmissionAt: string | null;
  averages: {
    overall: number | null;
    event: number | null;
    training: number | null;
    pulse: number | null;
    byCode: Record<string, number | null>;
  };
  satisfaction: { overall: number | null; event: number | null; training: number | null };
  criteria: CriterionStat[];
  pulse: { count: number; average: number | null; distribution: number[] };
  recommendation: {
    yes: number;
    no: number;
    maybe: number;
    rate: number | null; // % de « Oui »
  };
  sentiment: {
    commentsAnalyzed: number;
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
    suggestion: number;
  };
  themes: ThemeStat[];
  strengths: TopicInsight[];
  weaknesses: TopicInsight[];
  recommendations: RecommendationItem[];
  timeline: { bucket: string; count: number; averagePulse: number | null }[];
}

export interface AnalysisRow {
  analysis_type: "theme" | "strength" | "weakness" | "recommendation";
  category: string;
  sentiment: Sentiment | "mixed" | null;
  frequency: number;
  score: number | null;
  priority: Priority | null;
  details: Record<string, unknown>;
}

export interface AnalysisInput {
  criteria: CriterionRow[];
  submissions: SubmissionRow[];
  ratings: RatingRow[];
  pulses: PulseRow[];
  now?: Date;
  timeZone?: string;
}

const THEME_LABELS = new Map<string, string>([
  ...THEMES.map((t) => [t.key, t.label] as [string, string]),
  [SUGGESTION_THEME.key, SUGGESTION_THEME.label],
  [OTHER_THEME.key, OTHER_THEME.label],
]);
const THEME_TO_CRITERION = new Map(THEMES.filter((t) => t.criterion).map((t) => [t.key, t.criterion!]));

const avg = (values: number[]) =>
  values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;
const pct = (part: number, total: number) => (total > 0 ? round((part / total) * 100, 1) : null);

export function sampleLevel(n: number): SampleLevel {
  if (n === 0) return "none";
  if (n < SMALL_SAMPLE_THRESHOLD) return "small";
  if (n < INDICATIVE_SAMPLE_THRESHOLD) return "indicative";
  return "sufficient";
}

/**
 * Calcul complet et déterministe de l'analyse d'UN événement.
 * Les entrées doivent déjà être filtrées par event_id : la fonction vérifie la cohérence.
 */
export function computeEventAnalysis(input: AnalysisInput): {
  summary: EventAnalysisSummary;
  rows: AnalysisRow[];
} {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? "Africa/Tunis";
  const criteria = input.criteria.filter((c) => c.is_active);
  const eventIds = new Set([
    ...input.criteria.map((c) => c.event_id),
    ...input.submissions.map((s) => s.event_id),
  ]);
  if (eventIds.size > 1) {
    throw new Error("computeEventAnalysis: les données mélangent plusieurs événements");
  }

  const submissionIds = new Set(input.submissions.map((s) => s.id));
  const ratings = input.ratings.filter((r) => submissionIds.has(r.submission_id));
  const pulses = input.pulses.filter((p) => submissionIds.has(p.submission_id));
  const n = input.submissions.length;

  // ---------------------------------------------------------------- Notes
  const ratingsByCriterion = new Map<string, number[]>();
  for (const r of ratings) {
    const list = ratingsByCriterion.get(r.criterion_id) ?? [];
    list.push(r.rating);
    ratingsByCriterion.set(r.criterion_id, list);
  }
  const criteriaStats: CriterionStat[] = criteria
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => {
      const values = ratingsByCriterion.get(c.id) ?? [];
      const distribution = [0, 0, 0, 0, 0];
      values.forEach((v) => distribution[v - 1]++);
      return {
        id: c.id,
        code: c.code,
        label: c.label,
        category: c.category,
        count: values.length,
        average: avg(values),
        satisfaction: pct(values.filter((v) => v >= 4).length, values.length),
        distribution,
      };
    });

  const valuesFor = (category?: CriterionCategory) =>
    criteria
      .filter((c) => !category || c.category === category)
      .flatMap((c) => ratingsByCriterion.get(c.id) ?? []);
  const all = valuesFor();
  const eventValues = valuesFor("event");
  const trainingValues = valuesFor("training");
  const satisfied = (values: number[]) => pct(values.filter((v) => v >= 4).length, values.length);

  const byCode: Record<string, number | null> = {};
  criteriaStats.forEach((c) => (byCode[c.code] = c.average));
  const criterionByCode = new Map(criteriaStats.map((c) => [c.code, c]));

  // ---------------------------------------------------------------- Pulse
  const pulseDistribution = [0, 0, 0, 0, 0];
  pulses.forEach((p) => pulseDistribution[p.pulse_score - 1]++);

  // ---------------------------------------------------------------- Recommandation
  const rec = { yes: 0, no: 0, maybe: 0 };
  input.submissions.forEach((s) => rec[s.recommendation]++);

  // ---------------------------------------------------------------- Commentaires
  const themeStats = new Map<string, ThemeStat>();
  const sentimentCounts: Record<OverallSentiment, number> = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
    suggestion: 0,
  };
  let commentsAnalyzed = 0;
  // Comptage par participant : un même participant ne compte qu'une fois par thème et sentiment.
  const seen = new Set<string>();

  for (const s of input.submissions) {
    for (const field of COMMENT_FIELDS) {
      const text = s[field as CommentField];
      if (!text || !text.trim()) continue;
      const result = classifyComment(text, field);
      if (result.empty) continue;
      commentsAnalyzed++;
      sentimentCounts[result.overall]++;
      for (const mention of result.mentions) {
        const stat =
          themeStats.get(mention.theme) ??
          ({
            key: mention.theme,
            label: THEME_LABELS.get(mention.theme) ?? mention.theme,
            positive: 0,
            negative: 0,
            neutral: 0,
            suggestion: 0,
            total: 0,
            examples: [],
          } satisfies ThemeStat);
        themeStats.set(mention.theme, stat);
        const key = `${s.id}:${mention.theme}:${mention.sentiment}`;
        if (seen.has(key)) continue;
        seen.add(key);
        stat[mention.sentiment]++;
        stat.total++;
        if (stat.examples.length < 4) {
          stat.examples.push({
            sentiment: mention.sentiment,
            text: anonymizeExcerpt(text, [s.first_name, s.last_name]),
          });
        }
      }
    }
  }
  const themes = [...themeStats.values()].sort((a, b) => b.total - a.total);

  // ---------------------------------------------------------------- Sujets (thèmes + critères)
  const topics = new Map<string, TopicInsight>();
  const topicFor = (key: string) => {
    let t = topics.get(key);
    if (!t) {
      const criterion = criterionByCode.get(key);
      t = {
        topic: key,
        label: criterion?.label ?? THEME_LABELS.get(key) ?? key,
        average: criterion?.average ?? null,
        satisfaction: criterion?.satisfaction ?? null,
        positiveMentions: 0,
        negativeMentions: 0,
        suggestionMentions: 0,
        sources: [],
      };
      topics.set(key, t);
    }
    return t;
  };
  for (const c of criteriaStats) {
    if (c.count > 0) topicFor(c.code).sources.push("ratings");
  }
  for (const theme of themes) {
    if (theme.key === OTHER_THEME.key) continue;
    const mapped = THEME_TO_CRITERION.get(theme.key);
    const key = mapped && criterionByCode.has(mapped) ? mapped : theme.key;
    const t = topicFor(key);
    t.positiveMentions += theme.positive;
    t.negativeMentions += theme.negative;
    t.suggestionMentions += theme.suggestion;
    if (!t.sources.includes("comments")) t.sources.push("comments");
  }
  const topicList = [...topics.values()];

  const strengths = topicList
    .filter(
      (t) =>
        t.topic !== SUGGESTION_THEME.key &&
        ((t.average !== null && t.average >= 4.2) ||
          (t.positiveMentions > 0 && t.positiveMentions > t.negativeMentions)) &&
        !(t.average !== null && t.average < 3.5),
    )
    .sort(
      (a, b) =>
        b.positiveMentions - b.negativeMentions - (a.positiveMentions - a.negativeMentions) ||
        (b.average ?? 0) - (a.average ?? 0),
    )
    .slice(0, 8);

  const weaknesses = topicList
    .filter(
      (t) =>
        (t.average !== null && t.average < 3.5) ||
        (t.negativeMentions > 0 && t.negativeMentions >= t.positiveMentions),
    )
    .sort(
      (a, b) =>
        b.negativeMentions - a.negativeMentions || (a.average ?? 5) - (b.average ?? 5),
    )
    .slice(0, 8);

  // ---------------------------------------------------------------- Recommandations
  const recommendations: RecommendationItem[] = [];
  if (n > 0) {
    for (const t of topicList) {
      const lowRating = t.average !== null && t.average < 3.8;
      if (!lowRating && t.negativeMentions === 0 && t.suggestionMentions === 0) continue;
      const { score, priority } = computePriority({
        negativeShare: t.negativeMentions / n,
        suggestionShare: t.suggestionMentions / n,
        average: t.average,
      });
      const evidence: string[] = [];
      if (t.average !== null) {
        evidence.push(`Note moyenne « ${t.label} » : ${t.average.toFixed(2)}/5 (satisfaction ${t.satisfaction ?? 0} %)`);
      }
      if (t.negativeMentions > 0) {
        evidence.push(`${t.negativeMentions} participant(s) sur ${n} ont signalé un point négatif`);
      }
      if (t.suggestionMentions > 0) {
        evidence.push(`${t.suggestionMentions} suggestion(s) d'amélioration`);
      }
      recommendations.push({
        topic: t.topic,
        label: t.label,
        text: recommendationFor(t.topic, t.label),
        priority,
        score,
        evidence,
      });
    }
    recommendations.sort((a, b) => b.score - a.score);
  }

  // ---------------------------------------------------------------- Chronologie
  const timeline = buildTimeline(input.submissions, pulses, timeZone);

  const lastSubmissionAt = input.submissions.reduce<string | null>(
    (max, s) => (!max || s.submitted_at > max ? s.submitted_at : max),
    null,
  );

  const summary: EventAnalysisSummary = {
    rulesVersion: RULES_VERSION,
    responseCount: n,
    generatedAt: now.toISOString(),
    sample: sampleLevel(n),
    lastSubmissionAt,
    averages: {
      overall: avg(all),
      event: avg(eventValues),
      training: avg(trainingValues),
      pulse: avg(pulses.map((p) => p.pulse_score)),
      byCode,
    },
    satisfaction: {
      overall: satisfied(all),
      event: satisfied(eventValues),
      training: satisfied(trainingValues),
    },
    criteria: criteriaStats,
    pulse: { count: pulses.length, average: avg(pulses.map((p) => p.pulse_score)), distribution: pulseDistribution },
    recommendation: { ...rec, rate: pct(rec.yes, n) },
    sentiment: { commentsAnalyzed, ...sentimentCounts },
    themes,
    strengths,
    weaknesses,
    recommendations,
    timeline,
  };

  const rows: AnalysisRow[] = [
    ...themes.map<AnalysisRow>((t) => ({
      analysis_type: "theme",
      category: t.key,
      sentiment: dominant(t),
      frequency: t.total,
      score: null,
      priority: null,
      details: { label: t.label, positive: t.positive, negative: t.negative, neutral: t.neutral, suggestion: t.suggestion },
    })),
    ...strengths.map<AnalysisRow>((t) => ({
      analysis_type: "strength",
      category: t.topic,
      sentiment: "positive",
      frequency: t.positiveMentions,
      score: t.average,
      priority: null,
      details: { label: t.label, satisfaction: t.satisfaction, sources: t.sources },
    })),
    ...weaknesses.map<AnalysisRow>((t) => ({
      analysis_type: "weakness",
      category: t.topic,
      sentiment: "negative",
      frequency: t.negativeMentions,
      score: t.average,
      priority: null,
      details: { label: t.label, satisfaction: t.satisfaction, sources: t.sources },
    })),
    ...recommendations.map<AnalysisRow>((r) => ({
      analysis_type: "recommendation",
      category: r.topic,
      sentiment: null,
      frequency: 0,
      score: r.score,
      priority: r.priority,
      details: { label: r.label, text: r.text, evidence: r.evidence },
    })),
  ];

  return { summary, rows };
}

function dominant(t: ThemeStat): Sentiment | "mixed" {
  const entries: [Sentiment, number][] = [
    ["positive", t.positive],
    ["negative", t.negative],
    ["suggestion", t.suggestion],
    ["neutral", t.neutral],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  if (t.positive > 0 && t.positive === t.negative && entries[0][1] === t.positive) return "mixed";
  return entries[0][0];
}

function buildTimeline(
  submissions: SubmissionRow[],
  pulses: PulseRow[],
  timeZone: string,
): EventAnalysisSummary["timeline"] {
  if (submissions.length === 0) return [];
  const times = submissions.map((s) => new Date(s.submitted_at).getTime());
  const spanHours = (Math.max(...times) - Math.min(...times)) / 3_600_000;
  const byHour = spanHours <= 48;
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(byHour ? { hour: "2-digit", hourCycle: "h23" as const } : {}),
  });
  const pulseBySubmission = new Map(pulses.map((p) => [p.submission_id, p.pulse_score]));
  const buckets = new Map<string, { sort: number; count: number; pulses: number[] }>();
  for (const s of submissions) {
    const date = new Date(s.submitted_at);
    const label = byHour ? `${fmt.format(date)} h` : fmt.format(date);
    const b = buckets.get(label) ?? { sort: date.getTime(), count: 0, pulses: [] };
    b.sort = Math.min(b.sort, date.getTime());
    b.count++;
    const p = pulseBySubmission.get(s.id);
    if (p) b.pulses.push(p);
    buckets.set(label, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[1].sort - b[1].sort)
    .map(([bucket, b]) => ({ bucket, count: b.count, averagePulse: avg(b.pulses) }));
}
