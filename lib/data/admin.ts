import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventAnalysisSummary } from "@/lib/analysis/engine";
import type { EventRow } from "@/types/domain";

export interface EventWithStats extends EventRow {
  responseCount: number;
  overallAverage: number | null;
  recommendationRate: number | null;
  pulseAverage: number | null;
  summary: EventAnalysisSummary | null;
  analyzedAt: string | null;
}

/** Tous les événements + indicateurs issus de la dernière analyse enregistrée. */
export async function listEventsWithStats(db: SupabaseClient): Promise<EventWithStats[]> {
  const [{ data: events }, { data: states }] = await Promise.all([
    db.from("events").select("*").order("event_date", { ascending: false }),
    db.from("event_analysis_state").select("event_id,response_count,summary,generated_at"),
  ]);
  const counts = await Promise.all(
    (events ?? []).map((e) =>
      db.from("feedback_submissions").select("id", { count: "exact", head: true }).eq("event_id", e.id),
    ),
  );
  const stateById = new Map((states ?? []).map((s) => [s.event_id as string, s]));
  return (events ?? []).map((e, i) => {
    const state = stateById.get(e.id);
    const summary = (state?.summary ?? null) as EventAnalysisSummary | null;
    return {
      ...(e as EventRow),
      responseCount: counts[i].count ?? 0,
      overallAverage: summary?.averages?.overall ?? null,
      recommendationRate: summary?.recommendation?.rate ?? null,
      pulseAverage: summary?.averages?.pulse ?? null,
      summary,
      analyzedAt: state?.generated_at ?? null,
    };
  });
}

export async function getEventById(db: SupabaseClient, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db.from("events").select("*").eq("id", id).maybeSingle<EventRow>();
  return data;
}
