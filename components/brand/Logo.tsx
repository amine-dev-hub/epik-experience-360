"use client";

import { useState } from "react";

/**
 * Logo officiel EPIK LEADERS (public/branding/logo.png).
 * Le fichier fourni est un carré au fond bleu marine avec de larges marges :
 * il est affiché tel quel (couleurs et proportions intactes) dans un cadre
 * qui masque uniquement les marges vides (object-fit: cover, ratio conservé).
 * Tant que le fichier n'est pas présent, un libellé texte est affiché (aucun faux logo).
 */
export function Logo({ size = 48, className = "" }: { size?: number; className?: string; variant?: "dark" | "light" }) {
  const [failed, setFailed] = useState(false);
  const height = Math.round(size * 1.15);
  const width = Math.round(height * 2.3);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-xl bg-navy px-3 font-extrabold leading-none tracking-tight text-white ${className}`}
        style={{ height, fontSize: Math.max(11, size / 3.2) }}
        aria-label="EPIK LEADERS"
      >
        EPIK&nbsp;<span className="text-epik-red">LEADERS</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-xl bg-[#114964] ${className}`}
      style={{ width, height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fichier statique officiel, affiché sans transformation */}
      <img
        src="/branding/logo.png"
        alt="EPIK LEADERS – IHEC Sousse"
        className="h-full w-full object-cover"
        style={{ objectPosition: "45% 52%", transform: "scale(1.55)", transformOrigin: "45% 51%" }}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
