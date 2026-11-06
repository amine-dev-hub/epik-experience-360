import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { FeedbackWizard } from "@/components/feedback/FeedbackWizard";
import { getPublishedEvent } from "@/lib/data/public";
import { formatDate, formatTimeRange } from "@/lib/format";
import { APP_NAME, SLOGAN } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/event/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedEvent(slug);
  if (!data) return { title: "Événement introuvable" };
  return {
    title: data.event.name,
    description: `Partagez votre avis sur « ${data.event.name} ». ${SLOGAN}`,
  };
}

export default async function EventPage({ params }: PageProps<"/event/[slug]">) {
  const { slug } = await params;
  const data = await getPublishedEvent(slug);
  if (!data) notFound();
  const { event, criteria } = data;

  if (!event.is_active || criteria.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card max-w-md p-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={56} />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] text-ink-soft">{APP_NAME}</p>
          <h1 className="mt-2 text-xl font-extrabold text-navy">{event.name}</h1>
          <p className="mt-3 text-ink-soft">
            Le formulaire de feedback de cet événement est actuellement fermé. Merci de votre intérêt !
          </p>
          <p className="mt-4 font-semibold text-epik-red">{SLOGAN}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <FeedbackWizard
        criteria={criteria}
        event={{
          id: event.id,
          slug: event.slug,
          name: event.name,
          subtitle: event.subtitle,
          speaker: event.speaker,
          speaker_title: event.speaker_title,
          location: event.location,
          dateLabel: formatDate(event.event_date, { weekday: "long" }),
          timeLabel: formatTimeRange(event.start_time, event.end_time),
        }}
      />
    </main>
  );
}
