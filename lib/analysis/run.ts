import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CriterionRow, PulseRow, RatingRow, SubmissionRow } from "@/types/domain";
import { computeEventAnalysis, type EventAnalysisSummary } from "./engine";
import { RULES_VERSION } from "./lexicon";

const PAGE = 1000; // limite de lignes par requête de l'API Supabase

/** Lit toutes les lignes d'une requête paginée (au-delà de la limite de 1000 lignes). */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export async function loadEventData(db: SupabaseClient, eventId: string) {
  const [criteria, submissions, ratings, pulses] = await Promise.all([
    fetchAll<CriterionRow>((a, b) =>
      db.from("event_criteria").select("*").eq("event_id", eventId).order("display_order").range(a, b),
    ),
    fetchAll<SubmissionRow>((a, b) =>
      db
        .from("feedback_submissions")
        .select(
          "id,event_id,last_name,first_name,email,phone,recommendation,strengths_comment,weaknesses_comment,improvements_comment,training_liked_comment,additional_comment,submitted_at",
        )
        .eq("event_id", eventId)
        .order("submitted_at")
        .range(a, b),
    ),
    fetchAll<RatingRow>((a, b) =>
      db.from("feedback_ratings").select("submission_id,criterion_id,rating").eq("event_id", eventId).order("id").range(a, b),
    ),
    fetchAll<PulseRow>((a, b) =>
      db.from("live_pulse_responses").select("submission_id,pulse_score").eq("event_id", eventId).order("id").range(a, b),
    ),
  ]);
  return { criteria, submissions, ratings, pulses };
}

/**
 * Recalcule et enregistre l'analyse d'un événement.
 * Idempotent : peut être relancé sans risque (remplacement atomique côté base).
 */
export async function recomputeEventAnalysis(eventId: string): Promise<EventAnalysisSummary> {
  const db = createAdminClient();
  const data = await loadEventData(db, eventId);
  const { summary, rows } = computeEventAnalysis(data);
  const { error } = await db.rpc("store_event_analysis", {
    p_event_id: eventId,
    p_response_count: summary.responseCount,
    p_last_submission_at: summary.lastSubmissionAt,
    p_rules_version: RULES_VERSION,
    p_summary: summary,
    p_rows: rows,
  });
  if (error) throw new Error(`store_event_analysis: ${error.message}`);
  return summary;
}

export interface AnalysisState {
  summary: EventAnalysisSummary;
  generatedAt: string;
  responseCount: number;
}

/**
 * Renvoie l'analyse enregistrée, et la recalcule automatiquement si elle est
 * absente, obsolète (nouvelles réponses non prises en compte) ou produite
 * par une ancienne version des règles. Aucune action de l'administrateur.
 */
export async function getFreshAnalysis(eventId: string): Promise<AnalysisState> {
  const db = createAdminClient();
  const [{ data: state }, { count }] = await Promise.all([
    db.from("event_analysis_state").select("*").eq("event_id", eventId).maybeSingle(),
    db.from("feedback_submissions").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);
  const actual = count ?? 0;
  if (!state || state.rules_version !== RULES_VERSION || state.response_count !== actual) {
    const summary = await recomputeEventAnalysis(eventId);
    return { summary, generatedAt: summary.generatedAt, responseCount: summary.responseCount };
  }
  return {
    summary: state.summary as EventAnalysisSummary,
    generatedAt: state.generated_at,
    responseCount: state.response_count,
  };
}
