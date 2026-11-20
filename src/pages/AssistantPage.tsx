import { useState } from "react";
import type {
  AccountBalance,
  EconomicEvent,
  IdentityAlias,
  SpendingSummary,
} from "../api/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  actionEventId?: string;
}

const PROMPTS = [
  "哪些银行卡还没导银行流水（inferred 缺口）？",
  "对比一下个人净支出与家庭/亲情卡净支出",
  "查看自动发现频率最高的跨源商户别名",
  "查一下合单支付或组合支付的典型样本",
];

export function AssistantPage(props: {
  spending: SpendingSummary;
  balances: AccountBalance[];
  aliases: IdentityAlias[];
  events: EconomicEvent[];
  onInspectEvent: (eventId: string) => void;
}) {
  const { spending, balances, aliases, events, onInspectEvent } = props;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "assistant",
      text: `已连接 Noopy v2 Ontology 语义层（当前共 ${spending.active_event_count} 笔有效经济事件，${spending.verified_leg_count} 条已证实资金腿，${spending.inferred_leg_count} 条推断资金腿）。你可以直接用自然语言做跨层级归因下钻。`,
    },
  ]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text: q };

    let reply = "";
    let actionEventId: string | undefined;

    if (q.includes("缺") || q.includes("inferred") || q.includes("未导")) {
      const inferred = balances
        .filter((b) => b.inferred_leg_count > 0)
        .sort((a, b) => b.inferred_leg_count - a.inferred_leg_count);
      reply =
        inferred.length === 0
          ? "当前所有资金账户均已由权威银行/平台余额账单证实，inferred 缺口为 0。"
          : `检测到 ${inferred.length} 个账户存在未导入银行流水的 inferred 资金腿（共 ${spending.inferred_leg_count} 笔）：\n` +
            inferred
              .slice(0, 6)
              .map((b) => `• ${b.account_id}：${b.inferred_leg_count} 笔（含推断余额 ${b.currency} ${Number(b.total_balance).toFixed(2)}）`)
              .join("\n") +
            "\n补导对应银行 PDF 后，求解器将自动原位升级为 verified，无需作废重建交易。";
    } else if (q.includes("亲情卡") || q.includes("家庭") || q.includes("对比")) {
      reply =
        `当前账本三口径净支出汇总：\n` +
        `• 仅个人口径：¥${Number(spending.personal_spending).toFixed(2)}\n` +
        `• 仅家庭/亲情卡口径：¥${Number(spending.household_spending).toFixed(2)}（共 ${spending.family_event_count} 笔）\n` +
        `• 全部合并口径：¥${Number(spending.total_spending).toFixed(2)}\n` +
        `可通过顶栏口径切换器在「账本与血缘」空间实时切换明细。`;
    } else if (q.includes("别名") || q.includes("商户")) {
      const top = [...aliases].sort((a, b) => b.hit_count - a.hit_count).slice(0, 6);
      reply =
        `系统已通过 1:1 证实匹配自动沉淀 ${aliases.length} 对跨源商户别名（银行工商主体 ⇔ 平台品牌），高频 Top 6：\n` +
        top.map((a) => `• [${a.hit_count}x] ${a.raw_value} ⇔ ${a.target_id}`).join("\n");
    } else {
      const hit =
        events.find((e) => e.title.includes("桂林") || e.title.includes("合单") || e.title.includes("组合")) ??
        events[0];
      if (hit) {
        actionEventId = hit.id;
        reply = `找到典型多源归因事件「${hit.title}」（${hit.currency} ${Number(hit.amount).toFixed(2)}，ID: ${hit.id}）。点击下方按钮可直接跳转到「账本与血缘」检视完整的 Attribution Lineage Tree。`;
      } else {
        reply = "当前没有可检视的事件，请先在「导入与本体」导入账单并运行求解器。";
      }
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: `a_${Date.now() + 1}`, role: "assistant", text: reply, actionEventId },
    ]);
    setInput("");
  };

  return (
    <div className="chat-layout">
      <section className="surface chat-box">
        <div className="surface-header">
          <h2 className="surface-title">Ontology 语义财务助手</h2>
          <span className="tag tag-accent">4 Ontology Primitives + 7-Table SQL</span>
        </div>
        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"}`}>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
              {m.actionEventId && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => onInspectEvent(m.actionEventId!)}
                  >
                    在账本中检视归因血缘树 →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            className="input"
            placeholder="提问财务归因、资金缺口、合单血缘或跨口径对比..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            发送
          </button>
        </form>
      </section>

      <aside className="surface">
        <div className="surface-header">
          <h2 className="surface-title">快捷归因指令</h2>
        </div>
        <div className="surface-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              className="btn"
              style={{ justifyContent: "flex-start", textAlign: "left", fontWeight: 500 }}
              onClick={() => ask(p)}
            >
              {p}
            </button>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-muted)" }}>
            <strong>可用 Ontology 原语：</strong>
            <ul style={{ paddingLeft: 16, margin: "6px 0 0" }}>
              <li className="mono">ontology_query_objects</li>
              <li className="mono">ontology_traverse_links</li>
              <li className="mono">ontology_explain_attribution</li>
              <li className="mono">ontology_sql_query (7 tables)</li>
              <li className="mono">ontology_propose_action</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
