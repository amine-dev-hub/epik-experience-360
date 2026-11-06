import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import type { CriterionRow, EventRow } from "@/types/domain";

/** Événement publié (RLS : le public ne voit que les événements « published »). */
export const getPublishedEvent = cache(async (slug: string) => {
  const db = createPublicClient();
  const { data: event } = await db.from("events").select("*").eq("slug", slug).maybeSingle<EventRow>();
  if (!event) return null;
  const { data: criteria } = await db
    .from("event_criteria")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("display_order");
  return { event, criteria: (criteria ?? []) as CriterionRow[] };
});

export async function listPublishedEvents(): Promise<EventRow[]> {
  const db = createPublicClient();
  const { data } = await db
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: false })
    .limit(20);
  return (data ?? []) as EventRow[];
}
