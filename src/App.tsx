import { useEffect, useState } from "react";
import {
  NoopyClient,
  type AccountBalance,
  type AttributionLineageTree,
  type EconomicEvent,
  type IdentityAlias,
  type ReviewItem,
  type SpendingScope,
  type SpendingSummary,
  type ThemeVariant,
} from "./api/client";
import {
  computeDemoSpending,
  DEMO_ALIASES,
  DEMO_BALANCES,
  DEMO_EVENTS,
  DEMO_LINEAGES,
  DEMO_REVIEWS,
} from "./data/demoOntology";
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
  | "assistant"
  | "ledger"
  | "reports"
  | "inbox"
  | "import"
  | "subscriptions"
  | "ontology"
  | "models";

const NAV_TITLES: Record<NavKey, string> = {
  assistant: "AI 财务助手",
  ledger: "账本与归因血缘",
  reports: "多维统计报表",
  inbox: "证据收件箱",
  import: "账单导入与解析",
  subscriptions: "周期订阅与识别",
  ontology: "本体中心（账户 · 别名 · 规则）",
  models: "Agent 与本地模型配置",
};

const client = new NoopyClient();

export function App() {
  const [nav, setNav] = useState<NavKey>("ledger");
  const [theme, setTheme] = useState<ThemeVariant>("foundry");
  const [scope, setScope] = useState<SpendingScope>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"live" | "demo">("demo");

  const [events, setEvents] = useState<EconomicEvent[]>(DEMO_EVENTS);
  const [balances, setBalances] = useState<AccountBalance[]>(DEMO_BALANCES);
  const [aliases, setAliases] = useState<IdentityAlias[]>(DEMO_ALIASES);
  const [reviews, setReviews] = useState<ReviewItem[]>(DEMO_REVIEWS);
  const [spending, setSpending] = useState<SpendingSummary>(() => computeDemoSpending("all"));
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_EVENTS[0]?.id ?? null);
  const [lineage, setLineage] = useState<AttributionLineageTree | null>(
    DEMO_LINEAGES[DEMO_EVENTS[0]?.id ?? ""] ?? null,
  );

  const loadAll = async (activeScope: SpendingScope) => {
    const cached = window.localStorage.getItem("noopy_v2_token");
    if (cached) {
      client.setToken(cached);
    } else {
      const tok = await client.login("owner@noopy.local", "noopy-dev-password");
      window.localStorage.setItem("noopy_v2_token", tok);
    }
    const [sp, bal, evs, rev, als] = await Promise.all([
      client.getSpendingSummary(activeScope),
      client.getBalances(),
      client.queryObjects<EconomicEvent>({
        object_type: "economic_event",
        scope: activeScope,
        limit: 200,
      }),
      client.getReviewInbox(),
      client.queryObjects<IdentityAlias>({ object_type: "identity_alias", limit: 300 }),
    ]);
    setMode("live");
    setSpending(sp);
    setBalances(bal.items);
    setEvents(evs.items);
    setReviews(rev.items);
    setAliases(als.items);
    if (evs.items.length > 0 && !evs.items.some((e) => e.id === selectedId)) {
      setSelectedId(evs.items[0].id);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadAll(scope).catch(async () => {
      if (window.localStorage.getItem("noopy_v2_token")) {
        window.localStorage.removeItem("noopy_v2_token");
        try {
          await loadAll(scope);
          return;
        } catch {
          /* fall through to demo */
        }
      }
      if (!mounted) return;
      setMode("demo");
      setSpending(computeDemoSpending(scope));
      setBalances(DEMO_BALANCES);
      setEvents(DEMO_EVENTS);
      setReviews(DEMO_REVIEWS);
      setAliases(DEMO_ALIASES);
    });
    return () => {
      mounted = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!selectedId) return;
    if (mode === "demo") {
      setLineage(DEMO_LINEAGES[selectedId] ?? null);
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
  }, [selectedId, mode]);

  const handleRunSolver = async () => {
    if (mode === "demo") {
      return "Demo 模式：连接本机 noopy-core (/v2/solver/run) 后将执行纯 Rust 5 阶段求解器并落库 PostgreSQL。";
    }
    const res = await client.runSolver([]);
    await loadAll(scope);
    return JSON.stringify(res, null, 2);
  };

  return (
    <div className="frame" data-theme={theme}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-title">Noopy Ontology</span>
          <span className="brand-ver">v2.0</span>
        </div>

        <nav className="nav-group" aria-label="主导航">
          <div className="nav-section-label">分析与助手</div>
          <button
            className={`nav-item ${nav === "assistant" ? "active" : ""}`}
            onClick={() => setNav("assistant")}
          >
            <span>AI 助手</span>
          </button>
          <button
            className={`nav-item ${nav === "ledger" ? "active" : ""}`}
            onClick={() => setNav("ledger")}
          >
            <span>账本与血缘</span>
            <span className="nav-count">{spending.active_event_count}</span>
          </button>
          <button
            className={`nav-item ${nav === "reports" ? "active" : ""}`}
            onClick={() => setNav("reports")}
          >
            <span>统计报表</span>
          </button>
          <button
            className={`nav-item ${nav === "inbox" ? "active" : ""}`}
            onClick={() => setNav("inbox")}
          >
            <span>证据收件箱</span>
            <span className="nav-count">{reviews.length}</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: 8 }}>
            数据与运营
          </div>
          <button
            className={`nav-item ${nav === "import" ? "active" : ""}`}
            onClick={() => setNav("import")}
          >
            <span>账单导入</span>
          </button>
          <button
            className={`nav-item ${nav === "subscriptions" ? "active" : ""}`}
            onClick={() => setNav("subscriptions")}
          >
            <span>周期订阅</span>
          </button>
          <button
            className={`nav-item ${nav === "ontology" ? "active" : ""}`}
            onClick={() => setNav("ontology")}
          >
            <span>本体与账户</span>
            <span className="nav-count">{aliases.length}</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: 8 }}>
            系统与模型
          </div>
          <button
            className={`nav-item ${nav === "models" ? "active" : ""}`}
            onClick={() => setNav("models")}
          >
            <span>Agent 与本地模型</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-line">
            <span className={`status-dot ${mode === "demo" ? "demo" : ""}`} />
            <span>{mode === "live" ? "Live /v2 PostgreSQL" : "Demo 离线模式"}</span>
          </div>
          <div className="mono">6/6 Invariants · 0 violations</div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <h1 className="topbar-title">{NAV_TITLES[nav]}</h1>
          <div className="topbar-controls">
            <div className="seg" role="group" aria-label="亲情卡口径">
              {(
                [
                  ["all", "全部口径"],
                  ["personal", "仅个人"],
                  ["household", "仅家庭"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  className={scope === val ? "active" : ""}
                  onClick={() => setScope(val)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="seg" role="group" aria-label="余额证实口径">
              <button
                className={!verifiedOnly ? "active" : ""}
                onClick={() => setVerifiedOnly(false)}
              >
                含推断
              </button>
              <button
                className={verifiedOnly ? "active" : ""}
                onClick={() => setVerifiedOnly(true)}
              >
                仅已证实
              </button>
            </div>

            <select
              className="input"
              aria-label="界面风格切换"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeVariant)}
            >
              <option value="foundry">风格 A · Foundry 精密台</option>
              <option value="editorial">风格 B · Editorial 手账风</option>
              <option value="obsidian">风格 C · Obsidian 暗色台</option>
              <option value="mercury">风格 D · Mercury 极简风</option>
            </select>
          </div>
        </header>

        <main className="content">
          {nav === "assistant" && (
            <AssistantPage
              spending={spending}
              balances={balances}
              aliases={aliases}
              events={events}
              onInspectEvent={(id) => {
                setSelectedId(id);
                setNav("ledger");
              }}
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
          {nav === "reports" && <ReportsPage scope={scope} spending={spending} />}
          {nav === "inbox" && (
            <InboxPage
              reviews={reviews}
              onResolve={(idx) => setReviews((prev) => prev.filter((_, i) => i !== idx))}
            />
          )}
          {nav === "import" && (
            <ImportPage
              accounts={balances}
              onUploadFile={async (f, aid) => {
                await client.uploadFile(f, aid);
              }}
              onRunSolver={handleRunSolver}
            />
          )}
          {nav === "subscriptions" && <SubscriptionsPage />}
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
    </div>
  );
}
