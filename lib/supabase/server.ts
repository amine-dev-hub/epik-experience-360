import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/** Client lié à la session de l'utilisateur connecté (RLS appliqué). */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const { url, key } = publicEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le proxy se charge du rafraîchissement.
        }
      },
    },
  });
}

/** Client anonyme sans cookies, pour les pages publiques (RLS : événements publiés seulement). */
export function createPublicClient() {
  const { url, key } = publicEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
