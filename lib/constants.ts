import type { CommentField, CriterionCategory, EventStatus, Recommendation } from "@/types/domain";

export const APP_NAME = "EPIK EXPERIENCE 360";
export const ORG_NAME = "EPIK LEADERS – IHEC Sousse";
export const SLOGAN = "Your voice. Our evolution.";
export const SLOGAN_SECONDARY = "Your experience matters.";

export const DEFAULT_CRITERIA: {
  category: CriterionCategory;
  code: string;
  label: string;
  description: string;
}[] = [
  { category: "event", code: "organisation", label: "Organisation générale", description: "La préparation et le déroulement global de l'événement." },
  { category: "event", code: "accueil", label: "Accueil et orientation", description: "L'accueil à l'arrivée et la facilité à trouver votre place." },
  { category: "event", code: "gestion_temps", label: "Gestion du temps", description: "Le respect des horaires et le rythme du programme." },
  { category: "event", code: "lieu", label: "Qualité du lieu", description: "Le confort, l'équipement et l'accessibilité de la salle." },
  { category: "event", code: "communication", label: "Communication", description: "Les informations reçues avant et pendant l'événement." },
  { category: "event", code: "ambiance", label: "Ambiance générale", description: "L'atmosphère et l'énergie ressenties pendant l'événement." },
  { category: "training", code: "intervenant", label: "Qualité de l'intervenant", description: "L'expertise et la capacité de l'intervenant à captiver." },
  { category: "training", code: "clarte", label: "Clarté des explications", description: "La facilité à comprendre les idées présentées." },
  { category: "training", code: "contenu", label: "Qualité du contenu", description: "La pertinence et la richesse du contenu présenté." },
  { category: "training", code: "utilite", label: "Utilité des informations", description: "L'intérêt concret des informations pour vous." },
  { category: "training", code: "interaction", label: "Interaction avec les participants", description: "Les échanges, questions et moments de participation." },
  { category: "training", code: "duree", label: "Durée de la formation", description: "L'adéquation de la durée au contenu proposé." },
];

export const PULSE_LEVELS = [
  { score: 1, emoji: "😞", label: "Très mauvaise" },
  { score: 2, emoji: "😕", label: "Mauvaise" },
  { score: 3, emoji: "😐", label: "Moyenne" },
  { score: 4, emoji: "😊", label: "Bonne" },
  { score: 5, emoji: "🤩", label: "Excellente" },
] as const;

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  yes: "Oui",
  no: "Non",
  maybe: "Peut-être",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const COMMENT_QUESTIONS: Record<CommentField, string> = {
  strengths_comment: "Quels sont les points forts de cet événement ?",
  weaknesses_comment: "Quels sont les points faibles de cet événement ?",
  improvements_comment: "Que pouvons-nous améliorer lors de nos prochains événements ?",
  training_liked_comment: "Qu'avez-vous particulièrement apprécié dans la formation ?",
  additional_comment: "Avez-vous d'autres remarques ou suggestions ?",
};

export const COMMENT_MAX_LENGTH = 1500;

/** En dessous de ce nombre de réponses, les résultats sont signalés comme peu représentatifs. */
export const SMALL_SAMPLE_THRESHOLD = 10;
export const INDICATIVE_SAMPLE_THRESHOLD = 30;
