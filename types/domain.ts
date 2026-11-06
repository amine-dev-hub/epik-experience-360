export type EventStatus = "draft" | "published" | "archived";
export type CriterionCategory = "event" | "training";
export type Recommendation = "yes" | "no" | "maybe";

export interface EventRow {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  organizer: string;
  speaker: string | null;
  speaker_title: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: EventStatus;
  is_active: boolean;
  data_retention_days: number;
  created_at: string;
  updated_at: string;
}

export interface CriterionRow {
  id: string;
  event_id: string;
  category: CriterionCategory;
  code: string;
  label: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface SubmissionRow {
  id: string;
  event_id: string;
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  recommendation: Recommendation;
  strengths_comment: string | null;
  weaknesses_comment: string | null;
  improvements_comment: string | null;
  training_liked_comment: string | null;
  additional_comment: string | null;
  submitted_at: string;
}

export interface RatingRow {
  submission_id: string;
  criterion_id: string;
  rating: number;
}

export interface PulseRow {
  submission_id: string;
  pulse_score: number;
}

export const COMMENT_FIELDS = [
  "strengths_comment",
  "weaknesses_comment",
  "improvements_comment",
  "training_liked_comment",
  "additional_comment",
] as const;

export type CommentField = (typeof COMMENT_FIELDS)[number];
