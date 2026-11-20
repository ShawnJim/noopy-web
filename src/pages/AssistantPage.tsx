import { useEffect, useRef, useState } from "react";
import type {
  AccountBalance,
  ChatSessionRecord,
  EconomicEvent,
  IdentityAlias,
  NoopyClient,
  SpendingSummary,
} from "../api/client";

interface ToolTrace {
  name: string;
  ok: boolean;
  securityDecision?: string;
}

interface ProposalNote {
  id: string;
  status: string;
  intent: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools?: ToolTrace[];
  proposals?: ProposalNote[];
  error?: string;
  streaming?: boolean;
  actionEventId?: string;
}

const PROMPTS = [
  "哪些银行卡还没导银行流水（inferred 缺口）？",
  "对比一下个人净支出与家庭/亲情卡净支出",
  "查看自动发现频率最高的跨源商户别名",
  "帮我用 SQL 分析最近消费金额最高的 5 个商户",
];

export function AssistantPage(props: {
  client: NoopyClient;
  isDemo?: boolean;
  spending: SpendingSummary;
  balances: AccountBalance[];
  aliases: IdentityAlias[];
  events: EconomicEvent[];
  onInspectEvent: (eventId: string) => void;
  onGoModels?: () => void;
}) {
  const {
    client,
    isDemo = false,
    spending,
    balances,
    aliases,
    events,
    onInspectEvent,
    onGoModels,
  } = props;

  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const loadSessionMessages = async (sid: string) => {
    try {
      const res = await client.getSessionMessages(sid);
      const parsed: Message[] = [];
      for (const m of res.items) {
        if (m.role === "user") {
          parsed.push({
            id: m.id,
            role: "user",
            text: String(m.content?.text ?? ""),
          });
        } else if (m.role === "assistant") {
          const text = String(m.content?.text ?? "");
          if (text) {
            parsed.push({ id: m.id, role: "assistant", text });
          }
        }
      }
      setMessages(parsed);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (isDemo) {
      setMessages([
        {
          id: "demo_welcome",
          role: "assistant",
          text: `当前处于 Demo Sandbox 模式（${spending.active_event_count} 笔演示事件）。切换到正式模式（VITE_DEMO_MODE=false）并配置模型后，将直接走后端 LLM + 6 个 Ontology 工具实时流式推理。`,
        },
      ]);
      return;
    }

    let active = true;
    client
      .listSessions()
      .then(async (res) => {
        if (!active) return;
        setSessions(res.items);
        const open = res.items.find((s) => s.status === "open") ?? res.items[0];
        if (open) {
          setSessionId(open.id);
          await loadSessionMessages(open.id);
        }
      })
      .catch(() => {
        /* wait for user action or connection banner */
      });
    return () => {
      active = false;
    };
  }, [client, isDemo]);

  const handleNewSession = async () => {
    abortRef.current?.abort();
    setSending(false);
    setMessages([]);
    if (isDemo) {
      setSessionId(null);
      return;
    }
    try {
      const created = await client.createSession();
      setSessionId(created.id);
      setSessions((prev) => [created, ...prev]);
    } catch (err) {
      setMessages([
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: "",
          error: `创建会话失败：${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    }
  };

  const askDemo = (q: string) => {
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text: q };
    let reply = "";
    let actionEventId: string | undefined;

    if (q.includes("缺") || q.includes("inferred") || q.includes("未导")) {
      const inferred = balances
        .filter((b) => b.inferred_leg_count > 0)
        .sort((a, b) => b.inferred_leg_count - a.inferred_leg_count);
      reply =
        inferred.length === 0
          ? "当前所有资金账户均已由权威账单证实，inferred 缺口为 0。"
          : `检测到 ${inferred.length} 个账户存在 inferred 资金腿（共 ${spending.inferred_leg_count} 笔）：\n` +
            inferred
              .slice(0, 6)
              .map((b) => `• ${b.account_id}：${b.inferred_leg_count} 笔（${b.currency} ${Number(b.total_balance).toFixed(2)}）`)
              .join("\n");
    } else if (q.includes("亲情卡") || q.includes("家庭") || q.includes("对比")) {
      reply =
        `三口径净支出汇总（Demo）：\n` +
        `• 仅个人：¥${Number(spending.personal_spending).toFixed(2)}\n` +
        `• 家庭/亲情卡：¥${Number(spending.household_spending).toFixed(2)}（${spending.family_event_count} 笔）\n` +
        `• 全部合并：¥${Number(spending.total_spending).toFixed(2)}`;
    } else if (q.includes("别名") || q.includes("商户")) {
      const top = [...aliases].sort((a, b) => b.hit_count - a.hit_count).slice(0, 6);
      reply =
        `已自动发现 ${aliases.length} 对跨源商户别名（Demo Top 6）：\n` +
        top.map((a) => `• [${a.hit_count}x] ${a.raw_value} ⇔ ${a.target_id}`).join("\n");
    } else {
      const hit = events[0];
      if (hit) {
        actionEventId = hit.id;
        reply = `Demo 模式样本事件「${hit.title}」（${hit.currency} ${Number(hit.amount).toFixed(2)}）。正式模式下这里会由后端大模型调用 ontology_sql_query 实时计算。`;
      } else {
        reply = "当前暂无事件数据。";
      }
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: `a_${Date.now() + 1}`, role: "assistant", text: reply, actionEventId },
    ]);
    setInput("");
  };

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || sending) return;
    if (isDemo) {
      askDemo(q);
      return;
    }

    setInput("");
    setSending(true);
    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now() + 1}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: q },
      { id: assistantMsgId, role: "assistant", text: "", tools: [], proposals: [], streaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let sid = sessionId;
      if (!sid) {
        const created = await client.createSession();
        sid = created.id;
        setSessionId(sid);
        setSessions((prev) => [created, ...prev]);
      }

      await client.streamSessionMessage(
        sid,
        q,
        (eventName, data) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantMsgId) return m;
              if (eventName === "delta") {
                return { ...m, text: m.text + String(data.text ?? "") };
              }
              if (eventName === "tool") {
                const sec = data.security_review as { decision?: string } | undefined;
                const nextTool: ToolTrace = {
                  name: String(data.name ?? "tool"),
                  ok: Boolean(data.ok),
                  securityDecision: sec?.decision,
                };
                return { ...m, tools: [...(m.tools ?? []), nextTool] };
              }
              if (eventName === "proposal") {
                const nextProp: ProposalNote = {
                  id: String(data.id ?? ""),
                  status: String(data.status ?? "pending"),
                  intent: String(data.intent ?? ""),
                };
                return { ...m, proposals: [...(m.proposals ?? []), nextProp] };
              }
              if (eventName === "error") {
                const errText = String(data.message ?? data.error ?? JSON.stringify(data));
                return { ...m, error: errText, streaming: false };
              }
              if (eventName === "done") {
                return { ...m, streaming: false };
              }
              return m;
            }),
          );
        },
        controller.signal,
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, streaming: false } : m)),
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, streaming: false, text: m.text || "（已停止生成）" }
              : m,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  streaming: false,
                  error: err instanceof Error ? err.message : String(err),
                }
              : m,
          ),
        );
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="chat-layout">
      <section className="surface chat-box">
        <div className="surface-header">
          <h2 className="surface-title">Ontology 语义财务助手</h2>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className={`tag ${isDemo ? "tag-inferred" : "tag-accent"}`}>
              {isDemo ? "DEMO SANDBOX" : "LIVE SSE · 6 ONTOLOGY TOOLS"}
            </span>
            <button className="btn" onClick={handleNewSession} disabled={sending}>
              + 新建对话
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ padding: "28px 16px", color: "var(--ink-muted)", fontSize: 13.5 }}>
              已直连后端 Agent 运行时（<code>POST /v1/sessions/&#123;id&#125;/messages</code> · SSE 流式推理）。
              输入任意财务归因、资金缺口、多口径对比或 SQL 分析问题，模型将自动调用 v2 本体工具检索并回答。
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"}`}>
              {m.tools && m.tools.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {m.tools.map((tool, idx) => (
                    <span
                      key={`${tool.name}-${idx}`}
                      className={`tag mono ${tool.ok ? "tag-verified" : "tag-inferred"}`}
                      style={{ fontSize: 11 }}
                    >
                      {tool.ok ? "✓" : "✕"} {tool.name}
                      {tool.securityDecision ? ` · ${tool.securityDecision}` : ""}
                    </span>
                  ))}
                </div>
              )}

              {m.text && <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
              {m.streaming && !m.text && (
                <div style={{ color: "var(--ink-muted)", fontSize: 12.5 }}>
                  模型正在调用本体工具推理中…
                </div>
              )}

              {m.proposals && m.proposals.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {m.proposals.map((p) => (
                    <div key={p.id} className="lineage-evidence" style={{ marginTop: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>已生成账本提案：{p.intent}</strong>
                        <span className="tag tag-accent mono">{p.status}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                        Proposal ID: {p.id}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {m.error && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--sem-warn-soft, #fdf2f2)",
                    color: "var(--sem-warn, #a33)",
                    fontSize: 12.5,
                  }}
                >
                  <div>{m.error}</div>
                  {onGoModels && (
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 8 }}
                      onClick={onGoModels}
                    >
                      前往「模型与 Agent」配置并测试模型 →
                    </button>
                  )}
                </div>
              )}

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
            void ask(input);
          }}
        >
          <input
            className="input"
            placeholder="提问财务归因、资金缺口、合单血缘或 SQL 分析..."
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
          />
          {sending ? (
            <button
              className="btn"
              type="button"
              onClick={() => abortRef.current?.abort()}
            >
              停止
            </button>
          ) : (
            <button className="btn btn-primary" type="submit">
              发送
            </button>
          )}
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
              disabled={sending}
              style={{ justifyContent: "flex-start", textAlign: "left", fontWeight: 500 }}
              onClick={() => void ask(p)}
            >
              {p}
            </button>
          ))}

          {!isDemo && sessions.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 12, color: "var(--ink-muted)" }}>历史会话</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {sessions.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    className={`btn ${s.id === sessionId ? "btn-primary" : ""}`}
                    style={{ justifyContent: "flex-start", fontSize: 12, textAlign: "left" }}
                    onClick={() => {
                      setSessionId(s.id);
                      void loadSessionMessages(s.id);
                    }}
                  >
                    {s.title || `会话 ${s.id.slice(-6)}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-muted)" }}>
            <strong>已挂载的 v2 本体原语：</strong>
            <ul style={{ paddingLeft: 16, margin: "6px 0 0" }}>
              <li className="mono">ontology_spending_and_balances</li>
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
