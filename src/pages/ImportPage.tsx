import { useEffect, useRef, useState } from "react";
import type { AccountBalance, SourceFileRecord } from "../api/client";

export function ImportPage(props: {
  accounts: AccountBalance[];
  files?: SourceFileRecord[];
  isDemo?: boolean;
  onUploadFile?: (file: File, accountId?: string) => Promise<SourceFileRecord | void>;
  onUnlockFile?: (fileId: string, password: string) => Promise<SourceFileRecord | void>;
  onRefreshFiles?: () => Promise<void>;
  onRunSolver: () => Promise<string>;
}) {
  const { accounts, isDemo = false, onUploadFile, onUnlockFile, onRefreshFiles, onRunSolver } = props;
  const [files, setFiles] = useState<SourceFileRecord[]>(props.files ?? []);
  const [accountId, setAccountId] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [pwdMap, setPwdMap] = useState<Record<string, string>>({});
  const [solverLog, setSolverLog] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFiles(props.files ?? []);
  }, [props.files]);

  const scheduleRefresh = () => {
    if (!onRefreshFiles || isDemo) return;
    window.setTimeout(() => {
      void onRefreshFiles();
    }, 1800);
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setErrorMsg(null);
    for (const file of Array.from(list)) {
      if (isDemo) {
        const lower = file.name.toLowerCase();
        const guessedParser =
          lower.includes("wechat") || lower.endsWith(".xlsx")
            ? "wechat-bill"
            : lower.includes("alipay") || lower.endsWith(".csv")
              ? "alipay-csv"
              : lower.includes("信用卡")
                ? "cmb-credit-pdf"
                : "bank-pdf";
        setFiles((prev) => [
          {
            id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            filename: file.name,
            parser_id: guessedParser,
            parse_status: "parsed",
            record_count: Math.max(12, Math.round(file.size / 380)),
            range: "Demo Sandbox",
          },
          ...prev,
        ]);
        continue;
      }
      if (!onUploadFile) {
        setErrorMsg("未配置后端上传处理函数。");
        return;
      }
      try {
        const uploaded = await onUploadFile(file, accountId || undefined);
        if (uploaded) {
          setFiles((prev) => [uploaded, ...prev.filter((x) => x.id !== uploaded.id)]);
          scheduleRefresh();
        }
      } catch (err) {
        setErrorMsg(`上传 ${file.name} 失败：${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const unlock = async (id: string) => {
    const pwd = (pwdMap[id] ?? "").trim();
    if (!pwd) return;
    setErrorMsg(null);
    if (isDemo) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                parse_status: "parsed",
                record_count: 151,
                range: "2025-11-01 ~ 2026-11-01（Demo 密码解锁）",
                error: null,
              }
            : f,
        ),
      );
      return;
    }
    if (!onUnlockFile) return;
    try {
      const updated = await onUnlockFile(id, pwd);
      if (updated) {
        setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
        scheduleRefresh();
      }
    } catch (err) {
      setErrorMsg(`解锁失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleManualRefresh = async () => {
    if (!onRefreshFiles) return;
    setRefreshing(true);
    setErrorMsg(null);
    try {
      await onRefreshFiles();
    } catch (err) {
      setErrorMsg(`刷新失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefreshing(false);
    }
  };

  const triggerSolve = async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await onRunSolver();
      setSolverLog(res);
    } catch (err) {
      setErrorMsg(`求解失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const inferredAccounts = accounts.filter((a) => a.inferred_leg_count > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="split-workbench">
        <section className="surface">
          <div className="surface-header">
            <h2 className="surface-title">上传账单原件（POST /v1/files → Observation v2）</h2>
            <span className="tag tag-accent">CSV / XLSX / 加密 PDF / ZIP</span>
          </div>
          <div className="surface-body">
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <select
                className="input"
                style={{ flex: "1 1 220px" }}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">自动识别所属资金账户（按卡尾号 / 状态规则）</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    指定兜底账户：{a.account_id}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
                选择账单文件上传
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".csv,.xlsx,.pdf,.zip"
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
                background: dragOver ? "var(--accent-soft)" : "var(--bg-canvas)",
                borderRadius: "var(--radius-md)",
                padding: "24px 16px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                拖拽支付宝 CSV、微信 XLSX、招行 / 中行 / 宁波银行 PDF 或加密压缩包到此
              </div>
              <div style={{ color: "var(--ink-muted)", fontSize: 12, marginTop: 4 }}>
                原文件按 SHA-256 去重存档为 Artifact；解析结果仅写入不可变 Observation，不破坏已有账本，支持随时补导历史流水。
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                导入新账单后，运行 5 阶段纯 Rust 证据图求解器将 <code>inferred</code> 资金腿原位升级为 <code>verified</code>：
              </span>
              <button className="btn btn-primary" disabled={running} onClick={triggerSolve}>
                {running ? "正在求解..." : "运行全局归因求解 (/v2/solver/run)"}
              </button>
            </div>
            {errorMsg && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--sem-warn-soft, #fdf2f2)",
                  color: "var(--sem-warn, #a33)",
                  fontSize: 12.5,
                }}
              >
                {errorMsg}
              </div>
            )}
            {solverLog && <pre className="code-block">{solverLog}</pre>}
          </div>
        </section>

        <aside className="surface">
          <div className="surface-header">
            <h2 className="surface-title">待补导银行 PDF 缺口提示</h2>
            <span className="tag tag-inferred mono">{inferredAccounts.length} accounts</span>
          </div>
          <div className="surface-body">
            {inferredAccounts.length === 0 ? (
              <div style={{ color: "var(--ink-muted)" }}>所有卡均已导入权威银行流水。</div>
            ) : (
              inferredAccounts.map((a) => (
                <div key={a.account_id} className="lineage-evidence" style={{ marginTop: 0, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong className="mono">{a.account_id}</strong>
                    <span className="tag tag-inferred">{a.inferred_leg_count} inferred</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-secondary)", marginTop: 4 }}>
                    平台账单已推断消费变动 <span className="mono">{a.currency} {Number(a.total_balance).toFixed(2)}</span>，补传该卡 PDF 即可完成双证核验。
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <section className="surface">
        <div className="surface-header">
          <h2 className="surface-title">已归档账单文件批次（Artifacts · {files.length}）</h2>
          {onRefreshFiles && (
            <button className="btn" disabled={refreshing} onClick={() => void handleManualRefresh()}>
              {refreshing ? "同步中..." : "刷新解析与求解状态"}
            </button>
          )}
        </div>
        <div className="data-table-wrap" style={{ maxHeight: 340 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>原文件名</th>
                <th>命中解析器</th>
                <th>时间覆盖范围</th>
                <th style={{ textAlign: "right" }}>观测条数</th>
                <th>状态 / 操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.filename}</td>
                  <td className="mono">{f.parser_id}</td>
                  <td className="mono" style={{ color: "var(--ink-muted)" }}>
                    {f.range ?? "—"}
                  </td>
                  <td className="num-col">{f.record_count}</td>
                  <td>
                    {f.parse_status === "parsed" ? (
                      <span className="tag tag-verified">parsed</span>
                    ) : f.parse_status === "needs_password" ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="tag tag-inferred">needs_password</span>
                        <input
                          className="input mono"
                          style={{ width: 120, padding: "3px 7px" }}
                          type="password"
                          placeholder="输入PDF密码"
                          value={pwdMap[f.id] ?? ""}
                          onChange={(e) =>
                            setPwdMap((prev) => ({ ...prev, [f.id]: e.target.value }))
                          }
                        />
                        <button className="btn btn-primary" onClick={() => unlock(f.id)}>
                          解锁解析
                        </button>
                      </div>
                    ) : (
                      <span className="tag tag-neutral">{f.parse_status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
