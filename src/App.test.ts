import { afterEach, describe, expect, it, vi } from "vitest";
import { NoopyClient } from "./api/client";
import { computeDemoSpending, DEMO_LINEAGES } from "./data/demoOntology";

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("NoopyClient M5 wire contracts", () => {
  it("unwraps { file } on upload, uses :unlock with Idempotency-Key, and unwraps { candidates } on detect", async () => {
    const calls: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        calls.push({
          url: input,
          method: init?.method,
          headers: init?.headers as Record<string, string>,
          body: init?.body,
        });
        if (input === "/v1/files") {
          return new Response(
            JSON.stringify({
              file: { id: "f1", filename: "a.csv", parse_status: "received", record_count: 0 },
              duplicate: false,
            }),
            { status: 201 },
          );
        }
        if (input === "/v1/files/f1:unlock") {
          return new Response(
            JSON.stringify({ id: "f1", filename: "a.pdf", parse_status: "received", record_count: 0 }),
            { status: 202 },
          );
        }
        if (input === "/v1/subscriptions:detect") {
          return new Response(
            JSON.stringify({
              today: "2026-11-20",
              candidates: [{ key: "icloud", name: "iCloud+", amount: "68.00", last_on: "2026-11-15" }],
              matches: [],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ resolved: true, review_key: "k1", action: "confirm", remaining: 0 }), {
          status: 200,
        });
      }),
    );

    const client = new NoopyClient("", "tok_123");
    const uploaded = await client.uploadFile(new File(["a,b"], "a.csv"));
    expect(uploaded.id).toBe("f1");

    const unlocked = await client.unlockFilePassword("f1", "secret");
    expect(unlocked.id).toBe("f1");
    expect(calls[1].url).toBe("/v1/files/f1:unlock");
    expect(calls[1].headers?.["Idempotency-Key"]).toBeTruthy();

    const detected = await client.detectSubscriptions();
    expect(detected.items).toHaveLength(1);
    expect(detected.items[0].name).toBe("iCloud+");

    const resolved = await client.resolveReview({
      review_key: "k1",
      review_kind: "bank_refund_guardrail",
      action: "confirm",
    });
    expect(resolved.resolved).toBe(true);
  });
});
