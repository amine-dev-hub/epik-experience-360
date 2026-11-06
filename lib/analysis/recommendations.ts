/**
 * Bibliothèque de recommandations par sujet (thème de commentaire ou critère noté).
 * Une recommandation n'est produite que si des données réelles la justifient
 * (commentaires négatifs, suggestions ou note moyenne faible).
 */
export const RECOMMENDATION_LIBRARY: Record<string, string> = {
  organisation:
    "Formaliser un rétroplanning et désigner un responsable par pôle (accueil, logistique, timing) le jour de l'événement.",
  accueil:
    "Renforcer l'équipe d'accueil et améliorer la signalétique : fléchage, plan de salle et badges.",
  gestion_temps:
    "Optimiser la gestion des horaires : démarrer à l'heure annoncée, prévoir une marge et désigner un maître du temps.",
  duree:
    "Ajuster la durée de la formation au contenu et prévoir des pauses régulières.",
  lieu:
    "Vérifier en amont la capacité, l'équipement et le confort de la salle (sièges, température, aération).",
  communication:
    "Renforcer la communication avant l'événement : programme détaillé, rappels et informations pratiques.",
  ambiance:
    "Prévoir des moments de networking et d'animation pour dynamiser l'ambiance.",
  intervenant:
    "Partager les retours avec l'intervenant et préparer ensemble le déroulé et le format de son intervention.",
  clarte:
    "Demander des supports plus structurés et davantage d'exemples concrets pour clarifier les explications.",
  contenu:
    "Ajuster le contenu aux attentes : cas pratiques, exemples concrets et supports partagés après l'événement.",
  utilite:
    "Renforcer l'utilité pratique : outils, ressources et actions concrètes à appliquer après l'événement.",
  formation:
    "Revoir le format de la formation (ateliers, cas pratiques, mises en situation) pour la rendre plus concrète.",
  interaction:
    "Prévoir davantage d'interactions avec l'intervenant : temps dédié aux questions, sondages et échanges.",
  animation:
    "Intégrer des activités d'animation : quiz, jeux ou mises en situation.",
  logistique:
    "Améliorer la logistique : matériel testé à l'avance, pauses et collations organisées.",
  inscription:
    "Simplifier le processus d'inscription et confirmer les places aux participants.",
  sonorisation:
    "Tester la sonorisation avant le début et prévoir un micro pour les questions du public.",
  global:
    "Organiser un débriefing d'équipe dédié aux retours négatifs sur l'expérience globale.",
  suggestions_diverses:
    "Étudier les suggestions des participants lors du prochain débriefing d'équipe.",
};

export function recommendationFor(topic: string, label: string): string {
  return (
    RECOMMENDATION_LIBRARY[topic] ??
    `Analyser les retours sur « ${label} » et définir une action corrective pour le prochain événement.`
  );
}

export type Priority = "low" | "medium" | "high" | "critical";

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  critical: "Critique",
};

/**
 * Priorité = combinaison de la gravité (note moyenne du critère lié)
 * et de la fréquence (part des répondants ayant signalé le problème).
 */
export function computePriority(input: {
  negativeShare: number; // 0..1
  suggestionShare: number; // 0..1
  average: number | null; // moyenne /5 du critère lié
}): { score: number; priority: Priority } {
  const deficit = input.average === null ? 0 : clamp((4 - input.average) / 2, 0, 1);
  const frequency = clamp(input.negativeShare * 2.5, 0, 1);
  const breadth = clamp((input.negativeShare + input.suggestionShare * 0.5) * 2, 0, 1);
  const score = Math.max(deficit, frequency) * 0.7 + breadth * 0.3;
  const priority: Priority =
    score >= 0.65 ? "critical" : score >= 0.45 ? "high" : score >= 0.25 ? "medium" : "low";
  return { score: round(score, 3), priority };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
