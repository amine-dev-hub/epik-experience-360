"use client";

import { Star } from "lucide-react";

const LABELS = ["Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Très satisfait"];

export function StarRating({
  value,
  onChange,
  name,
  invalid,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  name: string;
  invalid?: boolean;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={name}
        aria-invalid={invalid || undefined}
        className="flex items-center gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (value ?? 0) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} sur 5 — ${LABELS[n - 1]}`}
              onClick={() => onChange(n)}
              className={`flex size-11 items-center justify-center rounded-xl transition sm:size-12 ${
                active ? "bg-epik-red-50" : "bg-surface hover:bg-navy-50"
              }`}
            >
              <Star
                className={`size-7 transition ${active ? "scale-105 fill-epik-red text-epik-red" : "text-navy-200"}`}
                strokeWidth={1.75}
              />
            </button>
          );
        })}
      </div>
      <p className={`mt-1.5 h-5 text-sm ${value ? "text-ink-soft" : invalid ? "text-epik-red" : "text-transparent"}`}>
        {value ? `${value}/5 · ${LABELS[value - 1]}` : invalid ? "Merci de choisir une note" : "·"}
      </p>
    </div>
  );
}
