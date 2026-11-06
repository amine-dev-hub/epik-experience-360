# EPIK EXPERIENCE 360

**EPIK LEADERS – IHEC Sousse** · *Your voice. Our evolution.*

Plateforme permanente de feedback et d'analyse des événements du club : chaque événement a son
formulaire, son QR code, ses statistiques et son analyse automatique (EPIK IMPACT AI), sans aucun
service payant.

## Fonctionnalités

- **Multi-événements** : création, modification, publication, ouverture/fermeture du formulaire,
  archivage, duplication, suppression confirmée. Aucune modification de code nécessaire.
- **Parcours participant** (`/event/[slug]`), mobile d'abord, sans compte : accueil → informations →
  évaluation de l'événement → évaluation de la formation → **EPIK LIVE PULSE** → commentaires →
  recommandation → récapitulatif modifiable → confirmation.
- **EPIK IMPACT AI** : moteur d'analyse **déterministe à base de règles** (pas une IA générative,
  aucune API) exécuté côté serveur après chaque soumission : moyennes, satisfaction, répartitions,
  thèmes, tonalité, points forts, points faibles, recommandations priorisées.
- **Tableau de bord admin** (`/admin`) : vue globale, événements, analytics par événement,
  participants (recherche, filtres, pagination, détail), comparaison entre événements.
- **QR codes** générés localement (PNG, SVG, affiche A4 imprimable).
- **Exports** CSV, Excel (XLSX) et rapport PDF, toujours filtrés par événement.

## Architecture

| Couche | Technologie |
|---|---|
| Front + serveur | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Base de données / Auth | Supabase (PostgreSQL + Auth), plan Free |
| Validation | Zod |
| Graphiques | Recharts |
| QR codes | `qrcode` |
| Exports | `exceljs` (XLSX), `jspdf` + `jspdf-autotable` (PDF), CSV natif |
| Tests | Vitest + script de bout en bout |
| Hébergement | Vercel (plan Hobby) + GitHub |

```
app/                 pages et routes API (public, /admin, /api)
components/          composants (brand, feedback, admin)
lib/analysis/        EPIK IMPACT AI (normalisation, lexique, classification, moteur)
lib/export/          CSV, XLSX, PDF
lib/supabase/        clients (session, public, service)
supabase/migrations/ schéma SQL versionné (tables, RLS, fonctions, seed)
scripts/             vérification env, création admin, test de bout en bout
tests/               tests unitaires
docs/                sécurité, déploiement
```

## Prérequis

- Node.js 20.9+ (testé avec Node 26) et npm
- Git
- Un compte GitHub, un compte Vercel, un projet Supabase (plan Free)

## Installation locale

```bash
npm install
cp .env.example .env.local   # puis renseignez les valeurs (voir ci-dessous)
npm run check:env            # vérifie les clés sans les afficher
npm run dev                  # http://localhost:3000
```

## Configuration Supabase

1. Créez un projet (région Europe conseillée).
2. **SQL Editor** → New query → collez le contenu de
   `supabase/migrations/20261106000000_init.sql` → **Run**. Cela crée les tables, les index, les
   contraintes, les politiques RLS, les fonctions serveur et le premier événement.
3. **Authentication → Sign In / Providers** : désactivez *Allow new users to sign up*.
4. Copiez l'URL et les clés dans `.env.local` (voir `.env.example`).

## Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | clé publique (protégée par RLS) |
| `SUPABASE_SECRET_KEY` | **serveur uniquement** | enregistrement des feedbacks, calcul des analyses |
| `NEXT_PUBLIC_SITE_URL` | public | URL encodée dans les QR codes |
| `IP_HASH_SALT` | serveur | anonymisation des IP (anti-abus) |

## Premier administrateur

Il n'existe aucune inscription publique.

1. Supabase → **Authentication → Users → Add user → Create new user** : e-mail + mot de passe
   solide, cochez *Auto Confirm User*.
2. Dans le terminal du projet :
   ```bash
   npm run admin:grant -- votre.email@exemple.com
   ```
3. Connectez-vous sur `/admin/login`.

Le mot de passe n'est jamais écrit dans le code ni dans un fichier du dépôt.

## Tests

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # tests unitaires (analyse, moyennes, priorités, isolation)
npm run build       # build de production
node --env-file=.env.local scripts/smoke-test.mjs http://localhost:3000
```

Le test de bout en bout crée un **événement de test temporaire**, envoie des feedbacks, vérifie
la validation, les doublons, l'anti-robot, l'analyse automatique, les politiques RLS et
l'isolation, puis supprime cet événement. Les données réelles ne sont pas touchées.

## Déploiement

Voir [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

## Gestion des événements

`/admin/events` → **Nouvel événement** : informations, lien public (slug), statut, critères
d'évaluation (modifiables, réordonnables). Le QR code et les exports sont sur la page de
l'événement.

- **Publié + formulaire ouvert** : le public peut répondre.
- **Publié + formulaire fermé** : la page indique que le formulaire est fermé.
- **Brouillon / Archivé** : la page publique renvoie une 404 ; les données restent consultables.

## Fonctionnement d'EPIK IMPACT AI

1. Après chaque soumission, la route `/api/events/[slug]/feedback` enregistre la réponse dans une
   **transaction** (`submit_feedback`), puis relance l'analyse de **cet événement uniquement**.
2. Le moteur (`lib/analysis/`) normalise le texte (casse, accents, apostrophes, répétitions),
   découpe les propositions (« mais », « par contre »…), détecte les thèmes (lexique de synonymes
   et d'expressions), calcule la tonalité (négations « pas / jamais / sans / ne…plus »,
   « trop + adjectif », expressions neutres), et classe en « Autres commentaires » ce qu'il ne
   comprend pas.
3. Notes et commentaires sont croisés pour produire points forts, points faibles et
   recommandations. La priorité (faible → critique) dépend de la note moyenne et de la part de
   participants qui signalent le problème. Chaque recommandation affiche sa justification.
4. Le résultat est enregistré atomiquement (`store_event_analysis`). Un calcul plus ancien ne peut
   pas écraser un calcul plus récent (verrou + compteur).
5. **Auto-réparation** : à chaque consultation, si l'analyse est absente, en retard sur le nombre de
   réponses ou produite par une ancienne version des règles (`RULES_VERSION`), elle est recalculée.
   Pour faire évoluer les règles, modifiez `lib/analysis/lexicon.ts` puis incrémentez `RULES_VERSION`.

Les petits échantillons (< 10 et < 30 réponses) sont signalés partout.

## Maintenance

- **Pause Supabase Free** : un projet inactif pendant environ 7 jours peut être mis en pause.
  Réactivez-le depuis le tableau de bord Supabase (bouton *Restore*), idéalement quelques jours
  avant chaque événement.
- **Conservation des données** : durée configurable par événement. La fonction SQL
  `purge_expired_submissions()` supprime les réponses expirées. Exécutez
  `select public.purge_expired_submissions();` dans le SQL Editor (par exemple une fois par mois).
- **Suppression à la demande** : Participants → Détail → *Supprimer cette réponse*.
- Sécurité : voir [`docs/SECURITE.md`](docs/SECURITE.md).
