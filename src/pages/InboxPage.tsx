import { useState } from "react";
import type { ProposalRecord, ReviewItem } from "../api/client";

export function InboxPage(props: {
  reviews: ReviewItem[];
  proposals: ProposalRecord[];
  onResolveReview: (item: ReviewItem, action: "confirm" | "ignore") => Promise<void>;
  onApproveProposal: (proposalId: string) => Promise<void>;
  onRejectProposal: (proposalId: string) => Promise<void>;
}) {
  const { reviews, proposals, onResolveReview, onApproveProposal, onRejectProposal } = props;
  const [tab, setTab] = useState<"reviews" | "proposals">("reviews");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    setErrorMsg(null);
    try {
      await fn();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey(null);
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
            操作失败：{errorMsg}
          </div>
        </section>
      )}

      <section className="surface">
        <div className="surface-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 className="surface-title">证据与提案收件箱</h2>
            <div className="seg">
              <button
                className={tab === "reviews" ? "active" : ""}
                onClick={() => setTab("reviews")}
              >
                本体护栏复核 ({reviews.length})
              </button>
              <button
                className={tab === "proposals" ? "active" : ""}
                onClick={() => setTab("proposals")}
              >
                账本待确认提案 ({proposals.length})
              </button>
            </div>
          </div>
          <span className="tag tag-inferred mono">
            {reviews.length + proposals.length} pending
          </span>
        </div>

        <div className="surface-body">
          {tab === "reviews" ? (
            reviews.length === 0 ? (
              <div style={{ color: "var(--ink-muted)", padding: "24px 0", textAlign: "center" }}>
                本体复核队列已清空。所有高风险护栏拦截或弱证据归因项均已持久化解算。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reviews.map((item, idx) => {
                  const key = item.review_key ?? `${item.kind}_${idx}`;
                  const busy = busyKey === key;
                  return (
                    <div key={key} className="lineage-evidence" style={{ marginTop: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                        }}
                      >
                        <div>
                          <span className="tag tag-inferred">{item.kind}</span>
                          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6 }}>{item.reason}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                            observations: {item.observation_ids.join(", ") || "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() =>
                              void runAction(key, () => onResolveReview(item, "confirm"))
                            }
                          >
                            {busy ? "处理中..." : "确认并沉淀规则"}
                          </button>
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={() =>
                              void runAction(key, () => onResolveReview(item, "ignore"))
                            }
                          >
                            忽略
                          </button>
                        </div>
                      </div>
                      <pre className="code-block">{JSON.stringify(item.evidence, null, 2)}</pre>
                    </div>
                  );
                })}
              </div>
            )
          ) : proposals.length === 0 ? (
            <div style={{ color: "var(--ink-muted)", padding: "24px 0", textAlign: "center" }}>
              暂无待确认的账本变更提案（由语义助手或后台对账生成的提案会出现在这里）。
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {proposals.map((p) => {
                const busy = busyKey === p.id;
                return (
                  <div key={p.id} className="lineage-evidence" style={{ marginTop: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span className="tag tag-accent mono">{p.actor_type ?? "proposal"}</span>
                          {p.confidence != null && (
                            <span className="tag tag-neutral mono">conf={p.confidence}</span>
                          )}
                          <span className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                            {p.id}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>{p.intent}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => void runAction(p.id, () => onApproveProposal(p.id))}
                        >
                          {busy ? "处理中..." : "批准入账 (:approve)"}
                        </button>
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() => void runAction(p.id, () => onRejectProposal(p.id))}
                        >
                          拒绝 (:reject)
                        </button>
                      </div>
                    </div>
                    {p.ops && (
                      <pre className="code-block">{JSON.stringify(p.ops, null, 2)}</pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
