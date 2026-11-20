/**
 * Noopy v2 全量强类型 API 客户端（完整覆盖 /v2/ontology/* 与 /v1/* 全部操作面：
 * 文件上传导入与自动求解、全量后端报表、周期订阅提案、多协议模型注册表与 6 角色 Agent 绑定、
 * 本体复核持久化解算、提案审批与真实 SSE 对话）。
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

export interface AllocationRecord {
  id: string;
  event_id: string;
  category_id: string;
  amount: string;
  base_amount: string;
  attribution_trace?: Record<string, unknown>;
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
  allocations?: AllocationRecord[];
  related_events: Record<string, unknown>[];
  matched_aliases: IdentityAlias[];
}

export interface AccountBalance {
  account_id: string;
  account_name?: string;
  currency: string;
  verified_balance: string;
  total_balance: string;
  outflow?: string;
  inflow?: string;
  verified_leg_count?: number;
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
  review_key?: string;
  kind: string;
  observation_ids: string[];
  reason: string;
  evidence: Record<string, unknown>;
}

export interface ProposalRecord {
  id: string;
  status: string;
  intent: string;
  actor_type?: string;
  actor_id?: string;
  confidence?: string | number | null;
  ops?: Record<string, unknown>[];
  evidence?: Record<string, unknown> | null;
  created_at?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  kind: string;
  key?: string | null;
  parent_id?: string | null;
  archived?: boolean;
}

export interface SourceFileRecord {
  id: string;
  filename: string;
  parser_id?: string | null;
  parse_status: "received" | "parsed" | "needs_password" | "unknown_format" | "failed";
  record_count: number;
  posted_count?: number;
  pending_count?: number;
  error?: string | null;
  received_at?: string;
  parsed_at?: string | null;
  range?: string;
}

export interface MonthlyReportPoint {
  month: string;
  personal: string;
  household: string;
  income: string;
  net_spending?: string;
  count: number;
}

export interface MerchantRankItem {
  party_id?: string | null;
  name: string;
  amount: string;
  count: number;
}

export interface CategoryStatItem {
  category_id: string;
  category_name: string;
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
  upcoming_on?: string | null;
  monthly_amount?: string;
  yearly_amount?: string;
  status: SubscriptionStatus;
  version?: number;
  flag?: string | null;
}

export interface SubscriptionCandidate {
  key?: string;
  name?: string;
  title?: string;
  merchant?: string;
  cycle?: SubscriptionCycle;
  amount: string;
  currency?: string;
  account_id?: string | null;
  category_id?: string | null;
  next_charge_on?: string;
  count?: number;
  months?: number;
  charges?: number;
  first_on?: string;
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
  api_key_set?: boolean;
  api_key_hint?: string | null;
  price_input?: string;
  price_output?: string;
}

export type AgentRole = "chat" | "finance" | "review" | "reconcile" | "subscription" | "summary";

export interface AgentRunLimits {
  max_steps: number;
  timeout_seconds: number;
  max_cost: string;
  max_tokens: number;
}

export interface AgentRoleSettingsView {
  model_id: string | null;
  escalation_model_id: string | null;
  fallback_model_ids: string[];
  escalation_fallback_model_ids: string[];
  limits: AgentRunLimits;
  default_limits: AgentRunLimits;
}

export interface ModelSettingsView {
  models: ModelDefinition[];
  source: string;
  editable: boolean;
  version: number;
  updated_at: string | null;
  agents: Record<AgentRole, AgentRoleSettingsView>;
  background?: {
    enabled: boolean;
    daily_auto_limit: number;
    daily_manual_limit: number;
  };
}

export interface ModelTestResult {
  ok: boolean;
  results: {
    tier: string;
    model: string;
    ok: boolean;
    latency_ms: number;
    error?: string;
  }[];
}

export interface AgentRoleBinding {
  role: AgentRole;
  label: string;
  hint: string;
  model_id: string | null;
  escalation_model_id: string | null;
  fallback_model_ids: string[];
  escalation_fallback_model_ids: string[];
  limits: AgentRunLimits;
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

export interface ChatSessionRecord {
  id: string;
  title?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatStoredMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system_note";
  content: Record<string, unknown>;
  created_at?: string;
}

function makeIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    if (!res.ok) {
      const raw = await res.text();
      try {
        const parsed = JSON.parse(raw) as { message?: string; error?: string; code?: string };
        const msg = parsed.message || parsed.error || raw;
        throw new Error(`HTTP ${res.status}${parsed.code ? ` (${parsed.code})` : ""}: ${msg}`);
      } catch (inner) {
        if (inner instanceof Error && inner.message.startsWith("HTTP ")) throw inner;
        throw new Error(`HTTP ${res.status}: ${raw}`);
      }
    }
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

  getMonthlyStats(scope: SpendingScope) {
    return this.request<{ scope: SpendingScope; items: MonthlyReportPoint[] }>(
      `/v2/ontology/stats/monthly?scope=${scope}`,
    );
  }

  getMerchantStats(scope: SpendingScope, limit = 15) {
    return this.request<{ scope: SpendingScope; items: MerchantRankItem[] }>(
      `/v2/ontology/stats/merchants?scope=${scope}&limit=${limit}`,
    );
  }

  getCategoryStats(scope: SpendingScope) {
    return this.request<{ scope: SpendingScope; items: CategoryStatItem[] }>(
      `/v2/ontology/stats/categories?scope=${scope}`,
    );
  }

  getReviewInbox() {
    return this.request<{ total: number; items: ReviewItem[] }>("/v2/ontology/review");
  }

  resolveReview(body: {
    review_key: string;
    review_kind: string;
    action: "confirm" | "ignore";
    note?: string;
    payload?: Record<string, unknown>;
    alias_raw_value?: string;
    alias_target_id?: string;
  }) {
    return this.request<{ resolved: boolean; review_key: string; action: string; remaining: number }>(
      "/v2/ontology/review/resolve",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  }

  setEventCategory(eventId: string, categoryId: string, note?: string) {
    return this.request<{ updated: boolean; event_id: string; category_id: string }>(
      `/v2/ontology/events/${encodeURIComponent(eventId)}/category`,
      {
        method: "POST",
        body: JSON.stringify({ category_id: categoryId, ...(note ? { note } : {}) }),
      },
    );
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

  // --- v1 Categories & Proposals ---
  listCategories() {
    return this.request<{ items: CategoryRecord[] }>("/v1/categories");
  }

  listProposals(status = "pending") {
    return this.request<{ items: ProposalRecord[]; next_cursor?: string | null }>(
      `/v1/proposals?status=${encodeURIComponent(status)}`,
    );
  }

  createProposal(
    intent: string,
    ops: Record<string, unknown>[],
    baseVersions: Record<string, number> = {},
  ) {
    return this.request<{ id: string; status: string; created?: Record<string, string> }>(
      "/v1/proposals",
      {
        method: "POST",
        headers: { "Idempotency-Key": makeIdempotencyKey("prop") },
        body: JSON.stringify({ intent, ops, base_versions: baseVersions }),
      },
    );
  }

  approveProposal(proposalId: string) {
    return this.request<ProposalRecord>(
      `/v1/proposals/${encodeURIComponent(proposalId)}:approve`,
      {
        method: "POST",
        headers: { "Idempotency-Key": makeIdempotencyKey("approve") },
        body: JSON.stringify({}),
      },
    );
  }

  rejectProposal(proposalId: string, reason?: string) {
    return this.request<ProposalRecord>(
      `/v1/proposals/${encodeURIComponent(proposalId)}:reject`,
      {
        method: "POST",
        headers: { "Idempotency-Key": makeIdempotencyKey("reject") },
        body: JSON.stringify(reason ? { reason } : {}),
      },
    );
  }

  // --- v1 File Import APIs ---
  listFiles() {
    return this.request<{ items: SourceFileRecord[] }>("/v1/files");
  }

  async uploadFile(file: File, accountId?: string): Promise<SourceFileRecord> {
    const form = new FormData();
    form.append("file", file);
    if (accountId) form.append("account_id", accountId);
    const res = await this.request<{ file: SourceFileRecord; duplicate: boolean }>("/v1/files", {
      method: "POST",
      headers: { "Idempotency-Key": makeIdempotencyKey(`upload_${file.size}`) },
      body: form,
    });
    return res.file;
  }

  unlockFilePassword(fileId: string, password: string) {
    return this.request<SourceFileRecord>(`/v1/files/${encodeURIComponent(fileId)}:unlock`, {
      method: "POST",
      headers: { "Idempotency-Key": makeIdempotencyKey("unlock") },
      body: JSON.stringify({ password }),
    });
  }

  // --- v1 Subscriptions ---
  getSubscriptions() {
    return this.request<{ items: SubscriptionItem[] }>("/v1/subscriptions");
  }

  async detectSubscriptions(): Promise<{ items: SubscriptionCandidate[] }> {
    const res = await this.request<{
      today?: string;
      candidates?: SubscriptionCandidate[];
      items?: SubscriptionCandidate[];
    }>("/v1/subscriptions:detect");
    return { items: res.candidates ?? res.items ?? [] };
  }

  // --- v1 Model & Agent Settings ---
  getModelSettings() {
    return this.request<ModelSettingsView>("/v1/model-settings");
  }

  saveModelSettings(payload: {
    version: number;
    models?: ModelDefinition[];
    agents?: Record<
      AgentRole,
      {
        model_id: string | null;
        escalation_model_id: string | null;
        fallback_model_ids: string[];
        escalation_fallback_model_ids: string[];
        limits: AgentRunLimits;
      }
    >;
  }) {
    return this.request<ModelSettingsView>("/v1/model-settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  testModelSettings(payload: { model: ModelDefinition }) {
    return this.request<ModelTestResult>("/v1/model-settings:test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // --- v1 Chat Sessions & SSE Streaming (backed by Agent runtime + v2 Ontology tools) ---
  listSessions() {
    return this.request<{ items: ChatSessionRecord[] }>("/v1/sessions?channel=chat");
  }

  createSession(title?: string) {
    return this.request<ChatSessionRecord>("/v1/sessions", {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    });
  }

  getSessionMessages(sessionId: string) {
    return this.request<{ items: ChatStoredMessage[] }>(
      `/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
    );
  }

  closeSession(sessionId: string) {
    return this.request<ChatSessionRecord>(
      `/v1/sessions/${encodeURIComponent(sessionId)}:close`,
      { method: "POST" },
    );
  }

  async streamSessionMessage(
    sessionId: string,
    content: string,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(
      `${this.baseUrl}/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
        signal,
      },
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    if (!res.body) {
      throw new Error("服务端未返回可读流（Empty SSE body）");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const flushFrame = (rawFrame: string) => {
      const lines = rawFrame.split(/\r?\n/);
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (dataLines.length === 0) return;
      const joined = dataLines.join("\n");
      try {
        onEvent(eventName, JSON.parse(joined) as Record<string, unknown>);
      } catch {
        onEvent(eventName, { text: joined });
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf("\n\n");
      while (idx !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (frame.trim()) flushFrame(frame);
        idx = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim()) flushFrame(buffer);
  }
}
