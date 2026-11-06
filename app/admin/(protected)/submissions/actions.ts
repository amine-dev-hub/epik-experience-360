"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recomputeEventAnalysis } from "@/lib/analysis/run";
import { requireAdmin } from "@/lib/auth";

export async function deleteSubmission(id: string, eventId: string) {
  const { db } = await requireAdmin();
  await db.from("feedback_submissions").delete().eq("id", id).eq("event_id", eventId);
  // L'analyse est recalculée immédiatement pour ne plus tenir compte de cette réponse.
  await recomputeEventAnalysis(eventId).catch(() => undefined);
  revalidatePath("/admin", "layout");
  redirect("/admin/participants");
}
