import { describe, expect, it } from "vitest";
import { classifyComment } from "@/lib/analysis/classify";
import { normalizeText } from "@/lib/analysis/text";

const has = (text: string, field: Parameters<typeof classifyComment>[1], theme: string, sentiment: string) =>
  classifyComment(text, field).mentions.some((m) => m.theme === theme && m.sentiment === sentiment);

describe("normalizeText", () => {
  it("supprime accents, casse et apostrophes", () => {
    expect(normalizeText("L'Intervenant était TRÈS Génial !")).toBe("l intervenant etait tres genial !");
  });
});

describe("classifyComment — exemples du cahier des charges", () => {
  it("« Très bonne organisation » → Organisation / positif", () => {
    expect(has("Très bonne organisation", "additional_comment", "organisation", "positive")).toBe(true);
  });

  it("« Nous avons commencé en retard » → Retard (gestion du temps) / négatif", () => {
    expect(has("Nous avons commencé en retard", "additional_comment", "retard", "negative")).toBe(true);
  });

  it("« L'intervenant était excellent » → Intervenant / positif", () => {
    expect(has("L'intervenant était excellent", "additional_comment", "intervenant", "positive")).toBe(true);
  });

  it("« Il faudrait plus d'interaction » → Interaction / suggestion", () => {
    expect(has("Il faudrait plus d'interaction", "additional_comment", "interaction", "suggestion")).toBe(true);
  });
});

describe("classifyComment — robustesse", () => {
  it("gère les négations", () => {
    expect(has("L'accueil n'était pas bien", "additional_comment", "accueil", "negative")).toBe(true);
    expect(has("Il n'y a pas eu de retard", "additional_comment", "retard", "positive")).toBe(true);
    expect(has("La salle n'était pas mauvaise", "additional_comment", "salle", "positive")).toBe(true);
  });

  it("sépare les avis opposés reliés par « mais »", () => {
    const r = classifyComment("Le contenu était excellent mais la salle était trop chaude", "additional_comment");
    expect(r.overall).toBe("mixed");
    expect(r.mentions).toEqual(
      expect.arrayContaining([
        { theme: "contenu", sentiment: "positive" },
        { theme: "salle", sentiment: "negative" },
      ]),
    );
  });

  it("« trop » + adjectif neutre est négatif, « trop bien » reste positif", () => {
    expect(has("La formation était trop longue", "additional_comment", "formation", "negative")).toBe(true);
    expect(has("L'ambiance était trop bien", "additional_comment", "ambiance", "positive")).toBe(true);
  });

  it("utilise le contexte du champ quand aucun avis n'est explicite", () => {
    expect(has("La sonorisation", "weaknesses_comment", "sonorisation", "negative")).toBe(true);
    expect(has("L'intervenant", "strengths_comment", "intervenant", "positive")).toBe(true);
  });

  it("le fragment après une virgule hérite du thème", () => {
    expect(has("L'intervenant, clair et inspirant", "additional_comment", "intervenant", "positive")).toBe(true);
  });

  it("ignore les réponses vides du type « rien » ou « RAS »", () => {
    expect(classifyComment("Rien", "weaknesses_comment").empty).toBe(true);
    expect(classifyComment("R.A.S", "weaknesses_comment").empty).toBe(true);
    expect(classifyComment("aucun point faible", "weaknesses_comment").empty).toBe(true);
  });

  it("classe les commentaires incompris dans « Autres commentaires »", () => {
    const r = classifyComment("Blablabla xyz", "additional_comment");
    expect(r.understood).toBe(false);
    expect(r.mentions[0].theme).toBe("autres");
  });

  it("n'interprète pas « tout au long » comme une critique de durée", () => {
    expect(has("Très dynamique tout au long de la séance", "additional_comment", "formation", "positive")).toBe(true);
  });
});
