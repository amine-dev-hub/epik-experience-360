import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Vérifie que l'utilisateur est connecté ET présent dans admin_profiles.
 * À appeler dans chaque page, action et route d'administration.
 */
export const requireAdmin = cache(async () => {
  const db = await createSessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || isAdmin !== true) redirect("/admin/login?error=forbidden");

  return { db, user };
});

/** Variante pour les routes API : renvoie null au lieu de rediriger. */
export async function getAdminOrNull() {
  const db = await createSessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await db.rpc("is_admin");
  return isAdmin === true ? { db, user } : null;
}
