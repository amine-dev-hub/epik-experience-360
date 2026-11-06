const TZ = "Africa/Tunis";

export function formatDate(date: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return "—";
  // Une date « AAAA-MM-JJ » est interprétée à midi UTC pour éviter tout décalage de jour.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : new Date(date);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ, ...opts }).format(d);
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
  return formatTime(start) || formatTime(end) || "";
}

export function score(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "—" : value.toFixed(digits).replace(".", ",");
}

export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1).replace(".", ",").replace(",0", "")} %`;
}
