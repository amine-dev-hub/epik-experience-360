import type { Metadata } from "next";
import { Check } from "lucide-react";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { getPublishedEvent } from "@/lib/data/public";
import { SLOGAN } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Merci !", robots: { index: false } };

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 7) * 0.15}s`,
  color: i % 3 === 0 ? "#C01030" : i % 3 === 1 ? "#004060" : "#9bbbcd",
  size: 6 + (i % 4) * 2,
}));

export default async function ThanksPage({ params }: PageProps<"/event/[slug]/merci">) {
  const { slug } = await params;
  const data = await getPublishedEvent(slug);
  if (!data) notFound();

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute top-0 animate-[confetti_2.4s_ease-in_both] rounded-sm"
            style={{ left: c.left, width: c.size, height: c.size * 1.6, background: c.color, animationDelay: c.delay }}
          />
        ))}
      </div>
      <style>{`@keyframes confetti{0%{transform:translateY(-20px) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(300px) rotate(540deg);opacity:0}}`}</style>

      <div className="card relative w-full max-w-md animate-fade-up p-8 text-center">
        <div className="mx-auto mb-5 flex size-20 animate-pop items-center justify-center rounded-full bg-navy text-white shadow-lg">
          <Check className="size-10" strokeWidth={3} />
        </div>
        <div className="mb-4 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Merci !</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Merci d&apos;avoir partagé votre expérience avec EPIK LEADERS.
          <br />
          Votre avis contribue directement à améliorer nos prochains événements.
        </p>
        <p className="mt-5 text-lg font-bold text-epik-red">{SLOGAN}</p>
        <p className="mt-6 text-xs text-ink-soft">{data.event.name}</p>
      </div>
    </main>
  );
}
