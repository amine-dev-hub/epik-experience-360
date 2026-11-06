/**
 * Lexique extensible d'EPIK IMPACT AI.
 *
 * Pour ajouter un thème ou un synonyme : modifiez ce fichier puis incrémentez
 * RULES_VERSION. Toutes les analyses existantes seront recalculées automatiquement
 * à la prochaine consultation du tableau de bord (aucune action manuelle).
 *
 * Syntaxe des motifs : mots séparés par des espaces, « * » = préfixe.
 * Les accents et la casse sont ignorés (« Accueil », « accueil », « acceuil » si listé).
 */
export const RULES_VERSION = 1;

export interface ThemeDefinition {
  key: string;
  label: string;
  patterns: string[];
  /** Critère de notation correspondant : permet de croiser commentaires et notes. */
  criterion?: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    key: "organisation",
    label: "Organisation",
    criterion: "organisation",
    patterns: ["organis*", "orga", "desorganis*", "preparation", "prepare*", "deroulement", "coordination", "staff", "equipe organisatrice", "bien gere", "mal gere", "gestion de l evenement"],
  },
  {
    key: "accueil",
    label: "Accueil",
    criterion: "accueil",
    patterns: ["accueil*", "acceuil*", "orientation", "orienter", "oriente*", "signaleti*", "fleche*", "hotesse*", "badge*", "reception", "a l entree", "placement"],
  },
  {
    key: "communication",
    label: "Communication",
    criterion: "communication",
    patterns: ["communic*", "annonce*", "rappel*", "e mail*", "mail*", "message*", "reseaux sociaux", "instagram", "facebook", "linkedin", "affiche*", "publicite*", "promotion", "informe*", "prevenu*", "pas ete informe*"],
  },
  {
    key: "gestion_temps",
    label: "Gestion du temps",
    criterion: "gestion_temps",
    patterns: ["gestion du temps", "temps", "horaire*", "timing", "planning", "programme", "rythme", "chrono*", "depass*", "minute*", "heure*", "pause*", "trop long*", "trop court*", "duree", "dure trop", "a dure", "s eternis*", "interminable*"],
  },
  {
    key: "retard",
    label: "Retard / ponctualité",
    criterion: "gestion_temps",
    patterns: ["retard*", "ponctu*", "a l heure", "commence tard", "commence en retard", "attente", "attendu longtemps", "fait attendre", "tardi*"],
  },
  {
    key: "salle",
    label: "Salle",
    criterion: "lieu",
    patterns: ["salle*", "lieu*", "local", "locaux", "endroit", "espace", "emplacement", "cadre", "venue", "preface"],
  },
  {
    key: "confort",
    label: "Confort",
    criterion: "lieu",
    patterns: ["confort*", "inconfort*", "chaise*", "siege*", "assis*", "debout", "clim*", "chaud", "chaude", "chaleur", "froid*", "temperature", "aeration", "etouff*", "places assises", "manque de place*", "serre*"],
  },
  {
    key: "intervenant",
    label: "Intervenant",
    criterion: "intervenant",
    patterns: ["intervenant*", "speaker*", "conferencier*", "orateur*", "formateur*", "invite*", "presentateur*", "adnen", "mrad", "monsieur", "mr", "ceo", "son parcours", "son experience", "il explique*", "il a explique*", "sa presentation"],
  },
  {
    key: "contenu",
    label: "Contenu",
    criterion: "contenu",
    patterns: ["contenu*", "sujet*", "thematique*", "theme*", "conseil*", "exemple*", "idee*", "notion*", "concept*", "astuce*", "slide*", "diapo*", "support*", "personal branding", "branding", "marque personnelle", "entrepreneur*", "information*", "temoignage*", "cas pratique*", "cas concret*", "strategi*"],
  },
  {
    key: "formation",
    label: "Formation",
    patterns: ["formation*", "atelier*", "workshop*", "seance*", "session*", "cours", "conference*", "apprentissage", "apprendre", "appris", "explication*", "expliqu*", "pedagog*", "trainning", "training"],
  },
  {
    key: "interaction",
    label: "Interaction",
    criterion: "interaction",
    patterns: ["interact*", "interagir", "question*", "echange*", "debat*", "discussion*", "dialogue*", "participer", "participation", "participatif*", "q a", "qa", "parole au public", "impliqu*"],
  },
  {
    key: "animation",
    label: "Animation",
    patterns: ["animation*", "anime*", "animateur*", "animatrice*", "jeu*", "activite*", "quiz*", "ludique*", "divertiss*", "mise en situation", "challenge*"],
  },
  {
    key: "ambiance",
    label: "Ambiance",
    criterion: "ambiance",
    patterns: ["ambiance*", "atmosphere*", "energie", "convivial*", "esprit", "networking", "reseautage", "rencontre*", "vibe*", "bonne humeur", "chaleureu*"],
  },
  {
    key: "logistique",
    label: "Logistique",
    patterns: ["logisti*", "materiel*", "equipement*", "projecteur*", "videoprojecteur*", "ecran*", "wifi", "wi fi", "internet", "cafe*", "collation*", "buffet*", "nourriture", "repas", "eau", "boisson*", "parking", "pause cafe", "goodies", "certificat*", "attestation*"],
  },
  {
    key: "inscription",
    label: "Inscription",
    patterns: ["inscri*", "formulaire*", "enregistrement*", "billet*", "ticket*", "liste d attente", "reservation*", "places limitees"],
  },
  {
    key: "sonorisation",
    label: "Sonorisation",
    patterns: ["sono*", "le son", "du son", "son etait", "qualite du son", "probleme de son", "micro*", "audio", "acoustique*", "entendre", "entend*", "bruit*", "bruyant*", "haut parleur*", "enceinte*", "volume", "audible*", "inaudible*", "echo"],
  },
  {
    key: "global",
    label: "Expérience globale",
    patterns: ["tout", "evenement*", "event*", "experience*", "journee*", "globalement", "en general", "dans l ensemble", "initiative*", "club", "epik*"],
  },
];

/** Thème attribué aux suggestions dont le sujet n'est pas identifié. */
export const SUGGESTION_THEME = { key: "suggestions_diverses", label: "Suggestions diverses" };
/** Commentaires que le moteur ne sait pas interpréter. */
export const OTHER_THEME = { key: "autres", label: "Autres commentaires" };

/** Expressions positives (poids +1, expressions fortes +2). */
export const POSITIVE: [string, number][] = [
  ["excellent*", 2], ["exceptionnel*", 2], ["parfait*", 2], ["genial*", 2], ["magnifique*", 2],
  ["formidable*", 2], ["incroyable*", 2], ["impeccable*", 2], ["extraordinaire*", 2], ["top", 2],
  ["au top", 2], ["super*", 2], ["bravo", 2], ["felicit*", 2], ["adore*", 2], ["j ai adore", 2],
  ["tres bien", 2], ["tres bon*", 2], ["vraiment bien", 2], ["rien a redire", 2],
  ["bien", 1], ["bon", 1], ["bonne", 1], ["bons", 1], ["bonnes", 1], ["interessant*", 1],
  ["enrichiss*", 1], ["instructif*", 1], ["inspir*", 1], ["motiv*", 1], ["utile*", 1], ["clair*", 1],
  ["agreable*", 1], ["apprecie*", 1], ["aime", 1], ["aimer", 1], ["satisf*", 1], ["reussi*", 1],
  ["merci", 1], ["chaleureu*", 1], ["convivial*", 1], ["dynamique*", 1], ["professionnel*", 1],
  ["qualite", 1], ["riche*", 1], ["pertinent*", 1], ["captiv*", 1], ["passionn*", 1],
  ["ponctuel*", 1], ["fluide*", 1], ["efficace*", 1], ["accueillant*", 1], ["sympa*", 1],
  ["cool", 1], ["extra", 1], ["benefique*", 1], ["concret*", 1], ["bien organise*", 2],
  ["a l heure", 1], ["respect des horaires", 1], ["fort", 1], ["forts", 1], ["reussite", 1],
  ["valeur ajoutee", 1], ["ravi*", 1], ["content*", 1], ["bluff*", 1], ["pas mal", 1],
  ["a la hauteur", 1], ["de qualite", 1], ["bien gere*", 1], ["bien explique*", 2],
];

/** Expressions négatives. */
export const NEGATIVE: [string, number][] = [
  ["nul*", 2], ["horrible*", 2], ["catastroph*", 2], ["chaotique*", 2], ["desastre*", 2],
  ["tres mauvais*", 2], ["decevant*", 2], ["decu*", 2], ["deception", 2], ["inadmissible*", 2],
  ["mauvais*", 1], ["ennuy*", 1], ["lent*", 1], ["lourd*", 1], ["retard*", 1], ["desorganis*", 1],
  ["bruit*", 1], ["bruyant*", 1], ["inconfort*", 1], ["probleme*", 1], ["manque*", 1],
  ["insuffisant*", 1], ["faible*", 1], ["difficile*", 1], ["confus*", 1], ["flou*", 1],
  ["mal", 1], ["pire", 1], ["inutile*", 1], ["superficiel*", 1], ["repetitif*", 1],
  ["monoton*", 1], ["interminable*", 1], ["inaudible*", 1], ["etouff*", 1], ["tard", 1],
  ["peu de", 1], ["pas assez", 1], ["dommage", 1], ["regret*", 1], ["moyen", 1], ["moyenne", 1],
  ["bof", 1], ["long", 1], ["longue", 1], ["longs", 1], ["s eternis*", 1], ["mal gere*", 2],
  ["mal organise*", 2], ["desagreable*", 1], ["froid", 1], ["froide", 1], ["chaleur", 1],
  ["perte de temps", 2], ["n importe quoi", 2], ["pas clair*", 1], ["pas a la hauteur", 2],
];

/**
 * Expressions neutres prioritaires : elles « consomment » leurs mots pour éviter
 * les faux positifs (« tout au long de », « bien que », « pas mal de questions »).
 */
export const NEUTRAL_PHRASES: string[] = [
  "tout au long", "au long", "pas mal de", "bien sur", "bien que", "si bien", "eh bien",
  "ou bien", "bien entendu", "moyen de", "au moyen", "en moyenne", "le moyen", "les moyens",
  "plus ou moins",
];

/** Marqueurs de suggestion (le participant propose une amélioration). */
export const SUGGESTION_MARKERS: string[] = [
  "il faudrait", "faudrait", "il faut", "faut", "devrait", "devriez", "devraient", "pourriez",
  "pourrait", "pourraient", "serait bien", "serait mieux", "serait top", "serait super",
  "ce serait", "ca serait", "je suggere", "suggere*", "suggestion*", "je propose", "propose*",
  "proposition*", "ameliorer", "amelior*", "plus de", "davantage", "prevoir", "ajouter",
  "rajouter", "plus d", "davantage d", "j aimerais", "aimerais", "souhait*", "prochaine fois", "a l avenir", "augmenter",
  "reduire", "allonger", "raccourcir", "privilegier", "pensez a", "penser a", "mieux vaut",
  "a refaire", "refaire", "recommencer", "inviter", "organiser plus", "encore plus",
];

/** Mots qui inversent la polarité du mot qui suit (fenêtre de 3 mots). */
export const NEGATORS = ["pas", "jamais", "aucun", "aucune", "sans", "ni", "guere", "point"];

/** Intensifieurs : « trop » + mot neutre = négatif (« trop long », « trop chaud »). */
export const EXCESS_WORDS = ["trop"];

/**
 * Réponses « vides » courantes (« rien », « RAS », « aucun ») : ignorées par l'analyse
 * thématique, notamment dans le champ des points faibles.
 */
export const EMPTY_ANSWER =
  /^(?:rien|aucun|aucune|ras|r a s|non|nothing|none|no|nope|neant|pas de|pas vraiment|n a|na|x|ok|merci|rien de special|rien a signaler|rien a dire|rien a ajouter|pas de remarque|pas de remarques|aucune remarque|aucune idee|je ne sais pas|jsp|rien du tout|aucun point faible|pas de point faible|pas de points faibles)(?: [a-z ]{0,30})?$/;
