import { describe, expect, it } from "vitest";
import { computeEventAnalysis, sampleLevel } from "@/lib/analysis/engine";
import { computePriority } from "@/lib/analysis/recommendations";
import type { CriterionRow, SubmissionRow } from "@/types/domain";

const EVENT = "00000000-0000-0000-0000-00000000000a";

const criterion = (id: string, code: string, category: "event" | "training", order: number): CriterionRow => ({
  id,
  event_id: EVENT,
  category,
  code,
  label: code,
  description: null,
  display_order: order,
  is_active: true,
});

const criteria = [
  criterion("c1", "organisation", "event", 1),
  criterion("c2", "gestion_temps", "event", 2),
  criterion("c3", "intervenant", "training", 3),
];

const submission = (id: string, extra: Partial<SubmissionRow> = {}): SubmissionRow => ({
  id,
  event_id: EVENT,
  last_name: "Ben Ali",
  first_name: "Sami",
  email: `${id}@test.tn`,
  phone: "+21620000000",
  recommendation: "yes",
  strengths_comment: null,
  weaknesses_comment: null,
  improvements_comment: null,
  training_liked_comment: null,
  additional_comment: null,
  submitted_at: "2026-11-07T13:00:00.000Z",
  ...extra,
});

describe("computeEventAnalysis", () => {
  const submissions = [
    submission("s1", { weaknesses_comment: "Nous avons commencé en retard", strengths_comment: "L'intervenant était excellent" }),
    submission("s2", { weaknesses_comment: "Gros retard au début", recommendation: "maybe" }),
    submission("s3", { improvements_comment: "Il faudrait plus d'interaction", recommendation: "no" }),
  ];
  const ratings = [
    { submission_id: "s1", criterion_id: "c1", rating: 5 },
    { submission_id: "s1", criterion_id: "c2", rating: 2 },
    { submission_id: "s1", criterion_id: "c3", rating: 5 },
    { submission_id: "s2", criterion_id: "c1", rating: 4 },
    { submission_id: "s2", criterion_id: "c2", rating: 2 },
    { submission_id: "s2", criterion_id: "c3", rating: 5 },
    { submission_id: "s3", criterion_id: "c1", rating: 3 },
    { submission_id: "s3", criterion_id: "c2", rating: 3 },
    { submission_id: "s3", criterion_id: "c3", rating: 4 },
  ];
  const pulses = [
    { submission_id: "s1", pulse_score: 5 },
    { submission_id: "s2", pulse_score: 4 },
    { submission_id: "s3", pulse_score: 3 },
  ];
  const { summary, rows } = computeEventAnalysis({ criteria, submissions, ratings, pulses });

  it("calcule les moyennes sur 5", () => {
    expect(summary.averages.byCode.organisation).toBe(4);
    expect(summary.averages.byCode.gestion_temps).toBe(2.33);
    expect(summary.averages.byCode.intervenant).toBe(4.67);
    expect(summary.averages.event).toBe(3.17);
    expect(summary.averages.training).toBe(4.67);
    expect(summary.averages.overall).toBe(3.67);
    expect(summary.averages.pulse).toBe(4);
  });

  it("calcule satisfaction, répartition et recommandation", () => {
    const orga = summary.criteria.find((c) => c.code === "organisation")!;
    expect(orga.distribution).toEqual([0, 0, 1, 1, 1]);
    expect(orga.satisfaction).toBe(66.7);
    expect(summary.recommendation).toMatchObject({ yes: 1, no: 1, maybe: 1, rate: 33.3 });
    expect(summary.pulse.distribution).toEqual([0, 0, 1, 1, 1]);
  });

  it("identifie points forts et points faibles à partir des données", () => {
    expect(summary.strengths.map((s) => s.topic)).toContain("intervenant");
    const weak = summary.weaknesses.find((w) => w.topic === "gestion_temps");
    expect(weak).toBeDefined();
    expect(weak!.negativeMentions).toBe(2);
  });

  it("génère des recommandations justifiées et priorisées", () => {
    const top = summary.recommendations[0];
    expect(top.topic).toBe("gestion_temps");
    expect(["high", "critical"]).toContain(top.priority);
    expect(top.evidence.length).toBeGreaterThan(0);
    expect(summary.recommendations.some((r) => r.topic === "interaction")).toBe(true);
    // Aucune recommandation sur un sujet sans problème signalé
    expect(summary.recommendations.some((r) => r.topic === "intervenant")).toBe(false);
  });

  it("signale les petits échantillons", () => {
    expect(summary.sample).toBe("small");
    expect(sampleLevel(0)).toBe("none");
    expect(sampleLevel(15)).toBe("indicative");
    expect(sampleLevel(40)).toBe("sufficient");
  });

  it("anonymise les extraits de commentaires", () => {
    const { summary: s } = computeEventAnalysis({
      criteria,
      submissions: [submission("x", { additional_comment: "Sami Ben Ali : contactez-moi sami@x.tn, organisation top" })],
      ratings: [],
      pulses: [],
    });
    const example = s.themes.flatMap((t) => t.examples)[0].text;
    expect(example).not.toMatch(/Sami|sami@x\.tn/);
  });

  it("produit des lignes d'analyse cohérentes", () => {
    expect(rows.some((r) => r.analysis_type === "recommendation" && r.priority)).toBe(true);
    expect(rows.every((r) => r.category.length > 0)).toBe(true);
  });

  it("gère un événement sans réponse sans inventer de données", () => {
    const { summary: empty } = computeEventAnalysis({ criteria, submissions: [], ratings: [], pulses: [] });
    expect(empty.responseCount).toBe(0);
    expect(empty.averages.overall).toBeNull();
    expect(empty.recommendations).toEqual([]);
    expect(empty.strengths).toEqual([]);
  });
});

describe("isolation des événements", () => {
  it("refuse des données mélangeant plusieurs événements", () => {
    expect(() =>
      computeEventAnalysis({
        criteria,
        submissions: [submission("a"), { ...submission("b"), event_id: "autre-evenement" }],
        ratings: [],
        pulses: [],
      }),
    ).toThrow();
  });

  it("ignore les notes qui n'appartiennent pas aux soumissions fournies", () => {
    const { summary } = computeEventAnalysis({
      criteria,
      submissions: [submission("a")],
      ratings: [
        { submission_id: "a", criterion_id: "c1", rating: 5 },
        { submission_id: "intrus", criterion_id: "c1", rating: 1 },
      ],
      pulses: [],
    });
    expect(summary.averages.byCode.organisation).toBe(5);
  });
});

describe("computePriority", () => {
  it("croît avec la gravité et la fréquence", () => {
    expect(computePriority({ negativeShare: 0, suggestionShare: 0.05, average: 4.5 }).priority).toBe("low");
    expect(computePriority({ negativeShare: 0.5, suggestionShare: 0, average: 2 }).priority).toBe("critical");
  });
});
