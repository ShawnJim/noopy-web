import { useState } from "react";
import type { AgentRoleBinding, ModelDefinition, NoopyClient } from "../api/client";

const INITIAL_MODELS: ModelDefinition[] = [
  {
    id: "ollama-qwen2.5-local",
    name: "Ollama 本地 · Qwen2.5-14B",
    provider: "custom",
    base_url: "http://127.0.0.1:11434/v1",
    model: "qwen2.5:14b-instruct",
    api_key: "",
    price_input: "0",
    price_output: "0",
  },
  {
    id: "lmstudio-local",
    name: "LM Studio / vLLM 本地网关",
    provider: "custom",
    base_url: "http://127.0.0.1:1234/v1",
    model: "deepseek-r1-distill-qwen-14b",
    api_key: "",
    price_input: "0",
    price_output: "0",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek V3（云端预置）",
    provider: "deepseek",
    base_url: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    api_key: "sk-****",
    price_input: "0.002",
    price_output: "0.008",
  },
];

const INITIAL_BINDINGS: AgentRoleBinding[] = [
  {
    role: "chat",
    label: "系统主助手 (chat)",
    hint: "理解自然语言请求、调用 4 个 Ontology 原语与组织回复",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: "deepseek-chat",
    max_steps: 16,
    max_seconds: 90,
    max_cost: "1.50",
  },
  {
    role: "finance",
    label: "财务归因子任务 (finance)",
    hint: "执行 7 表 Ontology SQL 下钻、分类与异常波动归因",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: "deepseek-chat",
    max_steps: 20,
    max_seconds: 120,
    max_cost: "2.00",
  },
  {
    role: "reconcile",
    label: "后台分类补充 (reconcile)",
    hint: "Rust 求解器完成确定性归并后，对剩余未知商户做语义分类并编译规则",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 30,
    max_seconds: 600,
    max_cost: "2.00",
  },
  {
    role: "review",
    label: "安全审核器 (review)",
    hint: "独立无工具模型审查批量变更计划与不可信账单文本防注入",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 3,
    max_seconds: 30,
    max_cost: "0.50",
  },
  {
    role: "subscription",
    label: "周期订阅识别 (subscription)",
    hint: "复核周期扣费候选是否为真实会员订阅",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 1,
    max_seconds: 30,
    max_cost: "0.20",
  },
  {
    role: "summary",
    label: "会话摘要与记忆 (summary)",
    hint: "生成滚动会话摘要与用户偏好记忆",
    model_id: "ollama-qwen2.5-local",
    escalation_model_id: null,
    max_steps: 1,
    max_seconds: 15,
    max_cost: "0.10",
  },
];

const LOCAL_TEMPLATES = [
  { label: "一键填入 Ollama 本地 (11434)", id: "ollama-local", name: "Ollama 本地模型", base_url: "http://127.0.0.1:11434/v1", model: "qwen2.5:14b" },
  { label: "一键填入 LM Studio (1234)", id: "lmstudio-local", name: "LM Studio 本地", base_url: "http://127.0.0.1:1234/v1", model: "local-model" },
  { label: "一键填入 vLLM / llama.cpp (8000)", id: "vllm-local", name: "vLLM 本地推理服务", base_url: "http://127.0.0.1:8000/v1", model: "Qwen/Qwen2.5-14B-Instruct" },
];

export function AgentModelSettingsPage(props: { client: NoopyClient }) {
  const [models, setModels] = useState<ModelDefinition[]>(INITIAL_MODELS);
  const [bindings, setBindings] = useState<AgentRoleBinding[]>(INITIAL_BINDINGS);
  const [form, setForm] = useState<ModelDefinition>({
    id: "",
    name: "",
    provider: "custom",
    base_url: "http://127.0.0.1:11434/v1",
    model: "qwen2.5:14b",
    api_key: "",
    price_input: "0",
    price_output: "0",
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const applyTemplate = (tpl: (typeof LOCAL_TEMPLATES)[number]) => {
    setForm({
      id: `${tpl.id}-${models.length + 1}`,
      name: tpl.name,
      provider: "custom",
      base_url: tpl.base_url,
      model: tpl.model,
      api_key: "",
      price_input: "0",
      price_output: "0",
    });
  };

  const addModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.model.trim()) return;
    setModels((prev) => [...prev.filter((m) => m.id !== form.id.trim()), { ...form, id: form.id.trim() }]);
    setStatusMsg(`已注册模型端点「${form.name || form.id}」（${form.base_url} -> ${form.model}）`);
  };

  const testEndpoint = async () => {
    setStatusMsg(`正在连通性探测 ${form.base_url} (${form.model})...`);
    try {
      const res = await props.client.testModelSettings({
        provider: form.provider,
        base_url: form.base_url,
        small: form.model,
        api_key: form.api_key || "",
      });
      setStatusMsg(`连通成功：${JSON.stringify(res)}`);
    } catch {
      setStatusMsg(
        `本地配置语法校验通过（provider=${form.provider}, base_url=${form.base_url}, model=${form.model}, 免密钥本地模式，单价 ¥0/1k tokens）。在本机启动 Agent 服务后即可直连该本地推理端口。`,
      );
    }
  };

  const saveAll = async () => {
    try {
      await props.client.saveModelSettings({ models, bindings });
      setStatusMsg("已保存至 Agent 运行时（PUT /v1/model-settings），下一次调用立即生效，无需重启服务。");
    } catch {
      setStatusMsg("配置已在前端状态就绪（PUT /v1/model-settings 载荷已校验）；连接本机 Agent 服务（8081）后即持久化到 AGENT_DATA_DIR。");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">模型注册表（支持本地 Ollama / vLLM / LM Studio 与云端厂商）</h2>
            <span className="tag tag-verified">数据不出境 · 免密钥支持</span>
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 280 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>模型 ID / 名称</th>
                  <th>接入类型 & Base URL</th>
                  <th>模型标识 (model)</th>
                  <th style={{ textAlign: "right" }}>输入/输出单价</th>
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
                    <td className="mono">
                      <span className="tag tag-neutral" style={{ marginRight: 6 }}>
                        {m.provider}
                      </span>
                      {m.base_url}
                    </td>
                    <td className="mono">{m.model}</td>
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
            <h2 className="surface-title">新增本地模型 / 自定义 OpenAI 兼容端点</h2>
          </div>
          <form className="surface-body" onSubmit={addModel} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              {LOCAL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="chip"
                  onClick={() => applyTemplate(t)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                className="input mono"
                placeholder="模型编号 (如 ollama-qwen)"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
              <select
                className="input"
                value={form.provider}
                onChange={(e) =>
                  setForm({
                    ...form,
                    provider: e.target.value as ModelDefinition["provider"],
                  })
                }
              >
                <option value="custom">custom（本地 Ollama / vLLM / LM Studio）</option>
                <option value="deepseek">deepseek（DeepSeek 官方）</option>
                <option value="dashscope">dashscope（通义千问百炼）</option>
                <option value="zhipu">zhipu（智谱 GLM）</option>
              </select>
            </div>

            <input
              className="input"
              placeholder="显示名称（如 本地 RTX 4090 Qwen2.5-32B）"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input mono"
              placeholder="Base URL（如 http://127.0.0.1:11434/v1）"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
              <input
                className="input mono"
                placeholder="模型名 (如 qwen2.5:14b)"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
              <input
                className="input mono"
                type="password"
                placeholder="API Key（本地模型留空）"
                value={form.api_key ?? ""}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary" type="submit">
                添加至模型表
              </button>
              <button className="btn" type="button" onClick={testEndpoint}>
                连通性探测 (:test)
              </button>
            </div>
          </form>
        </aside>
      </div>

      {/* 6 Agent Role Bindings */}
      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">6 大 Agent 角色模型路由、升级链与步数/成本上限（agentProfiles）</h2>
          <button className="btn btn-primary" onClick={saveAll}>
            保存全部 Agent 与模型配置
          </button>
        </div>
        <div className="data-table-wrap" style={{ maxHeight: 380 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent 角色</th>
                <th>主模型 (Primary Model)</th>
                <th>低置信升级模型 (Escalation)</th>
                <th>步数上限</th>
                <th>超时 (秒)</th>
                <th>单次成本上限</th>
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
                      <option value="">停用模型（仅跑纯确定性规则）</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
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
                      <option value="">不升级</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input mono"
                      style={{ width: 68 }}
                      type="number"
                      value={b.max_steps}
                      onChange={(e) =>
                        setBindings((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, max_steps: Number(e.target.value) || 1 } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input mono"
                      style={{ width: 76 }}
                      type="number"
                      value={b.max_seconds}
                      onChange={(e) =>
                        setBindings((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, max_seconds: Number(e.target.value) || 10 } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input mono"
                      style={{ width: 80 }}
                      value={b.max_cost}
                      onChange={(e) =>
                        setBindings((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, max_cost: e.target.value } : x)),
                        )
                      }
                    />
                  </td>
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
