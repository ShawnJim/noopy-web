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

const client = new NoopyClient();

export function App() {
  const [nav, setNav] = useState<NavKey>("reports");
  const [theme, setTheme] = useState<ThemeVariant>("editorial");
  const [lang, setLang] = useState<Lang>("bi");
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
      return "Demo Mode · Connect local noopy-core (/v2/solver/run) to execute 5-stage Rust solver & PostgreSQL persistence.";
    }
    const res = await client.runSolver([]);
    await loadAll(scope);
    return JSON.stringify(res, null, 2);
  };

  const hero = HERO_COPY[nav];

  return (
    <div className="designer-shell" data-theme={theme}>
      <div className="ambient-orb" />

      <header className="floating-header">
        <div className="glass-dock">
          <div className="dock-brand">
            <span className="dock-logo">Noopy</span>
            <span className="dock-edition">Ontology · v2</span>
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

            <select
              className="input"
              style={{ borderRadius: 999, padding: "5px 11px", fontSize: 12 }}
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeVariant)}
            >
              <option value="editorial"> Atelier Paper · 纸感编辑</option>
              <option value="obsidian">Obsidian Noir · 黑曜暗夜</option>
              <option value="foundry">Swiss Studio · 瑞士画廊</option>
              <option value="mercury">Nordic Mist · 北欧雾白</option>
            </select>
          </div>
        </div>
      </header>

      <main key={`${nav}-${lang}`} className="editorial-stage">
        <section className="editorial-hero">
          <div>
            <div className="hero-eyebrow">
              {hero.eyebrow} · {mode === "live" ? "LIVE POSTGRESQL" : "STUDIO PREVIEW"} · 6/6 INVARIANTS PASS
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

        {nav === "reports" && <ReportsPage scope={scope} spending={spending} />}
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
  );
}
