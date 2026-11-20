import { useEffect, useState } from "react";
import type {
  AttributionLineageTree,
  CategoryRecord,
  EconomicEvent,
  SpendingScope,
  SpendingSummary,
} from "../api/client";

const QUICK_FILTERS = ["", "美团", "滴滴", "超市", "咖啡", "高铁", "话费"];

function fmt(v: string | number) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

export function LedgerPage(props: {
  events: EconomicEvent[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  spending: SpendingSummary;
  scope: SpendingScope;
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  lineage: AttributionLineageTree | null;
  categories: CategoryRecord[];
  onSetEventCategory?: (eventId: string, categoryId: string) => Promise<void>;
}) {
  const {
    events,
    totalCount,
    page,
    pageSize,
    onPageChange,
    spending,
    scope,
    search,
    onSearchChange,
    selectedId,
    onSelect,
    lineage,
    categories,
    onSetEventCategory,
  } = props;

  const currentCatId = lineage?.allocations?.[0]?.category_id ?? "";
  const [selectedCat, setSelectedCat] = useState(currentCatId);
  const [savingCat, setSavingCat] = useState(false);
  const [catFeedback, setCatFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCat(lineage?.allocations?.[0]?.category_id ?? "");
    setCatFeedback(null);
  }, [lineage?.event?.id, lineage?.allocations?.[0]?.category_id]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const curNet =
    scope === "personal"
      ? spending.personal_spending
      : scope === "household"
        ? spending.household_spending
        : spending.total_spending;

  const handleSaveCategory = async () => {
    if (!lineage || !selectedCat || !onSetEventCategory) return;
    setSavingCat(true);
    setCatFeedback(null);
    try {
      await onSetEventCategory(lineage.event.id, selectedCat);
      setCatFeedback("✓ 分类已持久化（重跑求解器后自动保留）");
    } catch (err) {
      setCatFeedback(`✕ 保存失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <div>
      <section className="metric-strip">
        <div className="metric-cell">
          <div className="metric-label">
            净支出（{scope === "all" ? "ALL" : scope === "personal" ? "PERSONAL" : "HOUSEHOLD"}）
          </div>
          <div className="metric-value">¥{fmt(curNet)}</div>
          <div className="metric-sub">
            个人 ¥{fmt(spending.personal_spending)} / 家庭 ¥{fmt(spending.household_spending)}
          </div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">VERIFIED LEGS</div>
          <div className="metric-value">{spending.verified_leg_count}</div>
          <div className="metric-sub">银行/余额权威账单 100% 守恒</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">INFERRED LEGS</div>
          <div className="metric-value">{spending.inferred_leg_count}</div>
          <div className="metric-sub">未导银行 PDF · 补导后原位升级</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">ACTIVE EVENTS</div>
          <div className="metric-value">{spending.active_event_count}</div>
          <div className="metric-sub">含 {spending.family_event_count} 笔亲情卡事件</div>
        </div>
      </section>

      <section className="split-workbench">
        <div className="surface">
          <div className="toolbar">
            <input
              className="input"
              style={{ flex: "1 1 220px" }}
              placeholder="按商户、商品、合单或事件 ID 后端检索..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="chip-row">
              {QUICK_FILTERS.map((kw) => (
                <button
                  key={kw || "all"}
                  className={`chip ${search === kw ? "active" : ""}`}
                  onClick={() => onSearchChange(kw)}
                >
                  {kw || "全部"}
                </button>
              ))}
            </div>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>经济事件（EconomicEvent）</th>
                  <th>类型 / 口径</th>
                  <th style={{ textAlign: "right" }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 28, color: "var(--ink-muted)" }}>
                      未检索到匹配的经济事件。
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => {
                    const isFam =
                      ev.payer_party_id === "party:family" ||
                      ev.beneficiary_party_id === "party:family";
                    return (
                      <tr
                        key={ev.id}
                        className={selectedId === ev.id ? "selected" : ""}
                        onClick={() => onSelect(ev.id)}
                      >
                        <td className="mono" style={{ color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                          {ev.occurred_at.slice(0, 16).replace("T", " ")}
                        </td>
                        <td style={{ fontWeight: 500 }}>{ev.title}</td>
                        <td>
                          <span className="tag tag-neutral" style={{ marginRight: 4 }}>
                            {ev.kind}
                          </span>
                          {isFam && <span className="tag tag-family">family</span>}
                        </td>
                        <td className="num-col">
                          {ev.currency} {fmt(ev.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderTop: "1px solid var(--border-hairline)",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            <span className="mono">
              共 {totalCount} 笔匹配 · 第 {page + 1} / {totalPages} 页
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn"
                disabled={page <= 0}
                onClick={() => onPageChange(Math.max(0, page - 1))}
              >
                ← 上一页
              </button>
              <button
                className="btn"
                disabled={page + 1 >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              >
                下一页 →
              </button>
            </div>
          </div>
        </div>

        <aside className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Attribution Lineage Inspector</h2>
            {lineage && <span className="tag tag-accent mono">{lineage.event.id}</span>}
          </div>
          <div className="surface-body">
            {!lineage ? (
              <div style={{ color: "var(--ink-muted)", fontSize: 12.5 }}>
                点击左侧表格任意经济事件，检视从 EconomicEvent → LedgerLeg → ObservationLink → 原始账单文件与求解证据因子的完整归因血缘树。
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{lineage.event.title}</div>
                <div
                  className="mono"
                  style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 4 }}
                >
                  {lineage.event.currency} {fmt(lineage.event.amount)} · kind={lineage.event.kind} ·
                  payer={lineage.event.payer_party_id ?? "—"}
                </div>

                {categories.length > 0 && onSetEventCategory && (
                  <div
                    className="lineage-evidence"
                    style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <div className="metric-label">分类归属（Allocation）</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <select
                        className="input"
                        style={{ flex: 1 }}
                        value={selectedCat}
                        onChange={(e) => setSelectedCat(e.target.value)}
                      >
                        <option value="">选择分类...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.kind}] {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary"
                        disabled={savingCat || !selectedCat || selectedCat === currentCatId}
                        onClick={() => void handleSaveCategory()}
                      >
                        {savingCat ? "保存中..." : "保存分类"}
                      </button>
                    </div>
                    {catFeedback && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-secondary)" }}>
                        {catFeedback}
                      </div>
                    )}
                  </div>
                )}

                {lineage.legs.map((item) => (
                  <div key={item.leg.id} className="lineage-node">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: 12.5 }}>
                        {item.account_name} · <span className="mono">{item.leg.role}</span>
                      </strong>
                      <span
                        className={`tag ${
                          item.leg.verification_state === "verified"
                            ? "tag-verified"
                            : "tag-inferred"
                        }`}
                      >
                        {item.leg.verification_state}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: "var(--ink-secondary)", marginTop: 2 }}>
                      leg_amount: {fmt(item.leg.amount)} {item.leg.currency}
                    </div>

                    {item.evidences.map((ev) => (
                      <div key={ev.link.id} className="lineage-evidence">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <strong>{ev.link.role}</strong>
                          <span className="mono" style={{ color: "var(--ink-muted)" }}>
                            conf={ev.link.confidence}
                          </span>
                        </div>
                        {ev.observation && (
                          <div style={{ color: "var(--ink-secondary)", marginTop: 4 }}>
                            <span className="mono">{ev.observation.source}</span> · 原始金额{" "}
                            <span className="mono">{fmt(ev.observation.amount)}</span>
                            <br />
                            对手方：{ev.observation.raw_counterparty ?? "—"}
                            {ev.observation.raw_memo ? ` · ${ev.observation.raw_memo}` : ""}
                          </div>
                        )}
                        <pre className="code-block">
                          {JSON.stringify(ev.link.attribution_trace, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ))}

                {lineage.matched_aliases.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="metric-label" style={{ marginBottom: 6 }}>
                      Matched IdentityAlias
                    </div>
                    {lineage.matched_aliases.map((a) => (
                      <div key={a.id} className="lineage-evidence">
                        <span className="mono">{a.raw_value}</span> ⇔ <strong>{a.target_id}</strong>{" "}
                        <span className="tag tag-neutral">{a.hit_count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
