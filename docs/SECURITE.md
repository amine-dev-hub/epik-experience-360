# Sécurité et protection des données

## Modèle d'accès

| Acteur | Peut | Ne peut pas |
|---|---|---|
| Public (clé publishable) | lire les événements **publiés** et leurs critères actifs | lire, modifier ou insérer une réponse, une note, une analyse, la liste des admins |
| Participant | envoyer **son** feedback via `/api/events/[slug]/feedback` | voir les réponses des autres, accéder à `/admin` |
| Administrateur (Supabase Auth + `admin_profiles`) | tout lire, gérer les événements, supprimer des réponses | — |
| Serveur (clé secrète) | appeler `submit_feedback` et `store_event_analysis` | — (clé jamais envoyée au navigateur) |

## Mesures en place

- **RLS** activé sur toutes les tables. Aucune politique d'écriture pour `anon`. Les privilèges
  `anon` sont révoqués sur les tables sensibles (défense en profondeur).
- Fonctions `security definer` avec `search_path` vide. `submit_feedback` et
  `store_event_analysis` sont exécutables **uniquement** par `service_role`.
- **Isolation des événements** : clés étrangères composites `(submission_id, event_id)` et
  `(criterion_id, event_id)`. Une note ne peut pas être rattachée à un autre événement que sa
  soumission. Toutes les lectures sont filtrées par `event_id`, et le moteur refuse des données
  mélangées.
- **Validation** Zod côté client et côté serveur, plus des contraintes SQL (longueurs, formats,
  plages 1–5).
- **Anti-abus** : unicité (événement, e-mail) et (événement, téléphone), champ piège anti-robot,
  délai minimal de remplissage, limite de 5 envois par IP et par 10 minutes. L'IP est conservée
  seulement sous forme d'empreinte SHA-256 salée.
- **Injections** : requêtes paramétrées (client Supabase), recherche nettoyée avant les filtres
  PostgREST, neutralisation des formules dans les exports CSV/XLSX.
- **Sessions** : cookies Supabase SSR rafraîchis par `proxy.ts`. Le rôle admin est revérifié dans
  chaque page, action serveur et route d'export.
- **Erreurs** : messages génériques, sans détail technique ni existence de compte.
- **En-têtes HTTP** : `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Brouillon local du formulaire : `sessionStorage`, uniquement les notes et commentaires
  (jamais nom, e-mail ou téléphone). Il est effacé après l'envoi ou à la fermeture de l'onglet.

## Données personnelles (Tunisie)

La plateforme **ne garantit pas** à elle seule la conformité juridique. Points à vérifier par le
club :

- Loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données à caractère
  personnel. Vérifiez auprès de l'**INPDP** (Instance nationale de protection des données
  personnelles) si une déclaration préalable du traitement est nécessaire.
- Les données sont hébergées hors de Tunisie (Supabase et Vercel, région UE pour la base) :
  vérifiez les obligations relatives au transfert de données à l'étranger.
- Indiquez dans la politique de confidentialité (`/confidentialite`) un **contact réel** pour les
  demandes d'accès, de rectification et de suppression.
- Minimisation : seules les données demandées par le cahier des charges sont collectées.
- Conservation : durée par événement (365 jours par défaut) et purge via
  `purge_expired_submissions()`.

## Bonnes pratiques

- Ne partagez jamais `SUPABASE_SECRET_KEY`. En cas de fuite, régénérez-la dans Supabase
  (API Keys), puis mettez à jour `.env.local` et Vercel.
- Utilisez un mot de passe administrateur long et unique.
- Gardez *Allow new users to sign up* désactivé dans Supabase.
