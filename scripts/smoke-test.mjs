// Test de bout en bout sur un serveur en marche (local ou production).
// Crée un événement de TEST temporaire, envoie des feedbacks, vérifie RLS, analyse
// et isolation, puis SUPPRIME l'événement de test (aucune donnée réelle touchée).
// Usage : node --env-file=.env.local scripts/smoke-test.mjs [http://localhost:3000]
import { createClient } from "@supabase/supabase-js";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
};

const slug = `test-smoke-${Date.now().toString(36)}`;
const { data: ev, error } = await service
  .from("events")
  .insert({ name: "TEST automatique (à supprimer)", slug, event_date: "2026-11-07", status: "published", is_active: true })
  .select("id")
  .single();
if (error) {
  console.error("Création de l'événement de test impossible :", error.message);
  process.exit(1);
}
const { data: crits } = await service
  .from("event_criteria")
  .insert([
    { event_id: ev.id, category: "event", code: "organisation", label: "Organisation", display_order: 1 },
    { event_id: ev.id, category: "event", code: "gestion_temps", label: "Gestion du temps", display_order: 2 },
    { event_id: ev.id, category: "training", code: "intervenant", label: "Intervenant", display_order: 3 },
  ])
  .select("id,code");

const ratings = (o, t, i) => {
  const byCode = Object.fromEntries(crits.map((c) => [c.code, c.id]));
  return { [byCode.organisation]: o, [byCode.gestion_temps]: t, [byCode.intervenant]: i };
};
const payload = (n, extra = {}) => ({
  last_name: "Test",
  first_name: `Participant ${"ABCDEFGH"[n]}`,
  email: `smoke${n}.${slug}@example.com`,
  phone: `+216 20 000 ${String(100 + n)}`,
  privacy_consent: true,
  ratings: ratings(5, 2, 5),
  pulse_score: 4,
  recommendation: "yes",
  strengths_comment: "L'intervenant était excellent",
  weaknesses_comment: "Nous avons commencé en retard",
  improvements_comment: "Il faudrait plus d'interaction",
  started_at: Date.now() - 60_000,
  ...extra,
});
const post = (body) =>
  fetch(`${base}/api/events/${slug}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
    body: JSON.stringify(body),
  });

try {
  const page = await fetch(`${base}/event/${slug}`);
  check(page.status === 200, `Page publique /event/${slug} accessible`);

  const r1 = await post(payload(1));
  check(r1.status === 200, `Soumission valide acceptée (HTTP ${r1.status})`);
  if (r1.status !== 200) console.log("   ", await r1.text());
  const r2 = await post(payload(2, { recommendation: "maybe", ratings: ratings(4, 3, 4) }));
  check(r2.status === 200, "Deuxième soumission acceptée");

  const dup = await post(payload(1));
  check(dup.status === 409, `Doublon (même e-mail) refusé (HTTP ${dup.status})`);

  const bad = await post(payload(3, { email: "pas-un-email", phone: "12" }));
  check(bad.status === 400, `Données invalides refusées (HTTP ${bad.status})`);

  const missing = await post(payload(4, { ratings: {} }));
  check(missing.status === 400, "Notes manquantes refusées");

  const fast = await post(payload(5, { started_at: Date.now() }));
  check(fast.status === 429, "Envoi trop rapide (robot) refusé");

  const { data: state } = await service.from("event_analysis_state").select("*").eq("event_id", ev.id).maybeSingle();
  check(state?.response_count === 2, `Analyse automatique à jour (${state?.response_count ?? 0} réponses analysées)`);
  check(state?.summary?.averages?.byCode?.organisation === 4.5, "Moyenne Organisation = 4,5");
  check(
    (state?.summary?.weaknesses ?? []).some((w) => w.topic === "gestion_temps"),
    "Point faible « Gestion du temps » détecté",
  );
  check((state?.summary?.recommendations ?? []).length > 0, "Recommandations générées");

  // Sécurité : le public ne lit rien de sensible.
  const { data: leak1 } = await anon.from("feedback_submissions").select("id").eq("event_id", ev.id);
  check((leak1 ?? []).length === 0, "RLS : le public ne peut pas lire les soumissions");
  const { data: leak2 } = await anon.from("feedback_ratings").select("id").eq("event_id", ev.id);
  check((leak2 ?? []).length === 0, "RLS : le public ne peut pas lire les notes");
  const { data: leak3 } = await anon.from("event_analysis_state").select("event_id");
  check((leak3 ?? []).length === 0, "RLS : le public ne peut pas lire les analyses");
  const { error: insErr } = await anon.from("feedback_submissions").insert({ event_id: ev.id, last_name: "x", first_name: "x", email: "x@x.tn", phone: "12345678", recommendation: "yes", privacy_consent: true });
  check(!!insErr, "RLS : le public ne peut pas insérer directement");
  const { error: rpcErr } = await anon.rpc("submit_feedback", { payload: {} });
  check(!!rpcErr, "La fonction d'enregistrement est interdite au public");
  const { data: admins } = await anon.from("admin_profiles").select("id");
  check((admins ?? []).length === 0, "RLS : liste des administrateurs invisible");

  // Isolation : l'événement réel n'a pas été modifié par ces tests.
  const { data: other } = await service.from("feedback_submissions").select("id").neq("event_id", ev.id).ilike("email", `%${slug}%`);
  check((other ?? []).length === 0, "Isolation : aucune réponse de test dans un autre événement");

  // Formulaire fermé
  await service.from("events").update({ is_active: false }).eq("id", ev.id);
  const closed = await post(payload(6));
  check(closed.status === 410, "Formulaire fermé : soumission refusée");

  const adminPage = await fetch(`${base}/admin`, { redirect: "manual" });
  check([307, 308].includes(adminPage.status), "/admin redirige vers la connexion sans session");
  const exp = await fetch(`${base}/api/admin/events/${ev.id}/export?type=responses&format=csv`, { redirect: "manual" });
  check(exp.status === 401, "Export refusé sans session administrateur");
} finally {
  await service.from("events").delete().eq("id", ev.id);
  console.log("→ Événement de test supprimé.");
}

console.log(failures ? `\n${failures} échec(s)` : "\nTous les tests de bout en bout sont passés.");
process.exit(failures ? 1 : 0);
