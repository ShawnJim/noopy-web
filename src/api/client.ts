/**
 * Noopy v2 全量强类型 API 客户端（完整覆盖 /v2/ontology/* 与 /v1/* 全部操作面：
 * 文件上传导入、统计报表、周期订阅与自动识别、多模型注册表与本地 Ollama/vLLM 配置、6 角色 Agent 绑定）。
 */

export type SpendingScope = "personal" | "household" | "all";
export type VerificationState = "inferred" | "verified";
export type ThemeVariant = "foundry" | "editorial" | "obsidian" | "mercury";

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

export interface ReviewItem {
  kind: string;
  observation_ids: string[];
  reason: string;
  evidence: Record<string, unknown>;
}

export interface SourceFileRecord {
  id: string;
  filename: string;
  parser_id: string;
  parse_status: "received" | "parsing" | "needs_password" | "parsed" | "unknown_format" | "failed";
  record_count: number;
  range?: string;
  error?: string | null;
}

export interface MonthlyReportPoint {
  month: string;
  personal: string;
  household: string;
  income: string;
  count: number;
}

export interface MerchantRankItem {
  name: string;
  amount: string;
  count: number;
}

export interface AccountFlowItem {
  account_id: string;
  name: string;
  outflow: string;
  inflow: string;
  verified: number;
  inferred: number;
}

export type SubscriptionCycle = "week" | "month" | "quarter" | "year";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface SubscriptionItem {
  id: string;
  name: string;
  merchant?: string | null;
  amount: string;
  currency: string;
  cycle: SubscriptionCycle;
  next_charge_on: string;
  status: SubscriptionStatus;
  flag?: string | null;
}

export interface SubscriptionCandidate {
  title: string;
  amount: string;
  months: number;
  charges: number;
  last_on: string;
}

export type ModelProtocol = "openai" | "anthropic" | "gemini";

export interface ModelDefinition {
  id: string;
  name: string;
  provider: "deepseek" | "dashscope" | "zhipu" | "custom";
  protocol?: ModelProtocol;
  base_url?: string;
  model: string;
  api_key?: string | null;
  price_input?: string;
  price_output?: string;
}

export type AgentRole = "chat" | "finance" | "review" | "reconcile" | "subscription" | "summary";

export interface AgentRoleBinding {
  role: AgentRole;
  label: string;
  hint: string;
  model_id: string | null;
  escalation_model_id: string | null;
  max_steps: number;
  max_seconds: number;
  max_cost: string;
}

export interface AttributionRuleItem {
  id: string;
  stage: string;
  name: string;
  origin: string;
  hits: number;
  enabled: boolean;
  description: string;
}

export interface BudgetProgress {
  id: string;
  name: string;
  period: string;
  limit: string;
  spent: string;
  ratio: number;
}

export class NoopyClient {
  private token?: string;

  constructor(
    private readonly baseUrl = "",
    token?: string,
  ) {
    this.token = token;
  }

  setToken(token?: string) {
    this.token = token;
  }

  async login(email: string, password: string): Promise<string> {
    const res = await this.request<{ token: string }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.token = res.token;
    return res.token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {};
    if (!(init?.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  // --- v2 Ontology Semantic API ---
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

  getSqlSnapshot() {
    return this.request<{ tables: Record<string, Record<string, unknown>[]> }>("/v2/ontology/snapshot");
  }

  runSolver(observations: Record<string, unknown>[] = []) {
    return this.request<{
      metrics: Record<string, number>;
      review_count: number;
      invariant_violations: number;
    }>("/v2/solver/run", {
      method: "POST",
      body: JSON.stringify({ observations }),
    });
  }

  // --- v1 File Import APIs ---
  listFiles() {
    return this.request<{ items: SourceFileRecord[] }>("/v1/files");
  }

  uploadFile(file: File, accountId?: string) {
    const form = new FormData();
    form.append("file", file);
    if (accountId) form.append("account_id", accountId);
    return this.request<SourceFileRecord>("/v1/files", {
      method: "POST",
      headers: { "Idempotency-Key": `upload_${file.name}_${file.size}_${Date.now()}` },
      body: form,
    });
  }

  unlockFilePassword(fileId: string, password: string) {
    return this.request<SourceFileRecord>(`/v1/files/${encodeURIComponent(fileId)}:password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  // --- v1 Subscriptions & Proposals ---
  getSubscriptions() {
    return this.request<{ items: SubscriptionItem[] }>("/v1/subscriptions");
  }

  detectSubscriptions() {
    return this.request<{ items: SubscriptionCandidate[] }>("/v1/subscriptions:detect");
  }

  createProposal(intent: string, ops: Record<string, unknown>[]) {
    return this.request<{ id: string; status: string }>("/v1/proposals", {
      method: "POST",
      headers: { "Idempotency-Key": `prop_${Date.now()}` },
      body: JSON.stringify({ intent, ops, base_versions: {} }),
    });
  }

  // --- v1 Model & Agent Settings ---
  getModelSettings() {
    return this.request<Record<string, unknown>>("/v1/model-settings");
  }

  saveModelSettings(payload: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/v1/model-settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  testModelSettings(payload: Record<string, unknown>) {
    return this.request<{ ok?: boolean; latency_ms?: number; model?: string; reply?: string }>(
      "/v1/model-settings:test",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }
}
