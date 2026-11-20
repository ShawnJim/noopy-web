import { useEffect, useMemo, useState } from "react";
import {
  OntologyClient,
  type AccountBalance,
  type AttributionLineageTree,
  type EconomicEvent,
  type IdentityAlias,
  type ReviewItem,
  type SpendingScope,
  type SpendingSummary,
} from "./api/ontology";
import {
  computeDemoSpending,
  DEMO_ALIASES,
  DEMO_BALANCES,
  DEMO_EVENTS,
  DEMO_LINEAGES,
  DEMO_REVIEWS,
} from "./data/demoOntology";
import "./styles.css";

type Tab = "workbench" | "inbox" | "ontology";

const client = new OntologyClient();

export function App() {
  const [tab, setTab] = useState<Tab>("workbench");
  const [scope, setScope] = useState<SpendingScope>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"live" | "demo">("demo");

  const [events, setEvents] = useState<EconomicEvent[]>(DEMO_EVENTS);
  const [balances, setBalances] = useState<AccountBalance[]>(DEMO_BALANCES);
  const [aliases, setAliases] = useState<IdentityAlias[]>(DEMO_ALIASES);
  const [reviews, setReviews] = useState<ReviewItem[]>(DEMO_REVIEWS);
  const [spending, setSpending] = useState<SpendingSummary>(() => computeDemoSpending("all"));
  const [selectedId, setSelectedId] = useState<string>(DEMO_EVENTS[0].id);
  const [lineage, setLineage] = useState<AttributionLineageTree | null>(
    DEMO_LINEAGES[DEMO_EVENTS[0].id] ?? null,
  );

  // 尝试连接 /v2/ontology/* 后端（自动使用开发账号登录拿会话令牌）；未启动时回退到脱敏演示模式
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cached = window.localStorage.getItem("noopy_v2_token");
        if (cached) {
          client.setToken(cached);
        } else {
          const tok = await client.login("owner@noopy.local", "noopy-dev-password");
          window.localStorage.setItem("noopy_v2_token", tok);
        }
        const [sp, bal, evs, rev, als] = await Promise.all([
          client.getSpendingSummary(scope),
          client.getBalances(),
          client.queryObjects<EconomicEvent>({ object_type: "economic_event", scope, limit: 200 }),
          client.getReviewInbox(),
          client.queryObjects<IdentityAlias>({ object_type: "identity_alias", limit: 200 }),
        ]);
        if (!active) return;
        setMode("live");
        setSpending(sp);
        setBalances(bal.items);
        setEvents(evs.items);
        setReviews(rev.items);
        setAliases(als.items);
        if (evs.items.length > 0 && !evs.items.some((e) => e.id === selectedId)) {
          setSelectedId(evs.items[0].id);
        }
      } catch {
        // 若旧 token 失效，清掉后重试一次登录
        if (window.localStorage.getItem("noopy_v2_token")) {
          window.localStorage.removeItem("noopy_v2_token");
          try {
            const tok = await client.login("owner@noopy.local", "noopy-dev-password");
            window.localStorage.setItem("noopy_v2_token", tok);
            const [sp, bal, evs, rev, als] = await Promise.all([
              client.getSpendingSummary(scope),
              client.getBalances(),
              client.queryObjects<EconomicEvent>({
                object_type: "economic_event",
                scope,
                limit: 200,
              }),
              client.getReviewInbox(),
              client.queryObjects<IdentityAlias>({ object_type: "identity_alias", limit: 200 }),
            ]);
            if (!active) return;
            setMode("live");
            setSpending(sp);
            setBalances(bal.items);
            setEvents(evs.items);
            setReviews(rev.items);
            setAliases(als.items);
            if (evs.items.length > 0) setSelectedId(evs.items[0].id);
            return;
          } catch {
            /* fall through to demo */
          }
        }
        if (!active) return;
        setMode("demo");
        setSpending(computeDemoSpending(scope));
        setBalances(DEMO_BALANCES);
        setEvents(DEMO_EVENTS);
        setReviews(DEMO_REVIEWS);
        setAliases(DEMO_ALIASES);
      }
    })();
    return () => {
      active = false;
    };
  }, [scope]);

  // 加载选中事件的 Attribution Lineage Tree
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

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const isFamily =
        e.payer_party_id === "party:family" || e.beneficiary_party_id === "party:family";
      if (scope === "personal" && isFamily) return false;
      if (scope === "household" && !isFamily) return false;
      if (q && !e.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, scope, search]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Noopy v2 · Ontology Ledger</h1>
          <span className={`pill ${mode === "live" ? "pill-verified" : "pill-accent"}`}>
            {mode === "live" ? "Live /v2 API" : "Demo 演示模式"}
          </span>
        </div>

        <div className="controls">
          <div className="segmented" role="group" aria-label="亲情卡口径切换">
            {(
              [
                ["all", "全部口径"],
                ["personal", "仅个人"],
                ["household", "仅家庭/亲情卡"],
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

          <div className="segmented" role="group" aria-label="余额证实口径">
            <button
              className={!verifiedOnly ? "active" : ""}
              onClick={() => setVerifiedOnly(false)}
            >
              含推断余额
            </button>
            <button className={verifiedOnly ? "active" : ""} onClick={() => setVerifiedOnly(true)}>
              仅已证实余额
            </button>
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            当前口径净支出（{scope === "all" ? "全部" : scope === "personal" ? "个人" : "家庭"}）
          </div>
          <div className="kpi-value">¥{spending.net_spending}</div>
          <div className="kpi-sub">
            个人 ¥{spending.personal_spending} · 家庭 ¥{spending.household_spending}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">已证实资金腿（Verified）</div>
          <div className="kpi-value">{spending.verified_leg_count}</div>
          <div className="kpi-sub">银行/余额权威账单 100% 守恒</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">平台推断资金腿（Inferred）</div>
          <div className="kpi-value">{spending.inferred_leg_count}</div>
          <div className="kpi-sub">补导对应银行 PDF 后自动原位升级</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">证据收件箱待确认</div>
          <div className="kpi-value">{reviews.length}</div>
          <div className="kpi-sub">护栏拦截项 · 防止误配</div>
        </div>
      </section>

      <nav className="tabs">
        <button
          className={`tab-btn ${tab === "workbench" ? "active" : ""}`}
          onClick={() => setTab("workbench")}
        >
          归因工作台 ({filteredEvents.length})
        </button>
        <button
          className={`tab-btn ${tab === "inbox" ? "active" : ""}`}
          onClick={() => setTab("inbox")}
        >
          证据收件箱 ({reviews.length})
        </button>
        <button
          className={`tab-btn ${tab === "ontology" ? "active" : ""}`}
          onClick={() => setTab("ontology")}
        >
          本体管理 · 账户与别名 ({aliases.length})
        </button>
      </nav>

      {tab === "workbench" && (
        <section className="split-pane">
          <div className="panel">
            <h2>经济事件流（EconomicEvent）</h2>
            <input
              className="search-input"
              placeholder="搜索商户、商品、合单或组合支付..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filteredEvents.map((ev) => {
              const isFam =
                ev.payer_party_id === "party:family" || ev.beneficiary_party_id === "party:family";
              return (
                <div
                  key={ev.id}
                  className={`event-row ${selectedId === ev.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(ev.id)}
                >
                  <div>
                    <div className="event-title">{ev.title}</div>
                    <div className="event-meta">
                      <span>{ev.occurred_at.slice(0, 16).replace("T", " ")}</span>
                      <span className="pill pill-accent">{ev.kind}</span>
                      {isFam && <span className="pill pill-family">亲情卡</span>}
                    </div>
                  </div>
                  <div className="amount">
                    {ev.currency} {ev.amount}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h2>归因血缘树（Attribution Lineage Tree）</h2>
            {!lineage ? (
              <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
                点击左侧合单支付或组合支付事件，查看从经济事件 → 资金腿 → 原始账单文件与求解证据因子的完整归因链。
              </p>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{lineage.event.title}</div>
                <div className="event-meta" style={{ marginBottom: 12 }}>
                  <span>事件 ID: {lineage.event.id}</span>
                  <span>
                    金额: {lineage.event.currency} {lineage.event.amount}
                  </span>
                </div>

                {lineage.legs.map((item) => (
                  <div key={item.leg.id} className="lineage-box">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>
                        资金腿 · {item.account_name} ({item.leg.role})
                      </strong>
                      <span
                        className={`pill ${
                          item.leg.verification_state === "verified"
                            ? "pill-verified"
                            : "pill-inferred"
                        }`}
                      >
                        {item.leg.verification_state}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
                      变动金额：{item.leg.amount} {item.leg.currency}
                    </div>

                    {item.evidences.map((ev) => (
                      <div key={ev.link.id} className="evidence-card">
                        <div>
                          <strong>证据角色：{ev.link.role}</strong> · 置信度 {ev.link.confidence}
                        </div>
                        {ev.observation && (
                          <div style={{ marginTop: 4, color: "var(--ink-muted)" }}>
                            来源：{ev.observation.source}（{ev.observation.artifact_file ?? "—"}）
                            <br />
                            原始金额：{ev.observation.amount} · 对手方：
                            {ev.observation.raw_counterparty ?? "—"}
                            {ev.observation.raw_memo ? ` · 备注：${ev.observation.raw_memo}` : ""}
                          </div>
                        )}
                        <pre className="trace-code">
                          {JSON.stringify(ev.link.attribution_trace, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "inbox" && (
        <section className="panel">
          <h2>证据收件箱（护栏拦截与低置信度项）</h2>
          {reviews.length === 0 ? (
            <p style={{ color: "var(--ink-muted)" }}>当前没有待人工确认的归因项。</p>
          ) : (
            reviews.map((item, idx) => (
              <div key={idx} className="evidence-card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <span className="pill pill-inferred">{item.kind}</span>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>{item.reason}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <button
                      className="btn-sm primary"
                      onClick={() => setReviews((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      确认并沉淀规则
                    </button>
                    <button
                      className="btn-sm"
                      onClick={() => setReviews((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      忽略
                    </button>
                  </div>
                </div>
                <pre className="trace-code">{JSON.stringify(item.evidence, null, 2)}</pre>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "ontology" && (
        <section className="split-pane">
          <div className="panel">
            <h2>资金账户（BalanceAccount · 双口径余额）</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>账户</th>
                  <th>当前展示余额</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={`${b.account_id}-${b.currency}`}>
                    <td>{b.account_id}</td>
                    <td className="amount">
                      {b.currency} {verifiedOnly ? b.verified_balance : b.total_balance}
                    </td>
                    <td>
                      {b.inferred_leg_count > 0 ? (
                        <span className="pill pill-inferred">
                          含 {b.inferred_leg_count} 笔待补导银行PDF
                        </span>
                      ) : (
                        <span className="pill pill-verified">已全部证实</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>自动发现的跨源商户别名（IdentityAlias）</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>银行工商主体名</th>
                  <th>规范本体目标</th>
                  <th>命中次数</th>
                </tr>
              </thead>
              <tbody>
                {aliases.map((a) => (
                  <tr key={a.id}>
                    <td>{a.raw_value}</td>
                    <td>{a.target_id}</td>
                    <td>{a.hit_count}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
