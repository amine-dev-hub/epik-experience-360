import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Client « service » : contourne RLS. Utilisé UNIQUEMENT côté serveur,
 * pour l'enregistrement des feedbacks et le calcul des analyses.
 * La clé secrète n'est jamais exposée au navigateur (import "server-only").
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY manquante");
  cached = createClient(publicEnv().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
