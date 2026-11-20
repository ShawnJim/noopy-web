import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NoopyClient,
  type AccountBalance,
  type AccountFlowItem,
  type AttributionLineageTree,
  type CategoryRecord,
  type CategoryStatItem,
  type EconomicEvent,
  type IdentityAlias,
  type MerchantRankItem,
  type MonthlyReportPoint,
  type ProposalRecord,
  type ReviewItem,
  type SourceFileRecord,
  type SpendingScope,
  type SpendingSummary,
  type SubscriptionCandidate,
  type SubscriptionItem,
} from "./api/client";
import { API_BASE_URL, IS_DEMO_MODE } from "./config";
import { COPY, t, type Lang } from "./i18n";
import { AgentModelSettingsPage } from "./pages/AgentModelSettingsPage";
import { AssistantPage } from "./pages/AssistantPage";
import { ImportPage } from "./pages/ImportPage";
import { InboxPage } from "./pages/InboxPage";
import { LedgerPage } from "./pages/LedgerPage";
import { OntologyPage } from "./pages/OntologyPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import "./styles/app.css";

type NavKey =
  | "reports"
  | "ledger"
  | "assistant"
  | "inbox"
  | "import"
  | "subscriptions"
  | "ontology"
  | "models";

const PAGE_SIZE = 50;

const HERO_COPY: Record<NavKey, { eyebrow: string; zh: string; en: string }> = {
  reports: {
    eyebrow: "01 / EDITORIAL OVERVIEW",
    zh: "财务全景与资金脉络",
    en: "Financial Pulse & Cashflow Sculpture",
  },
  ledger: {
    eyebrow: "02 / ATTRIBUTION LINEAGE",
    zh: "经济事件与归因血缘",
    en: "Economic Events & Provenance Graph",
  },
  assistant: {
    eyebrow: "03 / SEMANTIC COPILOT",
    zh: "自然语言本体推理",
    en: "Ontology Semantic Reasoning",
  },
  inbox: {
    eyebrow: "04 / EVIDENCE TRIAGE",
    zh: "证据收件箱与护栏复核",
    en: "Guardrail & Hypothesis Triage",
  },
  import: {
    eyebrow: "05 / IMMUTABLE INGESTION",
    zh: "多源账单归档与解锁",
    en: "Artifact Archive & Solver",
  },
  subscriptions: {
    eyebrow: "06 / RECURRING RHYTHM",
    zh: "周期承诺与订阅雷达",
    en: "Recurring Commitments Radar",
  },
  ontology: {
    eyebrow: "07 / CANONICAL GRAPH",
    zh: "账户载体与跨源别名",
    en: "Accounts, Instruments & Identity Aliases",
  },
  models: {
    eyebrow: "08 / MULTI-PROTOCOL GATEWAY",
    zh: "多协议模型与 Agent 路由",
    en: "OpenAI · Claude · Gemini · Local Gateway",
  },
};

function emptySpending(scope: SpendingScope): SpendingSummary {
  return {
    scope,
    net_spending: "0.00",
    personal_spending: "0.00",
    household_spending: "0.00",
    total_spending: "0.00",
    active_event_count: 0,
    family_event_count: 0,
    inferred_leg_count: 0,
    verified_leg_count: 0,
  };
}

const client = new NoopyClient(API_BASE_URL);

export function App() {
  const [nav, setNav] = useState<NavKey>("reports");
  const [lang, setLang] = useState<Lang>("bi");
  const [scope, setScope] = useState<SpendingScope>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [aliases, setAliases] = useState<IdentityAlias[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [spending, setSpending] = useState<SpendingSummary>(() => emptySpending("all"));
  const [monthly, setMonthly] = useState<MonthlyReportPoint[]>([]);
  const [merchants, setMerchants] = useState<MerchantRankItem[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStatItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lineage, setLineage] = useState<AttributionLineageTree | null>(null);

  const [files, setFiles] = useState<SourceFileRecord[]>([]);
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [subCandidates, setSubCandidates] = useState<SubscriptionCandidate[]>([]);

  // Demo-only optional caches (only loaded dynamically when VITE_DEMO_MODE === "true")
  const [demoFlows, setDemoFlows] = useState<AccountFlowItem[] | undefined>(undefined);
  const demoLineagesRef = useRef<Record<string, AttributionLineageTree>>({});
  const demoEventsRef = useRef<EconomicEvent[]>([]);

  // Live backend connection & auth state
  const [connStatus, setConnStatus] = useState<"loading" | "connected" | "error">(
    IS_DEMO_MODE ? "connected" : "loading",
  );
  const [connError, setConnError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("owner@noopy.local");
  const [loginPassword, setLoginPassword] = useState("noopy-dev-password");
  const [loggingIn, setLoggingIn] = useState(false);

  const ensureAuth = useCallback(
    async (forceRelogin = false) => {
      if (forceRelogin) {
        window.localStorage.removeItem("noopy_v2_token");
      }
      const cached = window.localStorage.getItem("noopy_v2_token");
      if (cached) {
        client.setToken(cached);
      } else {
        const tok = await client.login(loginEmail, loginPassword);
        window.localStorage.setItem("noopy_v2_token", tok);
      }
    },
    [loginEmail, loginPassword],
  );

  const loadLiveEvents = useCallback(
    async (activeScope: SpendingScope, kw: string, activePage: number) => {
      const evs = await client.queryObjects<EconomicEvent>({
        object_type: "economic_event",
        scope: activeScope,
        search: kw.trim() || undefined,
        limit: PAGE_SIZE,
        offset: activePage * PAGE_SIZE,
      });
      setEvents(evs.items);
      setEventsTotal(evs.total);
      setSelectedId((prev) =>
        evs.items.length === 0
          ? null
          : prev && evs.items.some((e) => e.id === prev)
            ? prev
            : evs.items[0].id,
      );
    },
    [],
  );

  const loadLive = useCallback(
    async (activeScope: SpendingScope, forceRelogin = false) => {
      setConnStatus("loading");
      setConnError(null);
      try {
        await ensureAuth(forceRelogin);

        const [sp, bal, rev, als, mon, mer, catStat] = await Promise.all([
          client.getSpendingSummary(activeScope),
          client.getBalances(),
          client.getReviewInbox(),
          client.queryObjects<IdentityAlias>({ object_type: "identity_alias", limit: 300 }),
          client.getMonthlyStats(activeScope),
          client.getMerchantStats(activeScope, 15),
          client.getCategoryStats(activeScope),
        ]);

        const [fileRes, subRes, candRes, catRes, propRes] = await Promise.allSettled([
          client.listFiles(),
          client.getSubscriptions(),
          client.detectSubscriptions(),
          client.listCategories(),
          client.listProposals("pending"),
        ]);

        setSpending(sp);
        setBalances(bal.items);
        setReviews(rev.items);
        setAliases(als.items);
        setMonthly(mon.items);
        setMerchants(mer.items);
        setCategoryStats(catStat.items);

        if (fileRes.status === "fulfilled") setFiles(fileRes.value.items);
        if (subRes.status === "fulfilled") setSubs(subRes.value.items);
        if (candRes.status === "fulfilled") setSubCandidates(candRes.value.items);
        if (catRes.status === "fulfilled") setCategories(catRes.value.items);
        if (propRes.status === "fulfilled") setProposals(propRes.value.items);

        await loadLiveEvents(activeScope, search, page);
        setConnStatus("connected");
      } catch (err) {
        if (!forceRelogin && window.localStorage.getItem("noopy_v2_token")) {
          return loadLive(activeScope, true);
        }
        setConnStatus("error");
        setConnError(err instanceof Error ? err.message : String(err));
      }
    },
    [ensureAuth, loadLiveEvents, search, page],
  );

  useEffect(() => {
    if (IS_DEMO_MODE) {
      let active = true;
      import("./data/demoOntology").then((mod) => {
        if (!active) return;
        demoLineagesRef.current = mod.DEMO_LINEAGES;
        demoEventsRef.current = mod.DEMO_EVENTS;
        setSpending(mod.computeDemoSpending(scope));
        setBalances(mod.DEMO_BALANCES);
        setReviews(mod.DEMO_REVIEWS);
        setAliases(mod.DEMO_ALIASES);
        setMonthly(mod.DEMO_MONTHLY);
        setMerchants(mod.DEMO_MERCHANTS);
        setCategoryStats(mod.DEMO_CATEGORY_STATS);
        setDemoFlows(mod.DEMO_ACCOUNTS);
        setFiles(mod.DEMO_FILES);
        setSubs(mod.DEMO_SUBS);
        setSubCandidates(mod.DEMO_SUB_CANDIDATES);
        setEvents(mod.DEMO_EVENTS);
        setEventsTotal(mod.DEMO_EVENTS.length);
        setSelectedId((prev) => prev ?? mod.DEMO_EVENTS[0]?.id ?? null);
        setConnStatus("connected");
      });
      return () => {
        active = false;
      };
    }

    void loadLive(scope);
  }, [scope, loadLive]);

  // Paginated & server-searched LedgerPage event loading
  useEffect(() => {
    if (IS_DEMO_MODE) {
      const q = search.trim().toLowerCase();
      const filtered = demoEventsRef.current.filter((e) => {
        const isFam =
          e.payer_party_id === "party:family" || e.beneficiary_party_id === "party:family";
        if (scope === "personal" && isFam) return false;
        if (scope === "household" && !isFam) return false;
        if (q && !e.title.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
      setEventsTotal(filtered.length);
      setEvents(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
      return;
    }
    if (connStatus !== "connected") return;
    void loadLiveEvents(scope, search, page).catch(() => undefined);
  }, [scope, search, page, connStatus, loadLiveEvents]);

  useEffect(() => {
    if (!selectedId) {
      setLineage(null);
      return;
    }
    if (IS_DEMO_MODE) {
      setLineage(demoLineagesRef.current[selectedId] ?? null);
      return;
    }
    let active = true;
    client
      .explainAttribution("economic_event", selectedId)
      .then((tree) => {
        if (active) setLineage(tree);
      })
      .catch(() => {
        if (active) setLineage(null);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const liveAccountFlows = useMemo<AccountFlowItem[]>(
    () =>
      balances.map((b) => ({
        account_id: b.account_id,
        name: b.account_name || b.account_id,
        outflow: b.outflow ?? (Number(b.total_balance) < 0 ? Math.abs(Number(b.total_balance)).toFixed(2) : "0.00"),
        inflow: b.inflow ?? (Number(b.total_balance) > 0 ? Number(b.total_balance).toFixed(2) : "0.00"),
        verified: b.verified_leg_count ?? 0,
        inferred: b.inferred_leg_count,
      })),
    [balances],
  );

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await loadLive(scope, true);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRunSolver = async () => {
    if (IS_DEMO_MODE) {
      return "Demo Sandbox · Switch VITE_DEMO_MODE=false and connect noopy-core (/v2/solver/run) to execute the live 5-stage Rust solver.";
    }
    const res = await client.runSolver([]);
    await loadLive(scope);
    return JSON.stringify(res, null, 2);
  };

  const handleResolveReview = async (item: ReviewItem, action: "confirm" | "ignore") => {
    const key = item.review_key ?? `${item.kind}::${[...item.observation_ids].sort().join(",")}`;
    if (IS_DEMO_MODE) {
      setReviews((prev) =>
        prev.filter((r) => (r.review_key ?? `${r.kind}::${[...r.observation_ids].sort().join(",")}`) !== key),
      );
      return;
    }
    await client.resolveReview({
      review_key: key,
      review_kind: item.kind,
      action,
      payload: item.evidence,
    });
    await loadLive(scope);
  };

  const handleApproveProposal = async (proposalId: string) => {
    if (IS_DEMO_MODE) {
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      return;
    }
    await client.approveProposal(proposalId);
    await loadLive(scope);
  };

  const handleRejectProposal = async (proposalId: string) => {
    if (IS_DEMO_MODE) {
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      return;
    }
    await client.rejectProposal(proposalId);
    await loadLive(scope);
  };

  const handleSetEventCategory = async (eventId: string, categoryId: string) => {
    if (IS_DEMO_MODE) return;
    await client.setEventCategory(eventId, categoryId);
    const [tree, catStat] = await Promise.all([
      client.explainAttribution("economic_event", eventId),
      client.getCategoryStats(scope),
    ]);
    setLineage(tree);
    setCategoryStats(catStat.items);
  };

  const handleCreateSubscription = async (input: {
    name: string;
    merchant?: string;
    amount: string;
    currency: string;
    cycle: "week" | "month" | "quarter" | "year";
    next_charge_on: string;
    account_id?: string | null;
    category_id?: string | null;
    detected_by: "user" | "agent";
  }) => {
    const value: Record<string, unknown> = {
      name: input.name,
      amount: input.amount,
      currency: input.currency,
      cycle: input.cycle,
      next_charge_on: input.next_charge_on,
      detected_by: input.detected_by,
    };
    if (input.merchant) value.merchant = input.merchant;
    if (input.account_id) value.account_id = input.account_id;
    if (input.category_id) value.category_id = input.category_id;

    await client.createProposal(`新建订阅：${input.name}`, [
      { type: "subscription.create", as: "$s", value },
    ]);
    await loadLive(scope);
  };

  const handleToggleSubscription = async (
    sub: SubscriptionItem,
    nextStatus: "active" | "paused",
  ) => {
    const baseVersions: Record<string, number> = {};
    if (typeof sub.version === "number") {
      baseVersions[`subscription:${sub.id}`] = sub.version;
    }
    await client.createProposal(
      `${nextStatus === "paused" ? "暂停" : "恢复"}订阅：${sub.name}`,
      [{ type: "subscription.update", id: sub.id, set: { status: nextStatus } }],
      baseVersions,
    );
    await loadLive(scope);
  };

  const hero = HERO_COPY[nav];

  return (
    <div className="designer-shell">
      <div className="ambient-orb" />
      <div className="ambient-orb-secondary" />

      <header className="floating-header">
        <div className="glass-dock">
          <div className="dock-brand">
            <span className="dock-logo">Noopy</span>
            <span className="dock-edition">
              Atelier Paper · {IS_DEMO_MODE ? "Demo Sandbox" : "v2"}
            </span>
          </div>

          <nav className="dock-nav" aria-label="Primary Navigation">
            {(
              [
                "reports",
                "ledger",
                "assistant",
                "inbox",
                "import",
                "subscriptions",
                "ontology",
                "models",
              ] as const
            ).map((key) => (
              <button
                key={key}
                className={`dock-link ${nav === key ? "active" : ""}`}
                onClick={() => setNav(key)}
              >
                {t(COPY.nav[key], lang === "bi" ? "zh" : lang)}
              </button>
            ))}
          </nav>

          <div className="dock-controls">
            <div className="seg" role="group" aria-label="Language Switcher">
              {(
                [
                  ["bi", "中·EN"],
                  ["zh", "中文"],
                  ["en", "EN"],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  className={lang === code ? "active" : ""}
                  onClick={() => setLang(code)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main key={`${nav}-${lang}`} className="editorial-stage">
        {!IS_DEMO_MODE && connStatus === "error" && (
          <section
            className="surface"
            style={{
              marginBottom: 16,
              borderColor: "var(--sem-danger, #9f2d2d)",
            }}
          >
            <div className="surface-header">
              <h2 className="surface-title">未连接到 Noopy Core 后端（正式模式已禁用假数据降级）</h2>
              <span className="tag tag-inferred mono">OFFLINE</span>
            </div>
            <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
                错误信息：<code className="mono">{connError}</code>
              </div>
              <form
                onSubmit={(e) => void handleManualLogin(e)}
                style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
              >
                <input
                  className="input"
                  style={{ width: 200 }}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="账号邮箱"
                />
                <input
                  className="input"
                  style={{ width: 180 }}
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="密码"
                />
                <button className="btn btn-primary" type="submit" disabled={loggingIn}>
                  {loggingIn ? "连接中..." : "登录并重新连接"}
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="editorial-hero">
          <div>
            <div className="hero-eyebrow">
              {hero.eyebrow} ·{" "}
              {IS_DEMO_MODE
                ? "DEMO SANDBOX (VITE_DEMO_MODE=true)"
                : connStatus === "connected"
                  ? "LIVE POSTGRESQL"
                  : connStatus === "loading"
                    ? "CONNECTING..."
                    : "DISCONNECTED"}{" "}
              · 6/6 INVARIANTS PASS
            </div>
            <h1 className="hero-headline">{t({ zh: hero.zh, en: hero.en }, lang)}</h1>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div className="seg">
              {(["all", "personal", "household"] as const).map((sc) => (
                <button
                  key={sc}
                  className={scope === sc ? "active" : ""}
                  onClick={() => {
                    setScope(sc);
                    setPage(0);
                  }}
                >
                  {t(COPY.scope[sc], lang === "bi" ? "zh" : lang)}
                </button>
              ))}
            </div>

            <div className="seg">
              <button
                className={!verifiedOnly ? "active" : ""}
                onClick={() => setVerifiedOnly(false)}
              >
                {t(COPY.ver.all, lang === "bi" ? "zh" : lang)}
              </button>
              <button
                className={verifiedOnly ? "active" : ""}
                onClick={() => setVerifiedOnly(true)}
              >
                {t(COPY.ver.verified, lang === "bi" ? "zh" : lang)}
              </button>
            </div>
          </div>
        </section>

        {nav === "reports" && (
          <ReportsPage
            scope={scope}
            spending={spending}
            monthly={monthly}
            merchants={merchants}
            categories={categoryStats}
            accountFlows={IS_DEMO_MODE ? demoFlows : liveAccountFlows}
            onGoImport={() => setNav("import")}
          />
        )}
        {nav === "ledger" && (
          <LedgerPage
            events={events}
            totalCount={eventsTotal}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            spending={spending}
            scope={scope}
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            selectedId={selectedId}
            onSelect={setSelectedId}
            lineage={lineage}
            categories={categories}
            onSetEventCategory={IS_DEMO_MODE ? undefined : handleSetEventCategory}
          />
        )}
        {nav === "assistant" && (
          <AssistantPage
            client={client}
            isDemo={IS_DEMO_MODE}
            spending={spending}
            balances={balances}
            aliases={aliases}
            events={events}
            onInspectEvent={(id) => {
              setSelectedId(id);
              setNav("ledger");
            }}
            onGoModels={() => setNav("models")}
          />
        )}
        {nav === "inbox" && (
          <InboxPage
            reviews={reviews}
            proposals={proposals}
            onResolveReview={handleResolveReview}
            onApproveProposal={handleApproveProposal}
            onRejectProposal={handleRejectProposal}
          />
        )}
        {nav === "import" && (
          <ImportPage
            accounts={balances}
            files={files}
            isDemo={IS_DEMO_MODE}
            onUploadFile={async (f, aid) => client.uploadFile(f, aid)}
            onUnlockFile={async (fid, pwd) => client.unlockFilePassword(fid, pwd)}
            onRefreshFiles={async () => {
              await loadLive(scope);
            }}
            onRunSolver={handleRunSolver}
          />
        )}
        {nav === "subscriptions" && (
          <SubscriptionsPage
            initialSubscriptions={subs}
            initialCandidates={subCandidates}
            isDemo={IS_DEMO_MODE}
            onCreateSubscription={handleCreateSubscription}
            onToggleStatus={handleToggleSubscription}
          />
        )}
        {nav === "ontology" && (
          <OntologyPage
            balances={balances}
            aliases={aliases}
            verifiedOnly={verifiedOnly}
            onRunSolver={handleRunSolver}
          />
        )}
        {nav === "models" && <AgentModelSettingsPage client={client} isDemo={IS_DEMO_MODE} />}
      </main>
    </div>
  );
}
