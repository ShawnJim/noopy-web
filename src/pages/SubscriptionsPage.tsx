import { useState } from "react";
import type {
  SubscriptionCandidate,
  SubscriptionCycle,
  SubscriptionItem,
} from "../api/client";

const INITIAL_SUBS: SubscriptionItem[] = [
  {
    id: "sub_icloud",
    name: "iCloud+ 200GB（云上贵州）",
    merchant: "iCloud 由云上贵州运营",
    amount: "68.00",
    currency: "CNY",
    cycle: "month",
    next_charge_on: "2026-11-15",
    status: "active",
    flag: null,
  },
  {
    id: "sub_unicom",
    name: "湖南联通手机月租充值",
    merchant: "湖南联通",
    amount: "20.00",
    currency: "CNY",
    cycle: "month",
    next_charge_on: "2026-11-28",
    status: "active",
    flag: null,
  },
  {
    id: "sub_gcloud",
    name: "Google Cloud / AI 服务",
    merchant: "GOOGLE *CLOUD",
    amount: "69.34",
    currency: "CNY",
    cycle: "month",
    next_charge_on: "2026-12-10",
    status: "active",
    flag: "汇率浮动 ±1.20",
  },
];

const INITIAL_CANDIDATES: SubscriptionCandidate[] = [
  { title: "万物云（万科物业母公司）", amount: "10.00", months: 9, charges: 95, last_on: "2026-10-28" },
  { title: "特来电新能源（固定定额充）", amount: "100.00", months: 5, charges: 23, last_on: "2026-08-22" },
  { title: "山东高速信联科技 (ETC固定通勤段)", amount: "38.00", months: 5, charges: 77, last_on: "2026-10-30" },
];

const CYCLE_MONTHLY_FACTOR: Record<SubscriptionCycle, number> = {
  week: 52 / 12,
  month: 1,
  quarter: 1 / 3,
  year: 1 / 12,
};

export function SubscriptionsPage(props: {
  initialCandidates?: SubscriptionCandidate[];
}) {
  const [subs, setSubs] = useState<SubscriptionItem[]>(INITIAL_SUBS);
  const [candidates, setCandidates] = useState<SubscriptionCandidate[]>(
    props.initialCandidates && props.initialCandidates.length > 0
      ? props.initialCandidates
      : INITIAL_CANDIDATES,
  );
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<SubscriptionCycle>("month");
  const [nextDate, setNextDate] = useState("2026-12-01");

  const monthlyTotal = subs
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + Number(s.amount) * CYCLE_MONTHLY_FACTOR[s.cycle], 0);
  const yearlyTotal = monthlyTotal * 12;

  const confirmCandidate = (cand: SubscriptionCandidate, idx: number) => {
    setSubs((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}`,
        name: cand.title,
        merchant: cand.title,
        amount: Number(cand.amount).toFixed(2),
        currency: "CNY",
        cycle: "month",
        next_charge_on: cand.last_on,
        status: "active",
      },
    ]);
    setCandidates((prev) => prev.filter((_, i) => i !== idx));
  };

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !Number(amount)) return;
    setSubs((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}`,
        name: name.trim(),
        amount: Number(amount).toFixed(2),
        currency: "CNY",
        cycle,
        next_charge_on: nextDate,
        status: "active",
      },
    ]);
    setName("");
    setAmount("");
  };

  const toggleStatus = (id: string) => {
    setSubs((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s,
      ),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="metric-strip">
        <div className="metric-cell">
          <div className="metric-label">生效中订阅数</div>
          <div className="metric-value">{subs.filter((s) => s.status === "active").length}</div>
          <div className="metric-sub">总登记 {subs.length} 项</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">折合月度固定支出</div>
          <div className="metric-value">¥{monthlyTotal.toFixed(2)}</div>
          <div className="metric-sub">按周/月/季/年自动折算</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">折合年度固定支出</div>
          <div className="metric-value">¥{yearlyTotal.toFixed(2)}</div>
          <div className="metric-sub">年度固定现金流承诺</div>
        </div>
        <div className="metric-cell">
          <div className="metric-label">账单自动识别候选</div>
          <div className="metric-value">{candidates.length}</div>
          <div className="metric-sub">GET /v1/subscriptions:detect</div>
        </div>
      </section>

      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">已管理周期订阅（/v1/subscriptions）</h2>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>订阅名称</th>
                  <th>周期</th>
                  <th>下次扣费日</th>
                  <th style={{ textAlign: "right" }}>每期金额</th>
                  <th>状态 / 操作</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      {s.flag && (
                        <span className="tag tag-inferred" style={{ marginTop: 2 }}>
                          {s.flag}
                        </span>
                      )}
                    </td>
                    <td className="mono">{s.cycle}</td>
                    <td className="mono">{s.next_charge_on}</td>
                    <td className="num-col">
                      {s.currency} {s.amount}
                    </td>
                    <td>
                      <span
                        className={`tag ${s.status === "active" ? "tag-verified" : "tag-neutral"}`}
                        style={{ marginRight: 6 }}
                      >
                        {s.status}
                      </span>
                      <button className="btn" onClick={() => toggleStatus(s.id)}>
                        {s.status === "active" ? "暂停" : "恢复"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={addManual}
            style={{
              borderTop: "1px solid var(--border-hairline)",
              padding: "10px 14px",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              className="input"
              placeholder="新增订阅名称（如 ChatGPT Plus）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input mono"
              style={{ width: 100 }}
              placeholder="金额"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              className="input"
              value={cycle}
              onChange={(e) => setCycle(e.target.value as SubscriptionCycle)}
            >
              <option value="month">每月 (month)</option>
              <option value="year">每年 (year)</option>
              <option value="quarter">每季 (quarter)</option>
              <option value="week">每周 (week)</option>
            </select>
            <input
              className="input mono"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              + 新建订阅提案
            </button>
          </form>
        </section>

        <aside className="surface">
          <div className="surface-header">
            <h2 className="surface-title">从真实账单检测到的周期扣费候选</h2>
          </div>
          <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {candidates.length === 0 ? (
              <div style={{ color: "var(--ink-muted)" }}>所有检测到的周期规律均已处理。</div>
            ) : (
              candidates.map((c, idx) => (
                <div key={`${c.title}-${c.amount}`} className="lineage-evidence" style={{ marginTop: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{c.title}</strong>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      ¥{Number(c.amount).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", margin: "4px 0 8px" }}>
                    跨 {c.months} 个月共扣费 {c.charges} 次 · 最近一次 {c.last_on}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => confirmCandidate(c, idx)}
                    >
                      纳入订阅管理
                    </button>
                    <button
                      className="btn"
                      onClick={() =>
                        setCandidates((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      非订阅忽略
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
