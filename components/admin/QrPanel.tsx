"use client";

import { Check, Copy, Download, ExternalLink, Printer } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const QR_OPTIONS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#004060", light: "#FFFFFF" } };

export function QrPanel({ url, slug, eventId }: { url: string; slug: string; eventId: string }) {
  const [png, setPng] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { ...QR_OPTIONS, width: 1024 }).then(setPng).catch(() => setPng(""));
  }, [url]);

  const downloadSvg = async () => {
    const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    trigger(blobUrl, `qr-${slug}.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="mx-auto shrink-0 rounded-2xl border border-line bg-white p-2 sm:mx-0">
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element -- image générée localement (data URL)
          <img src={png} alt={`QR code vers ${url}`} width={176} height={176} className="size-44" />
        ) : (
          <div className="size-44 animate-pulse rounded-xl bg-surface" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-xs">{url}</code>
          <button type="button" onClick={copy} className="btn-ghost btn-sm shrink-0">
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary btn-sm" disabled={!png} onClick={() => trigger(png, `qr-${slug}.png`)}>
            <Download className="size-3.5" /> PNG
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={downloadSvg}>
            <Download className="size-3.5" /> SVG
          </button>
          <Link href={`/admin/events/${eventId}/print`} target="_blank" className="btn-ghost btn-sm">
            <Printer className="size-3.5" /> Version imprimable
          </Link>
          <a href={url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
            <ExternalLink className="size-3.5" /> Ouvrir le formulaire
          </a>
        </div>
        <p className="text-xs text-ink-soft">Le QR code reste valide tant que l&apos;événement et son lien existent.</p>
      </div>
    </div>
  );
}

function trigger(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
