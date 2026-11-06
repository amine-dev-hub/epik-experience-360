import { ArrowRight, BarChart3, MessageSquareHeart, QrCode } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { listPublishedEvents } from "@/lib/data/public";
import { formatDate } from "@/lib/format";
import { APP_NAME, ORG_NAME, SLOGAN, SLOGAN_SECONDARY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const events = await listPublishedEvents().catch(() => []);
  const open = events.filter((e) => e.is_active);

  return (
    <>
      <main className="flex-1">
        <section className="relative overflow-hidden bg-navy text-white">
          <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-epik-red/20 blur-3xl" />
          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <div className="mb-8 inline-flex rounded-2xl ring-1 ring-white/15">
              <Logo size={52} />
            </div>
            <p className="text-xs font-bold tracking-[0.25em] text-white/70">{ORG_NAME}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">{APP_NAME}</h1>
            <p className="mt-4 text-2xl font-semibold">{SLOGAN}</p>
            <p className="mt-2 max-w-xl text-white/75">
              {SLOGAN_SECONDARY} La plateforme de feedback des événements EPIK LEADERS : partagez votre expérience en
              quelques minutes et aidez-nous à faire évoluer chaque événement.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-extrabold text-navy">Donner mon avis</h2>
          {open.length === 0 ? (
            <p className="mt-3 text-ink-soft">
              Aucun formulaire n&apos;est ouvert pour le moment. Scannez le QR code affiché lors de l&apos;événement.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {open.map((e) => (
                <Link key={e.id} href={`/event/${e.slug}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="text-xs font-semibold text-epik-red">{formatDate(e.event_date)}</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{e.name}</h3>
                  {e.subtitle && <p className="text-sm text-ink-soft">{e.subtitle}</p>}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy">
                    Commencer l&apos;évaluation <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { icon: QrCode, title: "Un QR code, un avis", text: "Accès direct au formulaire depuis votre téléphone, sans compte." },
              { icon: MessageSquareHeart, title: "Votre voix compte", text: "Notes, EPIK LIVE PULSE et commentaires libres." },
              { icon: BarChart3, title: "EPIK IMPACT AI", text: "Analyse automatique des retours pour améliorer nos prochains événements." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-5">
                <Icon className="size-6 text-epik-red" />
                <h3 className="mt-3 font-bold text-navy">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
