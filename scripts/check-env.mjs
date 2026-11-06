// Vérifie la configuration Supabase sans jamais afficher les valeurs secrètes.
// Usage : node --env-file=.env.local scripts/check-env.mjs
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "IP_HASH_SALT",
];

let ok = true;
for (const name of required) {
  const value = process.env[name];
  if (!value) {
    console.log(`✗ ${name} : manquante`);
    ok = false;
  } else {
    console.log(`✓ ${name} : définie (${value.length} caractères)`);
  }
}
if (!ok) process.exit(1);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
  console.log("⚠ L'URL Supabase ne ressemble pas à https://xxxx.supabase.co");
}

async function probe(label, key) {
  try {
    const res = await fetch(`${url}/rest/v1/events?select=id,slug&limit=5`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = await res.text();
    if (res.ok) {
      const rows = JSON.parse(body);
      console.log(`✓ ${label} : connexion OK — ${rows.length} événement(s) visible(s)`);
    } else if (res.status === 404 || body.includes("PGRST205") || body.includes("does not exist")) {
      console.log(`✓ ${label} : clé acceptée — la table "events" n'existe pas encore (migration à appliquer)`);
    } else if (res.status === 401 || res.status === 403) {
      console.log(`✗ ${label} : clé refusée (HTTP ${res.status})`);
      ok = false;
    } else {
      console.log(`? ${label} : HTTP ${res.status}`);
    }
  } catch (error) {
    console.log(`✗ ${label} : impossible de joindre Supabase (${error.message})`);
    ok = false;
  }
}

await probe("Clé publique", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
await probe("Clé secrète", process.env.SUPABASE_SECRET_KEY);
process.exit(ok ? 0 : 1);
