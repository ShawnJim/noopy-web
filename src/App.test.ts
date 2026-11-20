import { describe, expect, it } from "vitest";
import { computeDemoSpending, DEMO_LINEAGES } from "./data/demoOntology";

describe("noopy-web Ontology projections", () => {
  it("separates personal and household (family card) spending scopes accurately", () => {
    const personal = computeDemoSpending("personal");
    const household = computeDemoSpending("household");
    const all = computeDemoSpending("all");
    expect(Number(personal.net_spending) + Number(household.net_spending)).toBeCloseTo(
      Number(all.net_spending),
      2,
    );
    expect(household.net_spending).toBe("248.50");
  });

  it("includes full attribution lineage for both N:1 merged checkout and 1:N combo payment", () => {
    expect(DEMO_LINEAGES.ev_merged_1.legs[0].evidences).toHaveLength(2);
    expect(DEMO_LINEAGES.ev_combo_1.legs).toHaveLength(2);
  });
});
