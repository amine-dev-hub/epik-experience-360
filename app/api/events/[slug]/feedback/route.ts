import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { recomputeEventAnalysis } from "@/lib/analysis/run";
import { createAdminClient } from "@/lib/supabase/admin";
import { feedbackSchema, fieldErrors } from "@/lib/validation";

const MAX_BODY_BYTES = 32_000;
const MIN_FILL_MS = 15_000; // un humain met plus de 15 secondes à remplir le formulaire

function clientIpHash(request: NextRequest): string | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

const error = (status: number, message: string, fields?: Record<string, string>) =>
  NextResponse.json({ ok: false, error: message, fields }, { status });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/events/[slug]/feedback">) {
  const { slug } = await ctx.params;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return error(413, "Le formulaire est trop volumineux.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return error(400, "Requête invalide.");
  }

  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return error(400, "Certaines réponses sont invalides.", fieldErrors(parsed.error));
  }
  const input = parsed.data;

  // Robots : on répond « succès » sans rien enregistrer.
  if (input.website) return NextResponse.json({ ok: true });
  if (input.started_at && Date.now() - input.started_at < MIN_FILL_MS) {
    return error(429, "Envoi trop rapide. Merci de vérifier vos réponses puis de réessayer.");
  }

  const db = createAdminClient();
  const { data: event } = await db
    .from("events")
    .select("id,status,is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!event || event.status !== "published") return error(404, "Événement introuvable.");
  if (!event.is_active) return error(410, "Le formulaire de cet événement est fermé.");

  const { error: rpcError } = await db.rpc("submit_feedback", {
    payload: {
      event_id: event.id,
      last_name: input.last_name,
      first_name: input.first_name,
      email: input.email,
      phone: input.phone,
      recommendation: input.recommendation,
      strengths_comment: input.strengths_comment,
      weaknesses_comment: input.weaknesses_comment,
      improvements_comment: input.improvements_comment,
      training_liked_comment: input.training_liked_comment,
      additional_comment: input.additional_comment,
      privacy_consent: input.privacy_consent,
      ratings: input.ratings,
      pulse_score: input.pulse_score,
      ip_hash: clientIpHash(request),
    },
  });

  if (rpcError) {
    if (rpcError.code === "23505") {
      return error(
        409,
        "Une réponse a déjà été enregistrée pour cet événement avec cette adresse e-mail ou ce numéro de téléphone.",
      );
    }
    if (rpcError.message.includes("RATE_LIMITED")) {
      return error(429, "Trop d'envois depuis cette connexion. Merci de réessayer dans quelques minutes.");
    }
    if (rpcError.message.includes("EVENT_CLOSED")) return error(410, "Le formulaire de cet événement est fermé.");
    if (rpcError.message.includes("INVALID_RATINGS")) {
      return error(400, "Merci de noter tous les critères.", { ratings: "Merci de noter tous les critères." });
    }
    console.error("submit_feedback failed", rpcError.code);
    return error(500, "Une erreur est survenue. Merci de réessayer.");
  }

  // Analyse automatique immédiate (EPIK IMPACT AI). Si elle échoue, la soumission
  // reste enregistrée et l'analyse sera recalculée à la prochaine consultation.
  try {
    await recomputeEventAnalysis(event.id);
  } catch (e) {
    console.error("recomputeEventAnalysis failed", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}
