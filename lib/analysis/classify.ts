import type { CommentField } from "@/types/domain";
import {
  EMPTY_ANSWER,
  EXCESS_WORDS,
  NEGATIVE,
  NEGATORS,
  NEUTRAL_PHRASES,
  OTHER_THEME,
  POSITIVE,
  SUGGESTION_MARKERS,
  SUGGESTION_THEME,
  THEMES,
} from "./lexicon";
import {
  compilePattern,
  findPattern,
  normalizeText,
  splitClauses,
  tokenize,
  type CompiledPattern,
} from "./text";

export type Sentiment = "positive" | "negative" | "neutral" | "suggestion";
export type OverallSentiment = Sentiment | "mixed";

/** Sentiment présumé quand une proposition cite un thème sans exprimer d'avis clair. */
const FIELD_DEFAULT: Record<CommentField, Sentiment> = {
  strengths_comment: "positive",
  weaknesses_comment: "negative",
  improvements_comment: "suggestion",
  training_liked_comment: "positive",
  additional_comment: "neutral",
};

/** Thème présumé quand le champ lui-même indique le sujet. */
const FIELD_THEME: Partial<Record<CommentField, string>> = {
  training_liked_comment: "formation",
};

interface WeightedPattern {
  pattern: CompiledPattern;
  weight: number; // signé : > 0 positif, < 0 négatif
}

const SENTIMENT_PATTERNS: WeightedPattern[] = [
  ...POSITIVE.map(([p, w]) => ({ pattern: compilePattern(p), weight: w })),
  ...NEGATIVE.map(([p, w]) => ({ pattern: compilePattern(p), weight: -w })),
].sort((a, b) => b.pattern.parts.length - a.pattern.parts.length);

const NEUTRAL_PATTERNS = NEUTRAL_PHRASES.map(compilePattern).sort(
  (a, b) => b.parts.length - a.parts.length,
);
const SUGGESTION_PATTERNS = SUGGESTION_MARKERS.map(compilePattern);
const THEME_PATTERNS = THEMES.map((t) => ({ key: t.key, patterns: t.patterns.map(compilePattern) }));

function isNegated(tokens: string[], start: number): boolean {
  for (let k = start - 1; k >= Math.max(0, start - 3); k--) {
    const word = tokens[k];
    if (NEGATORS.includes(word)) return true;
    if (word === "plus") {
      // « ne ... plus » uniquement (sinon « plus » est un marqueur de quantité)
      for (let m = k - 1; m >= Math.max(0, k - 3); m--) {
        if (tokens[m] === "ne" || tokens[m] === "n") return true;
      }
    }
  }
  return false;
}

export interface ClauseSentiment {
  score: number;
  suggestion: boolean;
  matched: boolean;
}

/** Calcule la polarité d'une proposition (gère négations, « trop », expressions composées). */
export function scoreClause(tokens: string[]): ClauseSentiment {
  const consumed = new Array<boolean>(tokens.length).fill(false);
  const free = (start: number, length: number) => {
    for (let i = start; i < start + length; i++) if (consumed[i]) return false;
    return true;
  };
  const consume = (start: number, length: number) => {
    for (let i = start; i < start + length; i++) consumed[i] = true;
  };

  for (const pattern of NEUTRAL_PATTERNS) {
    for (const start of findPattern(tokens, pattern)) {
      if (free(start, pattern.parts.length)) consume(start, pattern.parts.length);
    }
  }

  let score = 0;
  let matched = false;
  for (const { pattern, weight } of SENTIMENT_PATTERNS) {
    const length = pattern.parts.length;
    for (const start of findPattern(tokens, pattern)) {
      if (!free(start, length)) continue;
      consume(start, length);
      matched = true;
      // Une négation inverse et atténue (« pas mauvais » = plutôt positif).
      score += isNegated(tokens, start) ? -Math.sign(weight) : weight;
    }
  }

  // « trop » + mot non évalué = excès, donc négatif (« trop long », « trop chaud »).
  tokens.forEach((word, i) => {
    if (!EXCESS_WORDS.includes(word) || consumed[i]) return;
    const next = i + 1;
    if (next < tokens.length && !consumed[next]) {
      consume(i, 2);
      matched = true;
      score += isNegated(tokens, i) ? 1 : -1;
    }
  });

  const suggestion = SUGGESTION_PATTERNS.some((p) => findPattern(tokens, p).length > 0);
  return { score, suggestion, matched: matched || suggestion };
}

function sentimentOf(result: ClauseSentiment): Sentiment | null {
  if (result.suggestion) return "suggestion";
  if (result.score > 0) return "positive";
  if (result.score < 0) return "negative";
  return result.matched ? "neutral" : null;
}

export function detectThemes(tokens: string[]): string[] {
  const found = THEME_PATTERNS.filter((t) =>
    t.patterns.some((p) => findPattern(tokens, p).length > 0),
  ).map((t) => t.key);
  // « Expérience globale » seulement si aucun thème plus précis n'est cité.
  return found.length > 1 ? found.filter((k) => k !== "global") : found;
}

export interface ThemeMention {
  theme: string;
  sentiment: Sentiment;
}

export interface CommentClassification {
  field: CommentField;
  empty: boolean;
  overall: OverallSentiment;
  mentions: ThemeMention[];
  understood: boolean;
}

/** Classe un commentaire libre en thèmes et sentiments. */
export function classifyComment(text: string, field: CommentField): CommentClassification {
  const normalized = normalizeText(text ?? "");
  const bare = tokenize(normalized.replace(/\b([a-z])\.(?=[a-z]\b)/g, "$1")).join(" ");
  if (!bare || EMPTY_ANSWER.test(bare)) {
    return { field, empty: true, overall: "neutral", mentions: [], understood: true };
  }

  const clauses = splitClauses(normalized).map((clause) => ({
    segment: clause.segment,
    themes: detectThemes(clause.tokens),
    sentiment: sentimentOf(scoreClause(clause.tokens)),
  }));

  // Héritage au sein d'un segment : thème sans avis + avis sans thème.
  for (let i = 0; i < clauses.length; i++) {
    const current = clauses[i];
    if (current.themes.length > 0) continue;
    if (current.sentiment === null) continue;
    const prev = clauses[i - 1];
    if (prev && prev.segment === current.segment && prev.themes.length > 0) {
      current.themes = [...prev.themes];
      if (prev.sentiment === null || prev.sentiment === "neutral") prev.sentiment = current.sentiment;
    }
  }

  const mentions = new Map<string, ThemeMention>();
  const sentiments = new Set<Sentiment>();
  const fieldTheme = FIELD_THEME[field];
  let understood = false;

  for (const clause of clauses) {
    let themes = clause.themes;
    const sentiment = clause.sentiment ?? (themes.length > 0 ? FIELD_DEFAULT[field] : null);
    if (themes.length === 0) {
      if (sentiment === null) continue;
      if (sentiment === "suggestion") themes = [SUGGESTION_THEME.key];
      else if (fieldTheme) themes = [fieldTheme];
      else continue; // avis sans sujet identifiable : traité plus bas
    }
    understood = true;
    sentiments.add(sentiment ?? "neutral");
    for (const theme of themes) {
      const key = `${theme}:${sentiment}`;
      if (!mentions.has(key)) mentions.set(key, { theme, sentiment: sentiment ?? "neutral" });
    }
  }

  // Aucun thème compris : « Autres commentaires », sans inventer d'interprétation.
  if (!understood) {
    const clauseSentiments = clauses.map((c) => c.sentiment).filter((s): s is Sentiment => s !== null);
    const overall = combine(new Set(clauseSentiments));
    return {
      field,
      empty: false,
      overall,
      mentions: [{ theme: OTHER_THEME.key, sentiment: overall === "mixed" ? "neutral" : overall }],
      understood: false,
    };
  }

  return { field, empty: false, overall: combine(sentiments), mentions: [...mentions.values()], understood };
}

function combine(sentiments: Set<Sentiment>): OverallSentiment {
  if (sentiments.has("positive") && sentiments.has("negative")) return "mixed";
  if (sentiments.has("negative")) return "negative";
  if (sentiments.has("positive")) return "positive";
  if (sentiments.has("suggestion")) return "suggestion";
  return "neutral";
}
