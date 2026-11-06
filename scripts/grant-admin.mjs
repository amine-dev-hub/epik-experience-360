// Donne le rôle administrateur à un utilisateur déjà créé dans Supabase Auth.
// Usage : npm run admin:grant -- prenom.nom@exemple.com
// Le mot de passe n'est jamais manipulé par ce script.
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage : npm run admin:grant -- adresse@email.com");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Variables NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY manquantes (.env.local).");
  process.exit(1);
}
const db = createClient(url, secret, { auth: { persistSession: false } });

let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("Lecture des utilisateurs impossible :", error.message);
    process.exit(1);
  }
  user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`Aucun utilisateur ${email}. Créez-le d'abord : Supabase > Authentication > Users > Add user.`);
  process.exit(1);
}
const { error } = await db.from("admin_profiles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id" });
if (error) {
  console.error("Échec :", error.message);
  process.exit(1);
}
console.log(`✓ ${email} est administrateur.`);
