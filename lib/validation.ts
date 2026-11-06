import { z } from "zod";
import { COMMENT_MAX_LENGTH } from "@/lib/constants";

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est obligatoire`)
    .max(80, `${label} est trop long`)
    .regex(/^[\p{L}][\p{L}\s'’.-]*$/u, `${label} contient des caractères non valides`);

export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Numéro de téléphone trop court")
  .max(20, "Numéro de téléphone trop long")
  .regex(/^\+?[0-9\s().-]+$/, "Numéro de téléphone non valide")
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return digits >= 8 && digits <= 15;
  }, "Numéro de téléphone non valide");

export const participantSchema = z.object({
  last_name: nameField("Le nom"),
  first_name: nameField("Le prénom"),
  email: z.string().trim().toLowerCase().max(254, "Adresse e-mail trop longue").pipe(z.email("Adresse e-mail non valide")),
  phone: phoneSchema,
  privacy_consent: z.literal(true, "Votre consentement est nécessaire pour envoyer le formulaire"),
});

const comment = z
  .string()
  .trim()
  .max(COMMENT_MAX_LENGTH, `${COMMENT_MAX_LENGTH} caractères maximum`)
  .optional()
  .default("");

export const feedbackSchema = participantSchema.extend({
  ratings: z
    .record(z.uuid(), z.number().int().min(1).max(5))
    .refine((r) => Object.keys(r).length > 0 && Object.keys(r).length <= 50, "Notes invalides"),
  pulse_score: z.number().int().min(1, "Choisissez une réponse").max(5),
  recommendation: z.enum(["yes", "no", "maybe"], "Choisissez une réponse"),
  strengths_comment: comment,
  weaknesses_comment: comment,
  improvements_comment: comment,
  training_liked_comment: comment,
  additional_comment: comment,
  /** Champ piège invisible : rempli uniquement par les robots. */
  website: z.string().max(200).optional().default(""),
  /** Horodatage d'ouverture du formulaire (anti-robot : envoi trop rapide refusé). */
  started_at: z.number().int().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "3 caractères minimum")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets uniquement");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optionalTime = z
  .string()
  .trim()
  .regex(/^(\d{2}:\d{2})?(:\d{2})?$/, "Heure non valide")
  .transform((v) => (v === "" ? null : v.slice(0, 5)))
  .nullable();

export const eventSchema = z
  .object({
    name: z.string().trim().min(3, "3 caractères minimum").max(160),
    slug: slugSchema,
    subtitle: optionalText(200),
    description: optionalText(4000),
    organizer: z.string().trim().min(2).max(160),
    speaker: optionalText(160),
    speaker_title: optionalText(200),
    event_date: z.iso.date("Date non valide"),
    start_time: optionalTime,
    end_time: optionalTime,
    location: optionalText(300),
    status: z.enum(["draft", "published", "archived"]),
    is_active: z.boolean(),
    data_retention_days: z.coerce.number().int().min(30).max(3650),
  })
  .refine((e) => !e.start_time || !e.end_time || e.end_time > e.start_time, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["end_time"],
  });

export type EventInput = z.infer<typeof eventSchema>;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Premier message d'erreur par champ, pour l'affichage dans les formulaires. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
