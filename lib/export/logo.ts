import "server-only";
import { siteUrl } from "@/lib/env";

/** Récupère le logo officiel (public/branding/logo.png) pour l'intégrer aux rapports PDF. */
export async function loadLogoDataUrl(origin?: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin ?? siteUrl()}/branding/logo.png`, { cache: "no-store" });
    if (!res.ok || !res.headers.get("content-type")?.includes("png")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) return null;
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
