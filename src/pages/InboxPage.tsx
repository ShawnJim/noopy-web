import type { ReviewItem } from "../api/client";

export function InboxPage(props: {
  reviews: ReviewItem[];
  onResolve: (index: number, action: "confirm" | "ignore") => void;
}) {
  const { reviews, onResolve } = props;

  return (
    <section className="surface">
      <div className="surface-header">
        <h2 className="surface-title">证据收件箱（护栏拦截与低置信度归因提案）</h2>
        <span className="tag tag-inferred mono">{reviews.length} pending</span>
      </div>
      <div className="surface-body">
        {reviews.length === 0 ? (
          <div style={{ color: "var(--ink-muted)", padding: "24px 0", textAlign: "center" }}>
            收件箱已清空。所有高风险或弱证据归因项均已处理完毕。
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviews.map((item, idx) => (
              <div key={idx} className="lineage-evidence" style={{ marginTop: 0 }}>
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
                      observations: {item.observation_ids.join(", ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => onResolve(idx, "confirm")}
                    >
                      确认并沉淀规则
                    </button>
                    <button className="btn" onClick={() => onResolve(idx, "ignore")}>
                      忽略
                    </button>
                  </div>
                </div>
                <pre className="code-block">{JSON.stringify(item.evidence, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
