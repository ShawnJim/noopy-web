import type {
  AccountFlowItem,
  MerchantRankItem,
  MonthlyReportPoint,
  SpendingScope,
  SpendingSummary,
} from "../api/client";

const DEMO_MONTHLY: MonthlyReportPoint[] = [
  { month: "2025-11", personal: "4820.40", household: "310.00", income: "18500.00", count: 162 },
  { month: "2025-12", personal: "6190.80", household: "520.00", income: "18500.00", count: 198 },
  { month: "2026-01", personal: "7450.20", household: "890.50", income: "24200.00", count: 215 },
  { month: "2026-02", personal: "5320.10", household: "640.00", income: "18500.00", count: 149 },
  { month: "2026-03", personal: "4980.65", household: "415.20", income: "18500.00", count: 176 },
  { month: "2026-04", personal: "5610.30", household: "480.00", income: "18900.00", count: 184 },
  { month: "2026-05", personal: "6240.90", household: "560.40", income: "18500.00", count: 203 },
  { month: "2026-06", personal: "5890.00", household: "712.80", income: "19100.00", count: 194 },
  { month: "2026-07", personal: "6430.55", household: "635.00", income: "18500.00", count: 221 },
  { month: "2026-08", personal: "5740.20", household: "490.00", income: "18500.00", count: 189 },
  { month: "2026-09", personal: "5180.45", household: "530.60", income: "18500.00", count: 177 },
  { month: "2026-10", personal: "6085.12", household: "618.90", income: "19800.00", count: 212 },
];

const DEMO_MERCHANTS: MerchantRankItem[] = [
  { name: "山东高速信联科技股份有限公司 (ETC)", amount: "2946.80", count: 99 },
  { name: "万物云（万科物业母公司）", amount: "2680.00", count: 95 },
  { name: "特来电新能源", amount: "2180.50", count: 23 },
  { name: "美团 / 北京三快在线", amount: "1960.40", count: 48 },
  { name: "滴滴出行", amount: "1420.30", count: 19 },
  { name: "湖南联通", amount: "1080.00", count: 54 },
  { name: "iCloud 由云上贵州运营", amount: "816.00", count: 12 },
  { name: "24H便利购 (武汉小麦便利)", amount: "642.50", count: 93 },
];

const DEMO_ACCOUNTS: AccountFlowItem[] = [
  { account_id: "acct:card_2667", name: "中国银行储蓄卡(2667)", outflow: "38420.50", inflow: "142000.00", verified: 967, inferred: 0 },
  { account_id: "acct:card_8300", name: "宁波银行储蓄卡(8300)", outflow: "19240.80", inflow: "46500.00", verified: 494, inferred: 0 },
  { account_id: "acct:card_4755", name: "招商银行储蓄卡(4755)", outflow: "14810.20", inflow: "32000.00", verified: 325, inferred: 0 },
  { account_id: "acct:wechat_wallet", name: "微信零钱", outflow: "11250.40", inflow: "9840.00", verified: 757, inferred: 0 },
  { account_id: "acct:card_6333", name: "工商银行储蓄卡(6333)", outflow: "6840.30", inflow: "0.00", verified: 0, inferred: 151 },
  { account_id: "acct:card_7662", name: "上海银行信用卡(7662)", outflow: "4120.00", inflow: "0.00", verified: 0, inferred: 80 },
];

const fmt = (v: string | number) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : String(v));

export function ReportsPage(props: {
  scope: SpendingScope;
  spending: SpendingSummary;
  monthly?: MonthlyReportPoint[];
  merchants?: MerchantRankItem[];
  accountFlows?: AccountFlowItem[];
}) {
  const { scope, spending } = props;
  const monthly = props.monthly && props.monthly.length > 0 ? props.monthly : DEMO_MONTHLY;
  const merchants = props.merchants && props.merchants.length > 0 ? props.merchants : DEMO_MERCHANTS;
  const flows = props.accountFlows && props.accountFlows.length > 0 ? props.accountFlows : DEMO_ACCOUNTS;

  const seriesVal = (m: MonthlyReportPoint) =>
    scope === "personal"
      ? Number(m.personal)
      : scope === "household"
        ? Number(m.household)
        : Number(m.personal) + Number(m.household);

  const maxSpend = Math.max(1, ...monthly.map(seriesVal));
  const maxMerch = Math.max(1, ...merchants.map((m) => Number(m.amount)));

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
            {monthly[0]?.month} ~ {monthly[monthly.length - 1]?.month}
          </div>
        </div>
      </section>

      {/* Monthly Bar Chart */}
      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">
            月度净支出趋势（{scope === "all" ? "个人 + 亲情卡堆叠" : scope === "personal" ? "仅个人" : "仅家庭/亲情卡"}）
          </h2>
          <span className="tag tag-neutral mono">v_net_spending</span>
        </div>
        <div className="surface-body">
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
            {monthly.map((m) => {
              const p = Number(m.personal);
              const h = Number(m.household);
              const val = seriesVal(m);
              const pct = Math.max(3, Math.round((val / maxSpend) * 135));
              const hPct = scope === "all" && val > 0 ? Math.round((h / val) * pct) : 0;
              const pPct = pct - hPct;
              return (
                <div
                  key={m.month}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
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
        </div>
      </section>

      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Top 商户 / 主体消费排行（已跨源归一）</h2>
          </div>
          <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {merchants.slice(0, 10).map((m) => {
              const w = Math.max(2, Math.round((Number(m.amount) / maxMerch) * 100));
              return (
                <div key={m.name}>
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
            })}
          </div>
        </section>

        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">资金账户收支归因分布（Verified vs Inferred）</h2>
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 360 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>资金账户</th>
                  <th style={{ textAlign: "right" }}>消费流出</th>
                  <th style={{ textAlign: "right" }}>收入流入</th>
                  <th>血缘状态</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((a) => (
                  <tr key={a.account_id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td className="num-col">¥{fmt(a.outflow)}</td>
                    <td className="num-col">¥{fmt(a.inflow)}</td>
                    <td>
                      {a.inferred > 0 ? (
                        <span className="tag tag-inferred">{a.inferred} inferred</span>
                      ) : (
                        <span className="tag tag-verified">{a.verified} verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
