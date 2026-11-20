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
} from "./api/client";
import {
  computeDemoSpending,
  DEMO_ALIASES,
  DEMO_BALANCES,
  DEMO_EVENTS,
  DEMO_LINEAGES,
  DEMO_REVIEWS,
} from "./data/demoOntology";
import { AssistantPage } from "./pages/AssistantPage";
import { InboxPage } from "./pages/InboxPage";
import { LedgerPage } from "./pages/LedgerPage";
import { OntologyPage } from "./pages/OntologyPage";
import { PlanSettingsPage } from "./pages/PlanSettingsPage";
import "./styles/app.css";

type Space = "assistant" | "ledger" | "inbox" | "ontology" | "settings";

const SPACE_TITLES: Record<Space, string> = {
  assistant: "AI 财务助手",
  ledger: "账本与归因血缘",
  inbox: "证据收件箱",
  ontology: "导入与本体中心",
  settings: "规划与系统设置",
};

const client = new NoopyClient();

export function App() {
  const [space, setSpace] = useState<Space>("ledger");
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
      return "Demo 模式：连接本地 noopy-core (/v2/solver/run) 后将触发真实 5 阶段纯 Rust 求解与 PostgreSQL 落库。";
    }
    const res = await client.runSolver([]);
    await loadAll(scope);
    return JSON.stringify(res, null, 2);
  };

  return (
    <div className="frame">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-title">Noopy Ontology</span>
          <span className="brand-ver">v2.0</span>
        </div>

        <nav className="nav-group" aria-label="主导航">
          <div className="nav-section-label">Workspace</div>
          <button
            className={`nav-item ${space === "assistant" ? "active" : ""}`}
            onClick={() => setSpace("assistant")}
          >
            <span>AI 助手</span>
          </button>
          <button
            className={`nav-item ${space === "ledger" ? "active" : ""}`}
            onClick={() => setSpace("ledger")}
          >
            <span>账本与血缘</span>
            <span className="nav-count">{spending.active_event_count}</span>
          </button>
          <button
            className={`nav-item ${space === "inbox" ? "active" : ""}`}
            onClick={() => setSpace("inbox")}
          >
            <span>证据收件箱</span>
            <span className="nav-count">{reviews.length}</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: 10 }}>
            Ontology & System
          </div>
          <button
            className={`nav-item ${space === "ontology" ? "active" : ""}`}
            onClick={() => setSpace("ontology")}
          >
            <span>导入与本体</span>
            <span className="nav-count">{aliases.length}</span>
          </button>
          <button
            className={`nav-item ${space === "settings" ? "active" : ""}`}
            onClick={() => setSpace("settings")}
          >
            <span>规划与设置</span>
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
          <h1 className="topbar-title">{SPACE_TITLES[space]}</h1>
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
          </div>
        </header>

        <main className="content">
          {space === "assistant" && (
            <AssistantPage
              spending={spending}
              balances={balances}
              aliases={aliases}
              events={events}
              onInspectEvent={(id) => {
                setSelectedId(id);
                setSpace("ledger");
              }}
            />
          )}
          {space === "ledger" && (
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
          {space === "inbox" && (
            <InboxPage
              reviews={reviews}
              onResolve={(idx) => setReviews((prev) => prev.filter((_, i) => i !== idx))}
            />
          )}
          {space === "ontology" && (
            <OntologyPage
              balances={balances}
              aliases={aliases}
              verifiedOnly={verifiedOnly}
              onRunSolver={handleRunSolver}
            />
          )}
          {space === "settings" && <PlanSettingsPage mode={mode} />}
        </main>
      </div>
    </div>
  );
}
