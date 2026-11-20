import { useEffect, useState } from "react";
import type {
  SubscriptionCandidate,
  SubscriptionCycle,
  SubscriptionItem,
} from "../api/client";

const CYCLE_MONTHLY_FACTOR: Record<SubscriptionCycle, number> = {
  week: 52 / 12,
  month: 1,
  quarter: 1 / 3,
  year: 1 / 12,
};

export function SubscriptionsPage(props: {
  initialSubscriptions?: SubscriptionItem[];
  initialCandidates?: SubscriptionCandidate[];
  isDemo?: boolean;
  onCreateSubscription?: (input: {
    name: string;
    merchant?: string;
    amount: string;
    currency: string;
    cycle: SubscriptionCycle;
    next_charge_on: string;
    account_id?: string | null;
    category_id?: string | null;
    detected_by: "user" | "agent";
  }) => Promise<void>;
  onToggleStatus?: (sub: SubscriptionItem, nextStatus: "active" | "paused") => Promise<void>;
}) {
  const { isDemo = false, onCreateSubscription, onToggleStatus } = props;
  const [subs, setSubs] = useState<SubscriptionItem[]>(props.initialSubscriptions ?? []);
  const [candidates, setCandidates] = useState<SubscriptionCandidate[]>(
    props.initialCandidates ?? [],
  );
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<SubscriptionCycle>("month");
  const [nextDate, setNextDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSubs(props.initialSubscriptions ?? []);
  }, [props.initialSubscriptions]);

  useEffect(() => {
    setCandidates(props.initialCandidates ?? []);
  }, [props.initialCandidates]);

  const monthlyTotal = subs
    .filter((s) => s.status === "active")
    .reduce(
      (acc, s) =>
        acc +
        (s.monthly_amount
          ? Number(s.monthly_amount)
          : Number(s.amount) * CYCLE_MONTHLY_FACTOR[s.cycle]),
      0,
    );
  const yearlyTotal = monthlyTotal * 12;

  const confirmCandidate = async (cand: SubscriptionCandidate, idx: number) => {
    const label = cand.name || cand.title || cand.merchant || "周期订阅";
    const subCycle = cand.cycle ?? "month";
    const nextOn = cand.next_charge_on || cand.last_on;
    setErrorMsg(null);

    if (isDemo || !onCreateSubscription) {
      setSubs((prev) => [
        ...prev,
        {
          id: `sub_${Date.now()}`,
          name: label,
          merchant: cand.merchant ?? label,
          amount: Number(cand.amount).toFixed(2),
          currency: cand.currency ?? "CNY",
          cycle: subCycle,
          next_charge_on: nextOn,
          status: "active",
        },
      ]);
      setCandidates((prev) => prev.filter((_, i) => i !== idx));
      return;
    }

    setBusy(true);
    try {
      await onCreateSubscription({
        name: label,
        merchant: cand.merchant ?? label,
        amount: Number(cand.amount).toFixed(2),
        currency: cand.currency ?? "CNY",
        cycle: subCycle,
        next_charge_on: nextOn,
        account_id: cand.account_id ?? null,
        category_id: cand.category_id ?? null,
        detected_by: "agent",
      });
      setCandidates((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      setErrorMsg(`提交订阅提案失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const num = Number(amount);
    if (!trimmed || !Number.isFinite(num) || num <= 0) {
      setErrorMsg("请填写有效的订阅名称与大于 0 的金额。");
      return;
    }
    setErrorMsg(null);
    const formattedAmount = num.toFixed(2);

    if (isDemo || !onCreateSubscription) {
      setSubs((prev) => [
        ...prev,
        {
          id: `sub_${Date.now()}`,
          name: trimmed,
          amount: formattedAmount,
          currency: "CNY",
          cycle,
          next_charge_on: nextDate,
          status: "active",
        },
      ]);
      setName("");
      setAmount("");
      return;
    }

    setBusy(true);
    try {
      await onCreateSubscription({
        name: trimmed,
        merchant: trimmed,
        amount: formattedAmount,
        currency: "CNY",
        cycle,
        next_charge_on: nextDate,
        detected_by: "user",
      });
      setName("");
      setAmount("");
    } catch (err) {
      setErrorMsg(`创建订阅提案失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (s: SubscriptionItem) => {
    const nextStatus = s.status === "active" ? "paused" : "active";
    setErrorMsg(null);
    if (isDemo || !onToggleStatus) {
      setSubs((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, status: nextStatus } : item)),
      );
      return;
    }
    setBusy(true);
    try {
      await onToggleStatus(s, nextStatus);
    } catch (err) {
      setErrorMsg(`更新订阅状态失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {errorMsg && (
        <section
          className="surface"
          style={{ borderColor: "var(--sem-danger, #9f2d2d)", background: "var(--sem-danger-bg, #fae8e8)" }}
        >
          <div className="surface-body" style={{ color: "var(--sem-danger, #9f2d2d)", fontSize: 13 }}>
            {errorMsg}
          </div>
        </section>
      )}

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
                {subs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--ink-muted)" }}>
                      暂无已登记订阅。可在下方手工提交订阅提案，或从右侧账单候选中一键纳入。
                    </td>
                  </tr>
                ) : (
                  subs.map((s) => (
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
                      <td className="mono">{s.upcoming_on ?? s.next_charge_on}</td>
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
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() => void handleToggle(s)}
                        >
                          {s.status === "active" ? "暂停" : "恢复"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={(e) => void addManual(e)}
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
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "提交中..." : "+ 新建订阅提案"}
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
              candidates.map((c, idx) => {
                const label = c.name || c.title || c.merchant || "未命名周期扣费";
                const count = c.count ?? c.charges ?? 0;
                return (
                  <div key={`${c.key ?? label}-${c.amount}`} className="lineage-evidence" style={{ marginTop: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{label}</strong>
                      <span className="mono" style={{ fontWeight: 700 }}>
                        ¥{Number(c.amount).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", margin: "4px 0 8px" }}>
                      {c.cycle ? `周期 ${c.cycle} · ` : ""}
                      共扣费 {count} 次 · 最近一次 {c.last_on}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => void confirmCandidate(c, idx)}
                      >
                        纳入订阅管理
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          setCandidates((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        非订阅忽略
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
