import type {
  AccountFlowItem,
  CategoryStatItem,
  MerchantRankItem,
  MonthlyReportPoint,
  SpendingScope,
  SpendingSummary,
} from "../api/client";

const fmt = (v: string | number) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : String(v));

export function ReportsPage(props: {
  scope: SpendingScope;
  spending: SpendingSummary;
  monthly?: MonthlyReportPoint[];
  merchants?: MerchantRankItem[];
  categories?: CategoryStatItem[];
  accountFlows?: AccountFlowItem[];
  onGoImport?: () => void;
}) {
  const { scope, spending, onGoImport } = props;
  const monthly = props.monthly ?? [];
  const merchants = props.merchants ?? [];
  const categories = props.categories ?? [];
  const flows = props.accountFlows ?? [];

  const seriesVal = (m: MonthlyReportPoint) =>
    scope === "personal"
      ? Number(m.personal)
      : scope === "household"
        ? Number(m.household)
        : Number(m.personal) + Number(m.household);

  const maxSpend = Math.max(1, ...monthly.map(seriesVal));
  const maxMerch = Math.max(1, ...merchants.map((m) => Number(m.amount)));
  const maxCat = Math.max(1, ...categories.map((c) => Math.abs(Number(c.amount))));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="metric-strip">
        <div className="metric-cell">
          <div className="metric-label">累计净支出 ({scope.toUpperCase()})</div>
          <div className="metric-value">¥{fmt(spending.net_spending)}</div>
          <div className="metric-sub">已自动剔除内部转账、还款本金并冲抵退款</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">个人独立消费</div>
          <div className="metric-value">¥{fmt(spending.personal_spending)}</div>
          <div className="metric-sub">payer = party:self</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">家庭 / 亲情卡代付</div>
          <div className="metric-value">¥{fmt(spending.household_spending)}</div>
          <div className="metric-sub">共 {spending.family_event_count} 笔亲情卡事件</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">统计覆盖月份</div>
          <div className="metric-value">{monthly.length} 个月</div>
          <div className="metric-sub">
            {monthly.length > 0
              ? `${monthly[0]?.month} ~ ${monthly[monthly.length - 1]?.month}`
              : "暂无账单数据"}
          </div>
        </div>
      </section>

      {/* Monthly Bar Chart (Full-Dataset Backend Aggregation) */}
      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">
            月度净支出趋势（{scope === "all" ? "个人 + 亲情卡堆叠" : scope === "personal" ? "仅个人" : "仅家庭/亲情卡"}）
          </h2>
          <span className="tag tag-neutral mono">/v2/ontology/stats/monthly</span>
        </div>
        <div className="surface-body">
          {monthly.length === 0 ? (
            <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--ink-muted)" }}>
              <div>暂无月度统计数据，请先导入支付宝 / 微信 / 银行账单（Worker 解析后将自动触发求解器）。</div>
              {onGoImport && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onGoImport}>
                  前往导入账单
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${monthly.length}, minmax(42px, 1fr))`,
                gap: 8,
                alignItems: "end",
                height: 190,
                paddingTop: 18,
                overflowX: "auto",
              }}
            >
              {monthly.map((m, idx) => {
                const p = Number(m.personal);
                const h = Number(m.household);
                const val = seriesVal(m);
                const pct = Math.max(3, Math.round((val / maxSpend) * 135));
                const hPct = scope === "all" && val > 0 ? Math.round((h / val) * pct) : 0;
                const pPct = pct - hPct;
                return (
                  <div
                    key={m.month}
                    className="bar-col"
                    style={{
                      animationDelay: `${idx * 0.03}s`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>
                      ¥{Math.round(val)}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 34,
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: "4px 4px 0 0",
                        overflow: "hidden",
                      }}
                      title={`${m.month}: 个人 ¥${fmt(p)} / 家庭 ¥${fmt(h)} / 收入 ¥${fmt(m.income)}`}
                    >
                      {hPct > 0 && (
                        <div style={{ height: hPct, background: "var(--sem-family)" }} />
                      )}
                      <div
                        style={{
                          height: Math.max(2, pPct),
                          background: scope === "household" ? "var(--sem-family)" : "var(--accent)",
                        }}
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-secondary)" }}>
                      {m.month.slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Top 商户 / 主体消费排行（全量跨源归一）</h2>
            <span className="tag tag-neutral mono">/stats/merchants</span>
          </div>
          <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {merchants.length === 0 ? (
              <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>暂无商户消费统计。</div>
            ) : (
              merchants.slice(0, 10).map((m) => {
                const w = Math.max(2, Math.round((Number(m.amount) / maxMerch) * 100));
                return (
                  <div key={m.party_id ?? m.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ fontWeight: 500 }}>
                        {m.name}{" "}
                        <span className="mono" style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                          ({m.count}笔)
                        </span>
                      </span>
                      <span className="mono" style={{ fontWeight: 600 }}>
                        ¥{fmt(m.amount)}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">分类净支出构成（Allocations）</h2>
            <span className="tag tag-neutral mono">/stats/categories</span>
          </div>
          <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.length === 0 ? (
              <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
                暂无分类支出汇总。导入账单后可在「归因血缘」中手动指定或由助手分类。
              </div>
            ) : (
              categories.slice(0, 10).map((c) => {
                const w = Math.max(2, Math.round((Math.abs(Number(c.amount)) / maxCat) * 100));
                return (
                  <div key={c.category_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ fontWeight: 500 }}>
                        {c.category_name}{" "}
                        <span className="mono" style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                          ({c.count}笔)
                        </span>
                      </span>
                      <span className="mono" style={{ fontWeight: 600 }}>
                        ¥{fmt(c.amount)}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">资金账户收支归因分布（Verified vs Inferred）</h2>
          <span className="tag tag-neutral mono">/v2/ontology/balances</span>
        </div>
        <div className="data-table-wrap" style={{ maxHeight: 340 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>资金账户</th>
                <th style={{ textAlign: "right" }}>累计流出</th>
                <th style={{ textAlign: "right" }}>累计流入</th>
                <th>血缘证实态</th>
              </tr>
            </thead>
            <tbody>
              {flows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "var(--ink-muted)", textAlign: "center", padding: 20 }}>
                    暂无资金账户流水数据。
                  </td>
                </tr>
              ) : (
                flows.map((a) => (
                  <tr key={a.account_id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td className="num-col">¥{fmt(a.outflow)}</td>
                    <td className="num-col">¥{fmt(a.inflow)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {a.verified > 0 && (
                          <span className="tag tag-verified">{a.verified} verified</span>
                        )}
                        {a.inferred > 0 && (
                          <span className="tag tag-inferred">{a.inferred} inferred</span>
                        )}
                        {a.verified === 0 && a.inferred === 0 && (
                          <span className="tag tag-neutral">0 legs</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
