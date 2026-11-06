import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Logo } from "@/components/brand/Logo";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireAdmin } from "@/lib/auth";
import { getEventById } from "@/lib/data/admin";
import { siteUrl } from "@/lib/env";
import { formatDate, formatTimeRange } from "@/lib/format";
import { APP_NAME, SLOGAN } from "@/lib/constants";

export const metadata: Metadata = { title: "QR code imprimable" };

export default async function PrintQrPage({ params }: PageProps<"/admin/events/[id]/print">) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const event = await getEventById(db, id);
  if (!event) notFound();
  const url = `${siteUrl()}/event/${event.slug}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#004060", light: "#FFFFFF" },
  });

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white print:static">
      <style>{`@page{size:A4;margin:12mm} @media print{body *{visibility:hidden} .print-area,.print-area *{visibility:visible} .print-area{position:absolute;left:0;top:0;right:0}}`}</style>
      <div className="flex justify-end gap-2 border-b border-line p-3 print:hidden">
        <PrintButton />
      </div>
      <div className="print-area mx-auto flex min-h-[260mm] max-w-[180mm] flex-col items-center justify-between px-6 py-10 text-center">
        <div className="flex flex-col items-center">
          <Logo size={90} />
          <p className="mt-6 text-sm font-bold tracking-[0.3em] text-ink-soft">{APP_NAME}</p>
          <h1 className="mt-3 text-4xl leading-tight font-extrabold text-navy">{event.name}</h1>
          {event.subtitle && <p className="mt-2 text-xl text-ink-soft">{event.subtitle}</p>}
          <p className="mt-3 text-base text-ink-soft">
            {formatDate(event.event_date)} {formatTimeRange(event.start_time, event.end_time) && `· ${formatTimeRange(event.start_time, event.end_time)}`}
          </p>
        </div>
        <div className="my-8">
          <p className="mb-4 text-2xl font-bold text-epik-red">Donnez-nous votre avis !</p>
          <div className="mx-auto w-[110mm] rounded-3xl border-4 border-navy p-4 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-4 text-lg text-ink">Scannez le QR code avec votre téléphone · 3 minutes</p>
          <p className="mt-1 font-mono text-sm break-all text-ink-soft">{url}</p>
        </div>
        <p className="text-2xl font-extrabold text-navy">{SLOGAN}</p>
      </div>
    </div>
  );
}
