import { useCallback, useEffect, useState } from "react";
import type {
  AgentRole,
  AgentRoleBinding,
  AgentRoleSettingsView,
  ModelDefinition,
  ModelProtocol,
  NoopyClient,
} from "../api/client";
import { IS_DEMO_MODE } from "../config";

const ROLE_META: Record<AgentRole, { label: string; hint: string }> = {
  chat: {
    label: "Orchestrator · 主对话助手 (chat)",
    hint: "自然语言意图理解、调用 6 个 v2 本体原语与多轮 SSE 回复",
  },
  finance: {
    label: "Analyst · 财务归因子任务 (finance)",
    hint: "7 表 Ontology SQL 跨层血缘下钻、分类与异常波动解释",
  },
  reconcile: {
    label: "Classifier · 后台商户分类 (reconcile)",
    hint: "Rust 求解器归并后，对未知商户语义分类并自动编译规则（唯一支持升级复核模型）",
  },
  review: {
    label: "Guardrail · 安全防注入审核 (review)",
    hint: "独立无工具模型审查 SQL 下钻与提案写入边界",
  },
  subscription: {
    label: "Recurring · 周期订阅复核 (subscription)",
    hint: "判断高频同额扣费候选是否为真实会员订阅",
  },
  summary: {
    label: "Memory · 会话摘要与记忆 (summary)",
    hint: "生成滚动会话摘要与用户偏好记忆卡片",
  },
};

const ALL_ROLES: AgentRole[] = ["chat", "finance", "reconcile", "review", "subscription", "summary"];

const DEFAULT_LIMITS: Record<AgentRole, AgentRoleBinding["limits"]> = {
  chat: { max_steps: 24, timeout_seconds: 180, max_cost: "2", max_tokens: 2048 },
  finance: { max_steps: 10, timeout_seconds: 90, max_cost: "1", max_tokens: 2048 },
  reconcile: { max_steps: 30, timeout_seconds: 600, max_cost: "2", max_tokens: 4096 },
  review: { max_steps: 24, timeout_seconds: 5, max_cost: "0.30", max_tokens: 256 },
  subscription: { max_steps: 1, timeout_seconds: 30, max_cost: "0.30", max_tokens: 2048 },
  summary: { max_steps: 1, timeout_seconds: 60, max_cost: "0.20", max_tokens: 2048 },
};

const PRESET_TEMPLATES: {
  label: string;
  id: string;
  name: string;
  provider: ModelDefinition["provider"];
  protocol: ModelProtocol;
  base_url: string;
  model: string;
  price_in: string;
  price_out: string;
}[] = [
  {
    label: "OpenAI",
    id: "openai-gpt4o",
    name: "OpenAI · GPT-4o",
    provider: "custom",
    protocol: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
    price_in: "18",
    price_out: "72",
  },
  {
    label: "Claude",
    id: "anthropic-claude",
    name: "Anthropic · Claude Sonnet 4",
    provider: "custom",
    protocol: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    price_in: "22",
    price_out: "110",
  },
  {
    label: "Gemini",
    id: "google-gemini",
    name: "Google · Gemini 2.5 Flash",
    provider: "custom",
    protocol: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
    price_in: "1.1",
    price_out: "4.4",
  },
  {
    label: "DeepSeek",
    id: "deepseek-chat",
    name: "DeepSeek · Chat",
    provider: "deepseek",
    protocol: "openai",
    base_url: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    price_in: "2",
    price_out: "8",
  },
  {
    label: "通义千问",
    id: "dashscope-qwen",
    name: "DashScope · Qwen Plus",
    provider: "dashscope",
    protocol: "openai",
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    price_in: "0.8",
    price_out: "2",
  },
  {
    label: "Ollama 本地",
    id: "ollama-local",
    name: "Ollama Local · Qwen2.5",
    provider: "custom",
    protocol: "openai",
    base_url: "http://127.0.0.1:11434/v1",
    model: "qwen2.5:14b",
    price_in: "0",
    price_out: "0",
  },
];

const PROTOCOL_WIRE_HINT: Record<ModelProtocol, string> = {
  openai: "POST {base_url}/chat/completions · Authorization: Bearer <key>",
  anthropic: "POST {base_url}/messages · x-api-key + anthropic-version: 2023-06-01",
  gemini: "POST {base_url}/models/{model}:generateContent · x-goog-api-key",
};

function toBindings(agents?: Record<AgentRole, AgentRoleSettingsView>): AgentRoleBinding[] {
  return ALL_ROLES.map((role) => {
    const src = agents?.[role];
    return {
      role,
      label: ROLE_META[role].label,
      hint: ROLE_META[role].hint,
      model_id: src?.model_id ?? null,
      escalation_model_id: role === "reconcile" ? (src?.escalation_model_id ?? null) : null,
      fallback_model_ids: src?.fallback_model_ids ?? [],
      escalation_fallback_model_ids:
        role === "reconcile" ? (src?.escalation_fallback_model_ids ?? []) : [],
      limits: src?.limits ?? DEFAULT_LIMITS[role],
    };
  });
}

function toWireModel(m: ModelDefinition): ModelDefinition {
  const out: ModelDefinition = {
    id: m.id.trim(),
    name: m.name.trim(),
    provider: m.provider,
    protocol: m.protocol ?? "openai",
    model: m.model.trim(),
    price_input: (m.price_input ?? "0").trim() || "0",
    price_output: (m.price_output ?? "0").trim() || "0",
  };
  if (m.base_url && m.base_url.trim()) {
    out.base_url = m.base_url.trim();
  }
  // 留空时传 null 让后端按同 ID/供应商/地址沿用已有密钥；新建无密钥（如本地 Ollama）传 ""
  if (m.api_key && m.api_key.trim()) {
    out.api_key = m.api_key.trim();
  } else if (m.api_key_set) {
    out.api_key = null;
  } else {
    out.api_key = "";
  }
  return out;
}

export function AgentModelSettingsPage(props: {
  client: NoopyClient;
  isDemo?: boolean;
}) {
  const { client, isDemo = false } = props;

  const [version, setVersion] = useState<number>(0);
  const [source, setSource] = useState<string>(isDemo ? "demo" : "loading");
  const [editable, setEditable] = useState<boolean>(true);
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [bindings, setBindings] = useState<AgentRoleBinding[]>(() => toBindings());

  const [form, setForm] = useState<ModelDefinition>({
    id: "openai-gpt4o",
    name: "OpenAI · GPT-4o",
    provider: "custom",
    protocol: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o",
    api_key: "",
    api_key_set: false,
    api_key_hint: null,
    price_input: "18",
    price_output: "72",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    if (IS_DEMO_MODE && isDemo) {
      const mod = await import("../data/demoOntology");
      setModels(mod.DEMO_MODELS);
      setBindings(toBindings(mod.DEMO_AGENT_BINDINGS));
      setVersion(1);
      setSource("demo");
      setEditable(true);
      setLoading(false);
      return;
    }
    try {
      const view = await client.getModelSettings();
      setVersion(view.version);
      setSource(view.source);
      setEditable(view.editable);
      setModels(view.models);
      setBindings(toBindings(view.agents));
    } catch (err) {
      setSource("error");
      setErrorMsg(`读取后端模型配置失败（GET /v1/model-settings）：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [client, isDemo]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const applyTemplate = (tpl: (typeof PRESET_TEMPLATES)[number]) => {
    const usedIds = new Set(models.map((m) => m.id));
    let id = tpl.id;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${tpl.id}-${n++}`;
    }
    setForm({
      id,
      name: tpl.name,
      provider: tpl.provider,
      protocol: tpl.protocol,
      base_url: tpl.base_url,
      model: tpl.model,
      api_key: "",
      api_key_set: false,
      api_key_hint: null,
      price_input: tpl.price_in,
      price_output: tpl.price_out,
    });
  };

  const editModel = (m: ModelDefinition) => {
    setForm({
      ...m,
      api_key: "",
    });
    setStatusMsg(`正在编辑模型 ${m.id}（密钥输入框留空将保留后端已保存的密钥）`);
    setErrorMsg(null);
  };

  const removeModel = (id: string) => {
    const referenced = bindings.filter(
      (b) =>
        b.model_id === id ||
        b.escalation_model_id === id ||
        b.fallback_model_ids.includes(id) ||
        b.escalation_fallback_model_ids.includes(id),
    );
    if (referenced.length > 0) {
      setErrorMsg(
        `无法移除模型 ${id}：仍被 ${referenced.map((r) => r.role).join(", ")} 引用，请先在下方取消绑定。`,
      );
      return;
    }
    setModels((prev) => prev.filter((m) => m.id !== id));
    setErrorMsg(null);
    setStatusMsg(`已从草稿列表移除 ${id}，请点击「保存并热生效」写入后端。`);
  };

  const addOrUpdateModel = (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.id.trim();
    const modelName = form.model.trim();
    const displayName = form.name.trim() || id;
    if (!id || !modelName) {
      setErrorMsg("模型 ID 和 Model Identifier 不能为空。");
      return;
    }
    const existing = models.find((m) => m.id === id);
    const nextEntry: ModelDefinition = {
      ...form,
      id,
      name: displayName,
      model: modelName,
      api_key_set: Boolean(form.api_key?.trim()) || Boolean(existing?.api_key_set),
      api_key_hint: form.api_key?.trim()
        ? form.api_key.trim().slice(-4)
        : (existing?.api_key_hint ?? null),
    };
    setModels((prev) => {
      const exists = prev.some((m) => m.id === id);
      return exists ? prev.map((m) => (m.id === id ? nextEntry : m)) : [...prev, nextEntry];
    });
    // 如果当前 chat 角色还没有绑定任何模型，自动预选第一个注册的模型减少配置摩擦
    setBindings((prev) =>
      prev.map((b) => (b.role === "chat" && !b.model_id ? { ...b, model_id: id } : b)),
    );
    setErrorMsg(null);
    setStatusMsg(
      `已加入草稿注册表：[${(nextEntry.protocol ?? "openai").toUpperCase()}] ${nextEntry.name}。请点击下方「保存并热生效 (PUT /v1/model-settings)」持久化到 Agent。`,
    );
  };

  const testEndpoint = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    if (isDemo) {
      const proto = form.protocol ?? "openai";
      setStatusMsg(
        `Demo Sandbox · 报文预览 [${proto.toUpperCase()}] ${PROTOCOL_WIRE_HINT[proto].replace("{base_url}", form.base_url ?? "").replace("{model}", form.model)}（正式模式将真实探测模型端）`,
      );
      return;
    }
    setTesting(true);
    try {
      const res = await client.testModelSettings({ model: toWireModel(form) });
      const first = res.results[0];
      if (res.ok) {
        setStatusMsg(
          `✓ 探测通过（${first?.latency_ms ?? 0}ms）· model=${first?.model ?? form.model} · protocol=${(form.protocol ?? "openai").toUpperCase()}`,
        );
      } else {
        setErrorMsg(
          `模型探测失败（${first?.latency_ms ?? 0}ms）：${first?.error ?? JSON.stringify(res)}`,
        );
      }
    } catch (err) {
      setErrorMsg(`探测请求失败（POST /v1/model-settings:test）：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const saveAll = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    if (isDemo) {
      setStatusMsg("Demo Sandbox · 本地草稿已更新（正式模式下会 PUT /v1/model-settings 持久化并热重载）。");
      return;
    }
    setSaving(true);
    try {
      const agentsPayload = Object.fromEntries(
        bindings.map((b) => [
          b.role,
          {
            model_id: b.model_id,
            escalation_model_id: b.role === "reconcile" ? b.escalation_model_id : null,
            fallback_model_ids: b.fallback_model_ids,
            escalation_fallback_model_ids:
              b.role === "reconcile" ? b.escalation_fallback_model_ids : [],
            limits: b.limits,
          },
        ]),
      ) as Parameters<NoopyClient["saveModelSettings"]>[0]["agents"];

      const updated = await client.saveModelSettings({
        version,
        models: models.map(toWireModel),
        agents: agentsPayload,
      });
      setVersion(updated.version);
      setSource(updated.source);
      setEditable(updated.editable);
      setModels(updated.models);
      setBindings(toBindings(updated.agents));
      setStatusMsg(
        `✓ 已持久化并热重载到 Agent 运行时（version=${updated.version}，共 ${updated.models.length} 个模型）。现在可直接前往「语义助手」使用大模型！`,
      );
    } catch (err) {
      setErrorMsg(`保存失败（PUT /v1/model-settings）：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {errorMsg && (
        <section
          className="surface"
          style={{ borderColor: "var(--sem-danger, #9f2d2d)", background: "var(--sem-danger-bg, #fae8e8)" }}
        >
          <div className="surface-body" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ color: "var(--sem-danger, #9f2d2d)", fontSize: 13 }}>{errorMsg}</div>
            <button className="btn" onClick={() => void loadSettings()} disabled={loading}>
              重新读取最新配置
            </button>
          </div>
        </section>
      )}

      {!editable && !isDemo && (
        <section className="surface">
          <div className="surface-body" style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
            当前后端 Agent 未启用可写配置目录（缺少 <code>AGENT_DATA_DIR</code>），页面仅可查看与测试，保存会返回 503。
          </div>
        </section>
      )}

      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Multi-Protocol Model Registry · 多协议模型注册表</h2>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="tag tag-neutral mono">v{version} · {source}</span>
              <button className="btn" onClick={() => void loadSettings()} disabled={loading}>
                {loading ? "读取中..." : "刷新"}
              </button>
            </div>
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 340 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model / ID</th>
                  <th>Protocol · 协议</th>
                  <th>Endpoint & Key</th>
                  <th style={{ textAlign: "right" }}>Pricing / 1M</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {models.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--ink-muted)" }}>
                      暂无已注册模型。请在右侧选择协议模板填写 API Key，点击「加入注册表」后保存生效。
                    </td>
                  </tr>
                ) : (
                  models.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                          {m.id} · {m.provider}
                        </div>
                      </td>
                      <td>
                        <span className="tag tag-accent">{(m.protocol ?? "openai").toUpperCase()}</span>
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>
                        <div>{m.model}</div>
                        <div style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                          {m.base_url || "(preset)"}{" "}
                          {m.api_key_set ? (
                            <span className="tag tag-verified" style={{ marginLeft: 4 }}>
                              Key ····{m.api_key_hint ?? "已设"}
                            </span>
                          ) : (
                            <span className="tag tag-neutral" style={{ marginLeft: 4 }}>
                              No Key
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num-col">
                        ¥{m.price_input ?? "0"} / ¥{m.price_output ?? "0"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn" onClick={() => editModel(m)}>
                            编辑
                          </button>
                          <button className="btn" onClick={() => removeModel(m.id)}>
                            移除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="surface">
          <div className="surface-header">
            <h2 className="surface-title">Connect Protocol · 接入 / 编辑模型端点</h2>
          </div>
          <form
            className="surface-body"
            onSubmit={addOrUpdateModel}
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

            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8 }}>
              <select
                className="input mono"
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value as ModelDefinition["provider"] })
                }
              >
                <option value="custom">custom</option>
                <option value="deepseek">deepseek</option>
                <option value="dashscope">dashscope</option>
                <option value="zhipu">zhipu</option>
              </select>
              <input
                className="input mono"
                placeholder="Base URL (如 https://api.openai.com/v1)"
                value={form.base_url ?? ""}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
            </div>

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
                placeholder={form.api_key_set ? "留空则保留原 Key" : "API Key (Ollama 可空)"}
                value={form.api_key ?? ""}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                className="input mono"
                placeholder="输入单价 ¥/1M (如 2)"
                value={form.price_input ?? "0"}
                onChange={(e) => setForm({ ...form, price_input: e.target.value })}
              />
              <input
                className="input mono"
                placeholder="输出单价 ¥/1M (如 8)"
                value={form.price_output ?? "0"}
                onChange={(e) => setForm({ ...form, price_output: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" type="submit">
                + 加入/更新草稿列表
              </button>
              <button className="btn" type="button" disabled={testing} onClick={() => void testEndpoint()}>
                {testing ? "探测中..." : "真实探测 (:test)"}
              </button>
            </div>
          </form>
        </aside>
      </div>

      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">Agent Role Routing · 6 大角色跨协议路由与故障切换</h2>
          <button
            className="btn btn-primary"
            disabled={saving || (!editable && !isDemo)}
            onClick={() => void saveAll()}
          >
            {saving ? "保存中..." : "保存并热生效 (PUT /v1/model-settings)"}
          </button>
        </div>
        <div className="data-table-wrap" style={{ maxHeight: 400 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Role · 角色</th>
                <th>Primary Model · 主模型</th>
                <th>Fallback / Escalation · 备选或升级</th>
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
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  model_id: val,
                                  fallback_model_ids: val
                                    ? x.fallback_model_ids.filter((fid) => fid !== val)
                                    : [],
                                  escalation_model_id: val ? x.escalation_model_id : null,
                                }
                              : x,
                          ),
                        );
                      }}
                    >
                      <option value="">Deterministic Only (未绑定模型)</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{(m.protocol ?? "openai").toUpperCase()}] {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {b.role === "reconcile" ? (
                      <select
                        className="input mono"
                        disabled={!b.model_id}
                        value={b.escalation_model_id ?? ""}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          setBindings((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, escalation_model_id: val } : x)),
                          );
                        }}
                      >
                        <option value="">无升级复核模型</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            升级 → [{(m.protocol ?? "openai").toUpperCase()}] {m.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="input mono"
                        disabled={!b.model_id}
                        value={b.fallback_model_ids[0] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBindings((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, fallback_model_ids: val ? [val] : [] } : x,
                            ),
                          );
                        }}
                      >
                        <option value="">无故障切换备选</option>
                        {models
                          .filter((m) => m.id !== b.model_id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              备选 → [{(m.protocol ?? "openai").toUpperCase()}] {m.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </td>
                  <td className="mono">{b.limits.max_steps}</td>
                  <td className="mono">{b.limits.timeout_seconds}s</td>
                  <td className="mono">¥{b.limits.max_cost}</td>
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
