import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/ui";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Nouvel événement" };

export default function NewEventPage() {
  return (
    <div className="max-w-4xl">
      <Link href="/admin/events" className="text-sm font-semibold text-navy">← Événements</Link>
      <PageHeader title="Nouvel événement" subtitle="Le formulaire, le lien public et le QR code sont générés automatiquement." />
      <EventForm action={createEvent} submitLabel="Créer l'événement" />
    </div>
  );
}
