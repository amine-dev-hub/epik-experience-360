# Déploiement (GitHub + Vercel, gratuit)

## 1. GitHub

1. Sur https://github.com/new, créez un dépôt **privé** `epik-experience-360`, **sans** README,
   .gitignore ni licence.
2. Dans le terminal du projet :
   ```bash
   git remote add origin https://github.com/VOTRE-COMPTE/epik-experience-360.git
   git push -u origin main
   ```
   La première fois, Git ouvre une fenêtre de connexion GitHub dans le navigateur.

`.env.local` est exclu par `.gitignore` : aucune clé n'est envoyée sur GitHub.

## 2. Vercel

1. https://vercel.com/new → **Import Git Repository** → choisissez `epik-experience-360`.
2. Framework : Next.js (détecté automatiquement). Laissez les commandes par défaut.
3. **Environment Variables** : ajoutez les 5 variables de `.env.example` avec les mêmes valeurs
   que `.env.local`, sauf `NEXT_PUBLIC_SITE_URL` = `https://<nom-du-projet>.vercel.app`.
4. **Deploy**.
5. Si l'URL attribuée diffère de `NEXT_PUBLIC_SITE_URL`, corrigez la variable
   (Settings → Environment Variables), puis relancez le déploiement (Deployments → ⋯ → Redeploy).
   Les QR codes utilisent cette URL.

## 3. Supabase : URL du site

Authentication → **URL Configuration** → *Site URL* = l'URL Vercel.

## 4. Vérifications en production

```bash
node --env-file=.env.local scripts/smoke-test.mjs https://<nom-du-projet>.vercel.app
```

Puis, manuellement :

- ouvrir `/event/entrepreneurship-personal-branding` sur un téléphone en scannant le QR code ;
- se connecter sur `/admin/login`, ouvrir l'événement et télécharger un export ;
- imprimer l'affiche QR (page de l'événement → *Version imprimable*).

## Plan Vercel Hobby : éligibilité

Les conditions de Vercel réservent le plan Hobby à un **usage personnel et non commercial**. Un
outil interne et gratuit d'un club étudiant, sans revenus, sans publicité et sans vente,
correspond à un usage non commercial. Le compte doit toutefois rester celui d'une personne, et non
celui d'une entreprise. Si le club développe une activité commerciale (sponsors facturés via le
site, billetterie payante…), il faudra revoir ce choix. Une alternative gratuite compatible est
d'héberger sur Netlify (offre gratuite) ou Cloudflare Pages (avec l'adaptateur OpenNext). Relisez
les conditions en vigueur sur https://vercel.com/legal/terms avant la mise en ligne.

## Quotas gratuits à surveiller

- **Supabase Free** : base de 500 Mo, mise en pause après environ 7 jours d'inactivité
  (réactivation manuelle gratuite), 2 projets actifs maximum.
- **Vercel Hobby** : quotas mensuels d'exécution et de bande passante, largement suffisants pour
  quelques centaines de réponses par événement.

Ces limites évoluent : vérifiez-les sur les pages de tarifs officielles.
