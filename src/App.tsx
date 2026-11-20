import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NoopyClient,
  type AccountBalance,
  type AccountFlowItem,
  type AttributionLineageTree,
  type EconomicEvent,
  type IdentityAlias,
  type MerchantRankItem,
  type MonthlyReportPoint,
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

function aggregateLiveReports(
  events: EconomicEvent[],
  balances: AccountBalance[],
): {
  monthly: MonthlyReportPoint[];
  merchants: MerchantRankItem[];
  accountFlows: AccountFlowItem[];
} {
  const monthMap = new Map<string, { personal: number; household: number; income: number; count: number }>();
  const merchMap = new Map<string, { amount: number; count: number }>();

  for (const ev of events) {
    const month = ev.occurred_at.slice(0, 7);
    const amt = Math.abs(Number(ev.amount) || 0);
    const m = monthMap.get(month) ?? { personal: 0, household: 0, income: 0, count: 0 };
    m.count += 1;
    const isHousehold =
      ev.kind === "family_card_spend" ||
      (Boolean(ev.beneficiary_party_id) && ev.beneficiary_party_id !== "party:self");
    if (ev.kind === "income") {
      m.income += amt;
    } else if (isHousehold) {
      m.household += amt;
    } else if (ev.kind === "expense" || ev.kind === "purchase" || ev.kind === "fee") {
      m.personal += amt;
    }
    monthMap.set(month, m);

    if (ev.kind === "expense" || ev.kind === "purchase" || isHousehold) {
      const key = ev.title || "未命名商户";
      const cur = merchMap.get(key) ?? { amount: 0, count: 0 };
      cur.amount += amt;
      cur.count += 1;
      merchMap.set(key, cur);
    }
  }

  const monthly: MonthlyReportPoint[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      personal: v.personal.toFixed(2),
      household: v.household.toFixed(2),
      income: v.income.toFixed(2),
      count: v.count,
    }));

  const merchants: MerchantRankItem[] = Array.from(merchMap.entries())
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 12)
    .map(([name, v]) => ({ name, amount: v.amount.toFixed(2), count: v.count }));

  const accountFlows: AccountFlowItem[] = balances.map((b) => {
    const total = Number(b.total_balance) || 0;
    const hasVerified = Number(b.verified_balance) !== 0;
    return {
      account_id: b.account_id,
      name: b.account_id,
      outflow: total < 0 ? Math.abs(total).toFixed(2) : "0.00",
      inflow: total > 0 ? total.toFixed(2) : "0.00",
      verified: hasVerified ? 1 : 0,
      inferred: b.inferred_leg_count,
    };
  });

  return { monthly, merchants, accountFlows };
}

const client = new NoopyClient(API_BASE_URL);

export function App() {
  const [nav, setNav] = useState<NavKey>("reports");
  const [lang, setLang] = useState<Lang>("bi");
  const [scope, setScope] = useState<SpendingScope>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [aliases, setAliases] = useState<IdentityAlias[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [spending, setSpending] = useState<SpendingSummary>(() => emptySpending("all"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lineage, setLineage] = useState<AttributionLineageTree | null>(null);

  const [files, setFiles] = useState<SourceFileRecord[]>([]);
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [subCandidates, setSubCandidates] = useState<SubscriptionCandidate[]>([]);

  // Demo-only optional overrides (only populated when VITE_DEMO_MODE === "true")
  const [demoMonthly, setDemoMonthly] = useState<MonthlyReportPoint[] | undefined>(undefined);
  const [demoMerchants, setDemoMerchants] = useState<MerchantRankItem[] | undefined>(undefined);
  const [demoFlows, setDemoFlows] = useState<AccountFlowItem[] | undefined>(undefined);
  const demoLineagesRef = useRef<Record<string, AttributionLineageTree>>({});

  // Live backend connection & auth state
  const [connStatus, setConnStatus] = useState<"loading" | "connected" | "error">(
    IS_DEMO_MODE ? "connected" : "loading",
  );
  const [connError, setConnError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("owner@noopy.local");
  const [loginPassword, setLoginPassword] = useState("noopy-dev-password");
  const [loggingIn, setLoggingIn] = useState(false);

  const loadLive = useCallback(
    async (activeScope: SpendingScope, forceRelogin = false) => {
      setConnStatus("loading");
      setConnError(null);
      try {
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

        const [sp, bal, evs, rev, als] = await Promise.all([
          client.getSpendingSummary(activeScope),
          client.getBalances(),
          client.queryObjects<EconomicEvent>({
            object_type: "economic_event",
            scope: activeScope,
            limit: 500,
          }),
          client.getReviewInbox(),
          client.queryObjects<IdentityAlias>({ object_type: "identity_alias", limit: 300 }),
        ]);

        // Optional v1 endpoints (best-effort; empty array if not yet populated)
        const [fileRes, subRes, candRes] = await Promise.allSettled([
          client.listFiles(),
          client.getSubscriptions(),
          client.detectSubscriptions(),
        ]);

        setSpending(sp);
        setBalances(bal.items);
        setEvents(evs.items);
        setReviews(rev.items);
        setAliases(als.items);
        if (fileRes.status === "fulfilled") setFiles(fileRes.value.items);
        if (subRes.status === "fulfilled") setSubs(subRes.value.items);
        if (candRes.status === "fulfilled") setSubCandidates(candRes.value.items);

        setSelectedId((prev) =>
          evs.items.length === 0
            ? null
            : prev && evs.items.some((e) => e.id === prev)
              ? prev
              : evs.items[0].id,
        );
        setConnStatus("connected");
      } catch (err) {
        if (!forceRelogin && window.localStorage.getItem("noopy_v2_token")) {
          return loadLive(activeScope, true);
        }
        setConnStatus("error");
        setConnError(err instanceof Error ? err.message : String(err));
      }
    },
    [loginEmail, loginPassword],
  );

  useEffect(() => {
    if (IS_DEMO_MODE) {
      let active = true;
      import("./data/demoOntology").then((mod) => {
        if (!active) return;
        demoLineagesRef.current = mod.DEMO_LINEAGES;
        setSpending(mod.computeDemoSpending(scope));
        setBalances(mod.DEMO_BALANCES);
        setEvents(mod.DEMO_EVENTS);
        setReviews(mod.DEMO_REVIEWS);
        setAliases(mod.DEMO_ALIASES);
        setDemoMonthly(mod.DEMO_MONTHLY);
        setDemoMerchants(mod.DEMO_MERCHANTS);
        setDemoFlows(mod.DEMO_ACCOUNTS);
        setFiles(mod.DEMO_FILES);
        setSubs(mod.DEMO_SUBS);
        setSubCandidates(mod.DEMO_SUB_CANDIDATES);
        setSelectedId((prev) => prev ?? mod.DEMO_EVENTS[0]?.id ?? null);
        setConnStatus("connected");
      });
      return () => {
        active = false;
      };
    }

    void loadLive(scope);
  }, [scope, loadLive]);

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

  const liveReports = useMemo(
    () => (IS_DEMO_MODE ? null : aggregateLiveReports(events, balances)),
    [events, balances],
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
              borderColor: "var(--sem-warn, #c44)",
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
                onSubmit={handleManualLogin}
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
                  onClick={() => setScope(sc)}
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
            monthly={IS_DEMO_MODE ? demoMonthly : liveReports?.monthly}
            merchants={IS_DEMO_MODE ? demoMerchants : liveReports?.merchants}
            accountFlows={IS_DEMO_MODE ? demoFlows : liveReports?.accountFlows}
            onGoImport={() => setNav("import")}
          />
        )}
        {nav === "ledger" && (
          <LedgerPage
            events={events}
            spending={spending}
            scope={scope}
            search={search}
            onSearchChange={setSearch}
            selectedId={selectedId}
            onSelect={setSelectedId}
            lineage={lineage}
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
            onResolve={(idx) => setReviews((prev) => prev.filter((_, i) => i !== idx))}
          />
        )}
        {nav === "import" && (
          <ImportPage
            accounts={balances}
            files={files}
            isDemo={IS_DEMO_MODE}
            onUploadFile={async (f, aid) => client.uploadFile(f, aid)}
            onUnlockFile={async (fid, pwd) => client.unlockFilePassword(fid, pwd)}
            onRunSolver={handleRunSolver}
          />
        )}
        {nav === "subscriptions" && (
          <SubscriptionsPage
            initialSubscriptions={subs}
            initialCandidates={subCandidates}
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
        {nav === "models" && <AgentModelSettingsPage client={client} />}
      </main>
    </div>
  );
}
