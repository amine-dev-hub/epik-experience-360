"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_CRITERIA } from "@/lib/constants";
import { eventSchema, fieldErrors } from "@/lib/validation";
import type { EventStatus } from "@/types/domain";

export interface EventFormState {
  errors?: Record<string, string>;
  message?: string;
}

const criteriaSchema = z
  .array(
    z.object({
      id: z.string().optional(),
      category: z.enum(["event", "training"]),
      code: z.string().regex(/^[a-z0-9_]{2,40}$/),
      label: z.string().trim().min(2, "Libellé trop court").max(120),
      description: z.string().trim().max(300).nullable(),
      is_active: z.boolean(),
    }),
  )
  .max(40);

function readEventForm(formData: FormData) {
  return eventSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    subtitle: formData.get("subtitle") ?? "",
    description: formData.get("description") ?? "",
    organizer: formData.get("organizer"),
    speaker: formData.get("speaker") ?? "",
    speaker_title: formData.get("speaker_title") ?? "",
    event_date: formData.get("event_date"),
    start_time: formData.get("start_time") ?? "",
    end_time: formData.get("end_time") ?? "",
    location: formData.get("location") ?? "",
    status: formData.get("status"),
    is_active: formData.get("is_active") === "on",
    data_retention_days: formData.get("data_retention_days") ?? 365,
  });
}

function readCriteria(formData: FormData) {
  try {
    return criteriaSchema.safeParse(JSON.parse(String(formData.get("criteria") ?? "[]")));
  } catch {
    return criteriaSchema.safeParse(null);
  }
}

const SLUG_TAKEN = { errors: { slug: "Ce lien est déjà utilisé par un autre événement." } };

export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const { db } = await requireAdmin();
  const parsed = readEventForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const criteria = readCriteria(formData);
  if (!criteria.success) return { message: "Critères d'évaluation invalides." };

  const { data: event, error } = await db.from("events").insert(parsed.data).select("id").single();
  if (error) return error.code === "23505" ? SLUG_TAKEN : { message: "Impossible de créer l'événement." };

  const list = criteria.data.length > 0 ? criteria.data : DEFAULT_CRITERIA.map((c) => ({ ...c, is_active: true }));
  const { error: cErr } = await db.from("event_criteria").insert(
    list.map((c, i) => ({
      event_id: event.id,
      category: c.category,
      code: c.code,
      label: c.label,
      description: c.description,
      is_active: c.is_active,
      display_order: i + 1,
    })),
  );
  if (cErr) {
    await db.from("events").delete().eq("id", event.id);
    return { message: "Impossible d'enregistrer les critères (codes en double ?)." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(eventId: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const { db } = await requireAdmin();
  const parsed = readEventForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const criteria = readCriteria(formData);
  if (!criteria.success) return { message: "Critères d'évaluation invalides." };

  const { error } = await db.from("events").update(parsed.data).eq("id", eventId);
  if (error) return error.code === "23505" ? SLUG_TAKEN : { message: "Impossible d'enregistrer les modifications." };

  // Critères : mise à jour des existants (les notes déjà reçues restent liées), ajout des nouveaux.
  // Un critère n'est jamais supprimé s'il a des réponses : il est seulement désactivé.
  for (const [i, c] of criteria.data.entries()) {
    const row = {
      category: c.category,
      label: c.label,
      description: c.description,
      is_active: c.is_active,
      display_order: i + 1,
    };
    const res = c.id
      ? await db.from("event_criteria").update(row).eq("id", c.id).eq("event_id", eventId)
      : await db.from("event_criteria").insert({ ...row, code: c.code, event_id: eventId });
    if (res.error) return { message: `Critère « ${c.label} » : enregistrement impossible (code en double ?).` };
  }
  revalidatePath("/admin", "layout");
  revalidatePath(`/event/${parsed.data.slug}`);
  redirect(`/admin/events/${eventId}`);
}

export async function setEventStatus(eventId: string, status: EventStatus) {
  const { db } = await requireAdmin();
  await db.from("events").update({ status }).eq("id", eventId);
  revalidatePath("/admin", "layout");
}

export async function setEventActive(eventId: string, isActive: boolean) {
  const { db } = await requireAdmin();
  await db.from("events").update({ is_active: isActive }).eq("id", eventId);
  revalidatePath("/admin", "layout");
}

export async function duplicateEvent(eventId: string) {
  const { db } = await requireAdmin();
  const { data: source } = await db.from("events").select("*").eq("id", eventId).single();
  if (!source) return;
  const { data: criteria } = await db.from("event_criteria").select("*").eq("event_id", eventId).order("display_order");

  let slug = `${source.slug}-copie`.slice(0, 74);
  for (let n = 2; n < 50; n++) {
    const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("slug", slug);
    if (!count) break;
    slug = `${source.slug.slice(0, 70)}-copie-${n}`;
  }

  const { data: copy, error } = await db
    .from("events")
    .insert({
      name: `${source.name} (copie)`.slice(0, 160),
      slug,
      subtitle: source.subtitle,
      description: source.description,
      organizer: source.organizer,
      speaker: source.speaker,
      speaker_title: source.speaker_title,
      event_date: source.event_date,
      start_time: source.start_time,
      end_time: source.end_time,
      location: source.location,
      status: "draft",
      is_active: true,
      data_retention_days: source.data_retention_days,
    })
    .select("id")
    .single();
  if (error || !copy) return;
  if (criteria?.length) {
    await db.from("event_criteria").insert(
      criteria.map((c) => ({
        event_id: copy.id,
        category: c.category,
        code: c.code,
        label: c.label,
        description: c.description,
        display_order: c.display_order,
        is_active: c.is_active,
      })),
    );
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/events/${copy.id}/edit`);
}

export async function deleteEvent(eventId: string, confirmation: string) {
  const { db } = await requireAdmin();
  const { data: event } = await db.from("events").select("slug").eq("id", eventId).single();
  // Confirmation explicite : l'administrateur doit retaper le lien de l'événement.
  if (!event || confirmation.trim() !== event.slug) return { ok: false };
  await db.from("events").delete().eq("id", eventId);
  revalidatePath("/admin", "layout");
  redirect("/admin/events");
}
