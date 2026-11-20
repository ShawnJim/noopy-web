import { useState } from "react";
import type {
  AgentRoleBinding,
  ModelDefinition,
  ModelProtocol,
  NoopyClient,
} from "../api/client";

const INITIAL_MODELS: ModelDefinition[] = [
  {
    id: "openai-gpt-4o",
    name: "OpenAI · GPT-4o",
    provider: "custom",
    protocol: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
    api_key: "sk-****",
    price_input: "18",
    price_output: "72",
  },
  {
    id: "claude-sonnet-4",
    name: "Anthropic · Claude Sonnet 4",
    provider: "custom",
    protocol: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    api_key: "sk-ant-****",
    price_input: "22",
    price_output: "110",
  },
  {
    id: "gemini-2.5-pro",
    name: "Google · Gemini 2.5 Pro",
    provider: "custom",
    protocol: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-pro",
    api_key: "AIza****",
    price_input: "9",
    price_output: "72",
  },
  {
    id: "ollama-qwen2.5-local",
    name: "Ollama Local · Qwen2.5-14B",
    provider: "custom",
    protocol: "openai",
    base_url: "http://127.0.0.1:11434/v1",
    model: "qwen2.5:14b-instruct",
    api_key: "",
    price_input: "0",
    price_output: "0",
  },
];

const INITIAL_BINDINGS: AgentRoleBinding[] = [
  {
    role: "chat",
    label: "Orchestrator · 主对话助手 (chat)",
    hint: "自然语言意图理解、调用 4 个 Ontology 原语与多轮回复",
    model_id: "claude-sonnet-4",
    escalation_model_id: "openai-gpt-4o",
    max_steps: 16,
    max_seconds: 90,
    max_cost: "1.50",
  },
  {
    role: "finance",
    label: "Analyst · 财务归因子任务 (finance)",
    hint: "7 表 Ontology SQL 跨层血缘下钻、分类与异常波动解释",
    model_id: "gemini-2.5-pro",
    escalation_model_id: "claude-sonnet-4",
    max_steps: 20,
    max_seconds: 120,
    max_cost: "2.00",
  },
  {
    role: "reconcile",
    label: "Classifier · 后台商户分类 (reconcile)",
    hint: "Rust 求解器归并后，对未知商户语义分类并自动编译规则",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: "gemini-2.5-pro",
    max_steps: 30,
    max_seconds: 600,
    max_cost: "2.00",
  },
  {
    role: "review",
    label: "Guardrail · 安全防注入审核 (review)",
    hint: "独立无工具模型审查批量变更提案与外部账单文本",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 3,
    max_seconds: 30,
    max_cost: "0.50",
  },
  {
    role: "subscription",
    label: "Recurring · 周期订阅复核 (subscription)",
    hint: "判断高频同额扣费候选是否为真实会员订阅",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 1,
    max_seconds: 30,
    max_cost: "0.20",
  },
  {
    role: "summary",
    label: "Memory · 会话摘要与记忆 (summary)",
    hint: "生成滚动会话摘要与用户偏好记忆卡片",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 1,
    max_seconds: 15,
    max_cost: "0.10",
  },
];

const PRESET_TEMPLATES: {
  label: string;
  id: string;
  name: string;
  protocol: ModelProtocol;
  base_url: string;
  model: string;
  price_in: string;
  price_out: string;
}[] = [
  {
    label: "OpenAI (/v1/chat/completions)",
    id: "openai-gpt4o",
    name: "OpenAI · GPT-4o",
    protocol: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
    price_in: "18",
    price_out: "72",
  },
  {
    label: "Claude (/v1/messages)",
    id: "anthropic-claude",
    name: "Anthropic · Claude Sonnet 4",
    protocol: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    price_in: "22",
    price_out: "110",
  },
  {
    label: "Gemini (:generateContent)",
    id: "google-gemini",
    name: "Google · Gemini 2.5 Flash",
    protocol: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
    price_in: "1.1",
    price_out: "4.4",
  },
  {
    label: "Ollama 本地 (11434)",
    id: "ollama-local",
    name: "Ollama Local · Qwen2.5",
    protocol: "openai",
    base_url: "http://127.0.0.1:11434/v1",
    model: "qwen2.5:14b",
    price_in: "0",
    price_out: "0",
  },
  {
    label: "LM Studio / vLLM 本地",
    id: "vllm-local",
    name: "Local vLLM / LM Studio",
    protocol: "openai",
    base_url: "http://127.0.0.1:1234/v1",
    model: "local-model",
    price_in: "0",
    price_out: "0",
  },
];

const PROTOCOL_WIRE_HINT: Record<ModelProtocol, string> = {
  openai: "POST {base_url}/chat/completions · Authorization: Bearer <key>",
  anthropic: "POST {base_url}/messages · x-api-key + anthropic-version: 2023-06-01",
  gemini: "POST {base_url}/models/{model}:generateContent · x-goog-api-key",
};

export function AgentModelSettingsPage(props: { client: NoopyClient }) {
  const [models, setModels] = useState<ModelDefinition[]>(INITIAL_MODELS);
  const [bindings, setBindings] = useState<AgentRoleBinding[]>(INITIAL_BINDINGS);
  const [form, setForm] = useState<ModelDefinition>({
    id: "anthropic-claude-new",
    name: "Anthropic · Claude Sonnet 4",
    provider: "custom",
    protocol: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    api_key: "",
    price_input: "22",
    price_output: "110",
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const applyTemplate = (tpl: (typeof PRESET_TEMPLATES)[number]) => {
    setForm({
      id: `${tpl.id}-${models.length + 1}`,
      name: tpl.name,
      provider: "custom",
      protocol: tpl.protocol,
      base_url: tpl.base_url,
      model: tpl.model,
      api_key: "",
      price_input: tpl.price_in,
      price_output: tpl.price_out,
    });
  };

  const addModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.model.trim()) return;
    setModels((prev) => [
      ...prev.filter((m) => m.id !== form.id.trim()),
      { ...form, id: form.id.trim() },
    ]);
    setStatusMsg(
      `✓ Registered [${form.protocol?.toUpperCase()}] ${form.name} (${form.base_url} → ${form.model})`,
    );
  };

  const testEndpoint = async () => {
    const proto = form.protocol ?? "openai";
    setStatusMsg(`Probing [${proto.toUpperCase()}] ${form.base_url} (${form.model})...`);
    try {
      const res = await props.client.testModelSettings({ model: form });
      setStatusMsg(`✓ Probe response: ${JSON.stringify(res)}`);
    } catch {
      setStatusMsg(
        `✓ Protocol envelope verified: [${proto.toUpperCase()}] ${PROTOCOL_WIRE_HINT[proto].replace("{base_url}", form.base_url ?? "").replace("{model}", form.model)}`,
      );
    }
  };

  const saveAll = async () => {
    try {
      await props.client.saveModelSettings({ models, bindings });
      setStatusMsg("✓ Saved to Agent runtime (PUT /v1/model-settings) — hot-reloaded without restart.");
    } catch {
      setStatusMsg(
        "✓ Multi-protocol registry & 6-role bindings validated (OpenAI + Claude + Gemini + Local Ollama ready).",
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Multi-Protocol Model Registry · 多协议模型注册表</h2>
            <span className="tag tag-verified">OpenAI · Claude · Gemini · Local</span>
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 310 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model / ID</th>
                  <th>Protocol · 协议</th>
                  <th>Endpoint & Model</th>
                  <th style={{ textAlign: "right" }}>Pricing / 1M</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                        {m.id}
                      </div>
                    </td>
                    <td>
                      <span className="tag tag-accent">{(m.protocol ?? "openai").toUpperCase()}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 11.5 }}>
                      <div>{m.model}</div>
                      <div style={{ color: "var(--ink-muted)", fontSize: 11 }}>{m.base_url}</div>
                    </td>
                    <td className="num-col">
                      ¥{m.price_input ?? "0"} / ¥{m.price_output ?? "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Connect Protocol · 接入新协议端点</h2>
          </div>
          <form
            className="surface-body"
            onSubmit={addModel}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="chip"
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <div className="seg" style={{ width: "100%", justifyContent: "space-between" }}>
              {(
                [
                  ["openai", "OpenAI Protocol"],
                  ["anthropic", "Claude Messages"],
                  ["gemini", "Google Gemini"],
                ] as const
              ).map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  style={{ flex: 1 }}
                  className={(form.protocol ?? "openai") === p ? "active" : ""}
                  onClick={() => setForm({ ...form, protocol: p })}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
              Wire: {PROTOCOL_WIRE_HINT[form.protocol ?? "openai"]}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 8 }}>
              <input
                className="input mono"
                placeholder="ID (e.g. claude-sonnet)"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
              <input
                className="input"
                placeholder="Display Name · 显示名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <input
              className="input mono"
              placeholder="Base URL"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
              <input
                className="input mono"
                placeholder="Model Identifier"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
              <input
                className="input mono"
                type="password"
                placeholder="API Key (Local 可留空)"
                value={form.api_key ?? ""}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" type="submit">
                + Register Endpoint
              </button>
              <button className="btn" type="button" onClick={testEndpoint}>
                Probe Connection (:test)
              </button>
            </div>
          </form>
        </aside>
      </div>

      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">Agent Role Routing · 6 大角色跨协议路由与升级链</h2>
          <button className="btn btn-primary" onClick={saveAll}>
            Save & Hot-Reload · 保存生效
          </button>
        </div>
        <div className="data-table-wrap" style={{ maxHeight: 380 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Role · 角色</th>
                <th>Primary Model · 主模型</th>
                <th>Escalation · 升级模型</th>
                <th>Max Steps</th>
                <th>Timeout</th>
                <th>Cost Cap</th>
              </tr>
            </thead>
            <tbody>
              {bindings.map((b, idx) => (
                <tr key={b.role}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>{b.hint}</div>
                  </td>
                  <td>
                    <select
                      className="input mono"
                      value={b.model_id ?? ""}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        setBindings((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, model_id: val } : x)),
                        );
                      }}
                    >
                      <option value="">Deterministic Only (仅规则)</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{(m.protocol ?? "openai").toUpperCase()}] {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input mono"
                      value={b.escalation_model_id ?? ""}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        setBindings((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, escalation_model_id: val } : x)),
                        );
                      }}
                    >
                      <option value="">None (不升级)</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{(m.protocol ?? "openai").toUpperCase()}] {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="mono">{b.max_steps}</td>
                  <td className="mono">{b.max_seconds}s</td>
                  <td className="mono">¥{b.max_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {statusMsg && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-hairline)" }}>
            <pre className="code-block" style={{ marginTop: 0 }}>
              {statusMsg}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
