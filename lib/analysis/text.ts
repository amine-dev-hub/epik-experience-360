/**
 * Outils de normalisation du texte français pour EPIK IMPACT AI.
 * Moteur déterministe : aucune dépendance externe, aucun modèle d'IA.
 */

/** Minuscules, suppression des accents, apostrophes et ponctuation non structurante. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’'`´‘]/g, " ")
    .replace(/[-_/]/g, " ")
    // Ponctuation de fin de proposition conservée comme séparateur.
    .replace(/[^a-z0-9\s.!?;,:\n]/g, " ")
    // Répétitions de lettres (« suuuper » -> « suuper »), utile pour les variations d'écriture.
    .replace(/([a-z])\1{2,}/g, "$1$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function tokenize(normalized: string): string[] {
  return normalized
    .replace(/[.!?;,:\n]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const CLAUSE_CONNECTORS =
  /\b(?:mais|cependant|par contre|sauf que|sauf|neanmoins|toutefois|en revanche|pourtant|malheureusement)\b/g;

/**
 * Découpe un commentaire en propositions. Chaque proposition est analysée séparément,
 * ce qui permet « bonne organisation mais retard » -> deux avis distincts.
 * `segment` identifie un groupe de fragments séparés seulement par des virgules :
 * à l'intérieur d'un segment, un fragment peut hériter du thème de son voisin
 * (« l'intervenant, clair et inspirant »). Les connecteurs (« mais ») ouvrent un nouveau segment.
 */
export interface Clause {
  tokens: string[];
  segment: number;
}

export function splitClauses(normalized: string): Clause[] {
  const result: Clause[] = [];
  let segment = 0;
  for (const sentence of normalized.split(/[.!?;\n]+/)) {
    for (const part of sentence.replace(CLAUSE_CONNECTORS, " | ").split("|")) {
      let added = false;
      for (const fragment of part.split(/[,:]+/)) {
        const tokens = tokenize(fragment);
        if (tokens.length > 0) {
          result.push({ tokens, segment });
          added = true;
        }
      }
      if (added) segment++;
    }
  }
  return result;
}

/**
 * Un motif est une suite de mots séparés par des espaces.
 * Un mot terminé par « * » correspond à tout mot qui commence par ce préfixe.
 */
export interface CompiledPattern {
  source: string;
  parts: { value: string; prefix: boolean }[];
}

export function compilePattern(pattern: string): CompiledPattern {
  const parts: { value: string; prefix: boolean }[] = [];
  for (const raw of pattern.trim().split(/\s+/)) {
    const prefix = raw.endsWith("*");
    // Une apostrophe peut produire plusieurs mots (« l'heure » -> « l heure »).
    const words = tokenize(normalizeText(prefix ? raw.slice(0, -1) : raw));
    words.forEach((value, index) => {
      parts.push({ value, prefix: prefix && index === words.length - 1 });
    });
  }
  return { source: pattern, parts };
}

function wordMatches(token: string, part: { value: string; prefix: boolean }): boolean {
  return part.prefix ? token.startsWith(part.value) : token === part.value;
}

/** Positions de début des occurrences d'un motif dans une liste de mots. */
export function findPattern(tokens: string[], pattern: CompiledPattern): number[] {
  const hits: number[] = [];
  const n = pattern.parts.length;
  if (n === 0) return hits;
  for (let i = 0; i + n <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < n; j++) {
      if (!wordMatches(tokens[i + j], pattern.parts[j])) {
        ok = false;
        break;
      }
    }
    if (ok) hits.push(i);
  }
  return hits;
}

/** Masque les données personnelles évidentes avant d'afficher un extrait. */
export function anonymizeExcerpt(text: string, names: string[] = [], maxLength = 220): string {
  let out = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
    .replace(/\+?\d[\d\s.-]{6,}\d/g, "[numéro]");
  for (const name of names) {
    const clean = name.trim();
    if (clean.length < 2) continue;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[…]");
  }
  out = out.replace(/\s+/g, " ").trim();
  return out.length > maxLength ? `${out.slice(0, maxLength - 1).trimEnd()}…` : out;
}
