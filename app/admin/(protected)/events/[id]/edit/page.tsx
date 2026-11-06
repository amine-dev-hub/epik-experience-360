import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getEventById } from "@/lib/data/admin";
import type { CriterionRow } from "@/types/domain";
import { updateEvent } from "../../actions";

export const metadata: Metadata = { title: "Modifier l'événement" };

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]/edit">) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const event = await getEventById(db, id);
  if (!event) notFound();
  const { data: criteria } = await db.from("event_criteria").select("*").eq("event_id", id).order("display_order");

  return (
    <div className="max-w-4xl">
      <Link href={`/admin/events/${id}`} className="text-sm font-semibold text-navy">← {event.name}</Link>
      <PageHeader title="Modifier l'événement" />
      <EventForm
        action={updateEvent.bind(null, id)}
        event={event}
        criteria={(criteria ?? []) as CriterionRow[]}
        submitLabel="Enregistrer"
      />
    </div>
  );
}
