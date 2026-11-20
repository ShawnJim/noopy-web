/**
 * Noopy v2 Ontology Semantic API 强类型客户端（对齐 contracts/openapi.v2.yaml）。
 * 当本地未启动 Core 服务时，自动支持切换到内置脱敏演示数据集，便于零依赖交互验收。
 */

export type SpendingScope = "personal" | "household" | "all";
export type VerificationState = "inferred" | "verified";

export interface EconomicEvent {
  id: string;
  kind: string;
  title: string;
  occurred_at: string;
  amount: string;
  currency: string;
  payer_party_id?: string | null;
  beneficiary_party_id?: string | null;
  status: string;
}

export interface LedgerLeg {
  id: string;
  event_id: string;
  account_id: string;
  instrument_id?: string | null;
  role: string;
  amount: string;
  currency: string;
  occurred_at: string;
  verification_state: VerificationState;
}

export interface Observation {
  id: string;
  artifact_file?: string | null;
  source: string;
  platform: string;
  external_id?: string | null;
  occurred_at: string;
  amount: string;
  currency: string;
  raw_account_hint?: string | null;
  raw_counterparty?: string | null;
  raw_memo?: string | null;
}

export interface ObservationLink {
  id: string;
  observation_id: string;
  target_type: string;
  target_id: string;
  role: string;
  confidence: string;
  attribution_trace: Record<string, unknown>;
}

export interface AttributionLineageTree {
  target_type: string;
  target_id: string;
  event: EconomicEvent;
  legs: {
    leg: LedgerLeg;
    account_name: string;
    evidences: {
      link: ObservationLink;
      observation?: Observation | null;
    }[];
  }[];
  related_events: Record<string, unknown>[];
  matched_aliases: IdentityAlias[];
}

export interface AccountBalance {
  account_id: string;
  currency: string;
  verified_balance: string;
  total_balance: string;
  inferred_leg_count: number;
}

export interface SpendingSummary {
  scope: SpendingScope;
  net_spending: string;
  personal_spending: string;
  household_spending: string;
  total_spending: string;
  active_event_count: number;
  family_event_count: number;
  inferred_leg_count: number;
  verified_leg_count: number;
}

export interface IdentityAlias {
  id: string;
  target_type: string;
  target_id: string;
  alias_kind: string;
  raw_value: string;
  confidence: string;
  origin: string;
  hit_count: number;
}

export interface ReviewItem {
  kind: string;
  observation_ids: string[];
  reason: string;
  evidence: Record<string, unknown>;
}

export class OntologyClient {
  constructor(
    private readonly baseUrl = "",
    private readonly token?: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  queryObjects<T>(body: {
    object_type: string;
    search?: string;
    scope?: SpendingScope;
    verification_state?: VerificationState;
    limit?: number;
    offset?: number;
  }) {
    return this.request<{ object_type: string; total: number; items: T[] }>("/v2/ontology/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  explainAttribution(targetType: "economic_event" | "ledger_leg", id: string) {
    return this.request<AttributionLineageTree>(
      `/v2/ontology/explain/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}`,
    );
  }

  getBalances() {
    return this.request<{ items: AccountBalance[] }>("/v2/ontology/balances");
  }

  getSpendingSummary(scope: SpendingScope) {
    return this.request<SpendingSummary>(`/v2/ontology/stats/spending?scope=${scope}`);
  }

  getReviewInbox() {
    return this.request<{ total: number; items: ReviewItem[] }>("/v2/ontology/review");
  }
}
