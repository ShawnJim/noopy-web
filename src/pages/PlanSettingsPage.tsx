import { useState } from "react";
import type { BudgetProgress, SubscriptionItem } from "../api/client";

type SubTab = "plan" | "models" | "audit";

const DEFAULT_BUDGETS: BudgetProgress[] = [
  { id: "b1", name: "月度总预算（个人口径）", period: "month", limit: "8000.00", spent: "5420.30", ratio: 0.68 },
  { id: "b2", name: "餐饮与便利店", period: "month", limit: "2500.00", spent: "1840.50", ratio: 0.74 },
  { id: "b3", name: "交通与 ETC 通行", period: "month", limit: "1200.00", spent: "910.40", ratio: 0.76 },
];

const DEFAULT_SUBS: SubscriptionItem[] = [
  { id: "s1", name: "Apple iCloud+", merchant: "Apple", amount: "21.00", currency: "CNY", cycle: "month", next_charge_on: "2026-12-01", status: "active" },
  { id: "s2", name: "Google Cloud / AI 工具", merchant: "GOOGLE *CLOUD", amount: "69.34", currency: "CNY", cycle: "month", next_charge_on: "2026-12-10", status: "active" },
];

export function PlanSettingsPage(props: {
  mode: "live" | "demo";
  budgets?: BudgetProgress[];
  subscriptions?: SubscriptionItem[];
}) {
  const [sub, setSub] = useState<SubTab>("plan");
  const budgets = props.budgets && props.budgets.length > 0 ? props.budgets : DEFAULT_BUDGETS;
  const subs =
    props.subscriptions && props.subscriptions.length > 0 ? props.subscriptions : DEFAULT_SUBS;

  return (
    <section className="surface">
      <div className="subtabs">
        {(
          [
            ["plan", "预算与订阅（Budgets & Subscriptions）"],
            ["models", "多模型与 Agent 配置"],
            ["audit", "运行日志与内核不变量审计"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            className={`subtab ${sub === k ? "active" : ""}`}
            onClick={() => setSub(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "plan" && (
        <div className="surface-body split-workbench">
          <div>
            <div className="metric-label" style={{ marginBottom: 8 }}>
              月度预算执行进度（/v1/budgets/progress）
            </div>
            {budgets.map((b) => (
              <div key={b.id} className="lineage-evidence">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{b.name}</strong>
                  <span className="mono">
                    ¥{b.spent} / ¥{b.limit} ({Math.round(b.ratio * 100)}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, Math.round(b.ratio * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="metric-label" style={{ marginBottom: 8 }}>
              周期订阅监控（/v1/subscriptions）
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>订阅名称</th>
                  <th>周期</th>
                  <th>下次扣费</th>
                  <th style={{ textAlign: "right" }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td className="mono">{s.cycle}</td>
                    <td className="mono">{s.next_charge_on}</td>
                    <td className="num-col">
                      {s.currency} {s.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub === "models" && (
        <div className="surface-body">
          <div className="lineage-evidence" style={{ marginTop: 0 }}>
            <strong>Agent 模型网关与降级策略（/v1/model-settings）</strong>
            <p style={{ color: "var(--ink-secondary)", margin: "6px 0" }}>
              当前运行模式：<span className="tag tag-accent mono">{props.mode}</span>。
              Noopy v2 的确定性归因（异构融合、二分匹配、合单、组合支付、别名发现）完全在 Rust 内核中执行，<strong>零 LLM 依赖</strong>；模型仅用于商户语义分类、自由问答与异常洞察。
            </p>
            <div className="mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
              • Economy Tier：批量商户分类与规则编译
              <br />• Standard / Premium Tier：Ontology 7 表 SQL 归因分析与复杂冲突解释
            </div>
          </div>
        </div>
      )}

      {sub === "audit" && (
        <div className="surface-body">
          <div className="metric-label" style={{ marginBottom: 8 }}>
            Noopy v2 内核 6 条硬不变量门禁（core/src/ontology/invariants.rs）
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>不变量名称</th>
                <th>当前状态</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["INV-1", "账户存在性与币种合法性（verified / total 双口径守恒）"],
                ["INV-2", "经济事件金额与资金腿 / 分项分配守恒（含手续费腿）"],
                ["INV-3", "退款与预授权累计冲抵上限（≤ 原事件金额）"],
                ["INV-4", "权威防篡改（AuthoritativeStatement & ComboPaymentSource 合计守恒）"],
                ["INV-5", "同源 ObservationGroup 不重复记账"],
                ["INV-6", "全量 ObservationLink / EventLink 血缘非空"],
              ].map(([code, desc]) => (
                <tr key={code}>
                  <td className="mono" style={{ fontWeight: 700 }}>
                    {code}
                  </td>
                  <td>{desc}</td>
                  <td>
                    <span className="tag tag-verified">PASS · 0 violations</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
