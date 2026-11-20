export type Lang = "zh" | "en" | "bi";

export interface CopyItem {
  zh: string;
  en: string;
}

export function t(item: CopyItem, lang: Lang): string {
  if (lang === "zh") return item.zh;
  if (lang === "en") return item.en;
  return `${item.zh} · ${item.en}`;
}

export const COPY = {
  brandSub: { zh: "个人财务本体引擎", en: "Personal Financial Ontology" },
  nav: {
    reports: { zh: "总览画报", en: "Overview" },
    ledger: { zh: "归因血缘", en: "Lineage" },
    assistant: { zh: "语义助手", en: "Assistant" },
    inbox: { zh: "证据收件箱", en: "Inbox" },
    import: { zh: "账单导入", en: "Ingest" },
    subscriptions: { zh: "周期订阅", en: "Recurring" },
    ontology: { zh: "本体图谱", en: "Ontology" },
    models: { zh: "多协议模型", en: "Models" },
  },
  scope: {
    all: { zh: "全部口径", en: "All" },
    personal: { zh: "个人独立", en: "Personal" },
    household: { zh: "家庭亲情卡", en: "Household" },
  },
  ver: {
    all: { zh: "含推断", en: "With Inferred" },
    verified: { zh: "仅已证实", en: "Verified Only" },
  },
} as const;
