import { useMemo, useState } from "react";
import type { AccountBalance, AttributionRuleItem, IdentityAlias } from "../api/client";

type SubTab = "accounts" | "aliases" | "rules" | "ingest";

const BUILTIN_RULES: AttributionRuleItem[] = [
  {
    id: "rule_fusion",
    stage: "stage_1_fusion",
    name: "同源异构导出融合 (platform + external_id)",
    origin: "builtin",
    hits: 331,
    enabled: true,
    description: "合并支付宝新旧导出时间差 1–3 秒导致的重复观测，取信息熵最高记录并保留双份文件血缘。",
  },
  {
    id: "rule_wechat_wallet",
    stage: "stage_2_funding",
    name: "微信「已存入零钱」状态归因",
    origin: "builtin",
    hits: 103,
    enabled: true,
    description: "支付方式为空但状态写明「已存入零钱」的红包/转账/群收款直接归入 BalanceAccount(微信零钱)。",
  },
  {
    id: "rule_combo",
    stage: "stage_2_template",
    name: "多资金腿组合支付解析 (combo_payment)",
    origin: "builtin",
    hits: 1,
    enabled: true,
    description: "将微信多行组合支付拆分为多条 LedgerLeg，并用 ComboPaymentSource 严格校验总金额守恒。",
  },
  {
    id: "rule_family",
    stage: "stage_2_template",
    name: "亲情卡代付口径分离 (payer / beneficiary)",
    origin: "builtin",
    hits: 64,
    enabled: true,
    description: "标记 party:family 支持个人/家庭/全部三口径动态切换，不再错误丢弃 neutral 亲情卡记录。",
  },
  {
    id: "rule_repay_fee",
    stage: "stage_2_template",
    name: "花呗/借呗还款归一 & 零钱提现 0.1% 手续费腿",
    origin: "builtin",
    hits: 25,
    enabled: true,
    description: "将平台 neutral 正数还款/充值符号归一化，自动拆分微信零钱提现手续费进入支出分项。",
  },
  {
    id: "rule_bipartite",
    stage: "stage_3_solver",
    name: "全局最小费用最大二分匹配 + N:1 合单子集和",
    origin: "builtin",
    hits: 1283,
    enabled: true,
    description: "同日优先 + 通道命中 + 保序全局求解，消解 1:N 高频同额歧义并识别 60 秒内电商合单扣款。",
  },
  {
    id: "rule_self_guard",
    stage: "stage_4_guardrail",
    name: "银行退款「本人姓名」防误配护栏",
    origin: "builtin",
    hits: 17,
    enabled: true,
    description: "银行退款对手方为持卡人本人姓名或通用通道占位符时禁止自动冲抵，强制送入证据收件箱。",
  },
];

function fmt(v: string | number) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

export function OntologyPage(props: {
  balances: AccountBalance[];
  aliases: IdentityAlias[];
  verifiedOnly: boolean;
  onRunSolver: () => Promise<string>;
}) {
  const { balances, aliases, verifiedOnly, onRunSolver } = props;
  const [sub, setSub] = useState<SubTab>("accounts");
  const [aliasSearch, setAliasSearch] = useState("");
  const [solverMsg, setSolverMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const filteredAliases = useMemo(() => {
    const q = aliasSearch.trim().toLowerCase();
    return [...aliases]
      .sort((a, b) => b.hit_count - a.hit_count)
      .filter(
        (a) =>
          !q ||
          a.raw_value.toLowerCase().includes(q) ||
          a.target_id.toLowerCase().includes(q),
      );
  }, [aliases, aliasSearch]);

  const handleSolve = async () => {
    setRunning(true);
    try {
      const msg = await onRunSolver();
      setSolverMsg(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="surface">
      <div className="subtabs">
        {(
          [
            ["accounts", `资金账户与载体 (${balances.length})`],
            ["aliases", `跨源商户别名 (${aliases.length})`],
            ["rules", `归因规则 (${BUILTIN_RULES.length})`],
            ["ingest", "账单导入与求解"],
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

      {sub === "accounts" && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>BalanceAccount ID</th>
                <th>币种</th>
                <th style={{ textAlign: "right" }}>已证实余额 (Verified)</th>
                <th style={{ textAlign: "right" }}>含推断总余额 (Total)</th>
                <th>证实状态</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={`${b.account_id}-${b.currency}`}>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {b.account_id}
                  </td>
                  <td className="mono">{b.currency}</td>
                  <td
                    className="num-col"
                    style={{ opacity: verifiedOnly ? 1 : 0.7 }}
                  >
                    {fmt(b.verified_balance)}
                  </td>
                  <td
                    className="num-col"
                    style={{ opacity: verifiedOnly ? 0.55 : 1 }}
                  >
                    {fmt(b.total_balance)}
                  </td>
                  <td>
                    {b.inferred_leg_count > 0 ? (
                      <span className="tag tag-inferred">
                        {b.inferred_leg_count} inferred · 待补导银行 PDF
                      </span>
                    ) : (
                      <span className="tag tag-verified">100% verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sub === "aliases" && (
        <div>
          <div className="toolbar">
            <input
              className="input"
              style={{ flex: "1 1 260px" }}
              placeholder="搜索银行工商主体名或平台品牌（如 小麦 / 嘀嘀 / 赛壹 / 美团）..."
              value={aliasSearch}
              onChange={(e) => setAliasSearch(e.target.value)}
            />
            <span className="tag tag-neutral mono">{filteredAliases.length} pairs</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>银行侧原始主体名（Legal Name）</th>
                  <th>规范本体目标（Party）</th>
                  <th>来源</th>
                  <th style={{ textAlign: "right" }}>命中次数</th>
                </tr>
              </thead>
              <tbody>
                {filteredAliases.map((a) => (
                  <tr key={a.id}>
                    <td>{a.raw_value}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {a.target_id}
                    </td>
                    <td>
                      <span className="tag tag-accent">{a.origin}</span>
                    </td>
                    <td className="num-col">{a.hit_count}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub === "rules" && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>阶段</th>
                <th>规则名称</th>
                <th>说明</th>
                <th style={{ textAlign: "right" }}>实测命中</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {BUILTIN_RULES.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.stage}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: "var(--ink-secondary)" }}>{r.description}</td>
                  <td className="num-col">{r.hits}</td>
                  <td>
                    <span className="tag tag-verified">enabled</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sub === "ingest" && (
        <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lineage-evidence" style={{ marginTop: 0 }}>
            <strong>不可变观测导入 + 全局重物化（POST /v2/observations:batch → /v2/solver/run）</strong>
            <p style={{ color: "var(--ink-secondary)", margin: "6px 0 10px" }}>
              支持随时补导历史银行 PDF（招行储蓄/信用卡、中行、宁波银行）或微信/支付宝账单。求解器会自动合并全量历史观测，校验 6 条内核硬不变量，并将已覆盖的 <code>inferred</code> 资金腿原地升级为 <code>verified</code>。
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={running} onClick={handleSolve}>
                {running ? "正在运行纯 Rust 5 阶段求解器..." : "立即触发重算 (/v2/solver/run)"}
              </button>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
                0 违背门禁 · 事务原子落库 PostgreSQL
              </span>
            </div>
            {solverMsg && (
              <pre className="code-block" style={{ marginTop: 10 }}>
                {solverMsg}
              </pre>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
