/**
 * 脱敏演示数据集（真实场景镜像：N:1 合单支付、1:N 组合支付、未导流水 inferred 卡、亲情卡、
 * 提现手续费、本人姓名退款护栏拦截），用于离线或后端未启动时的完整交互体验与单元测试。
 */
import type {
  AccountBalance,
  AccountFlowItem,
  AttributionLineageTree,
  EconomicEvent,
  IdentityAlias,
  MerchantRankItem,
  MonthlyReportPoint,
  ReviewItem,
  SourceFileRecord,
  SpendingScope,
  SpendingSummary,
  SubscriptionCandidate,
  SubscriptionItem,
} from "../api/client";

export const DEMO_EVENTS: EconomicEvent[] = [
  {
    id: "ev_merged_1",
    kind: "consumption",
    title: "桂林药房 · 西瓜霜喷剂（合单 1/2）",
    occurred_at: "2026-07-05T01:38:16+08:00",
    amount: "13.90",
    currency: "CNY",
    payer_party_id: "party:self",
    beneficiary_party_id: "party:self",
    status: "active",
  },
  {
    id: "ev_merged_2",
    kind: "consumption",
    title: "邻夏服饰 · 莫代尔睡衣（合单 2/2）",
    occurred_at: "2026-07-05T01:38:16+08:00",
    amount: "62.90",
    currency: "CNY",
    payer_party_id: "party:self",
    beneficiary_party_id: "party:self",
    status: "active",
  },
  {
    id: "ev_combo_1",
    kind: "consumption",
    title: "好友转账（中行 100 + 微信零钱 200 组合支付）",
    occurred_at: "2026-04-26T19:02:57+08:00",
    amount: "300.00",
    currency: "CNY",
    payer_party_id: "party:self",
    beneficiary_party_id: "party:self",
    status: "active",
  },
  {
    id: "ev_family_1",
    kind: "consumption",
    title: "山姆会员店（亲情卡代付）",
    occurred_at: "2026-06-18T14:20:00+08:00",
    amount: "248.50",
    currency: "CNY",
    payer_party_id: "party:family",
    beneficiary_party_id: "party:family",
    status: "active",
  },
  {
    id: "ev_inferred_1",
    kind: "consumption",
    title: "24H便利购 · 宝矿力水特（未导银行流水）",
    occurred_at: "2026-10-29T15:29:05+08:00",
    amount: "6.50",
    currency: "CNY",
    payer_party_id: "party:self",
    beneficiary_party_id: "party:self",
    status: "active",
  },
];

export const DEMO_BALANCES: AccountBalance[] = [
  {
    account_id: "acct:card_2667 (中国银行储蓄卡)",
    currency: "CNY",
    verified_balance: "18420.50",
    total_balance: "18420.50",
    inferred_leg_count: 0,
  },
  {
    account_id: "acct:card_8300 (宁波银行储蓄卡)",
    currency: "CNY",
    verified_balance: "9312.10",
    total_balance: "9312.10",
    inferred_leg_count: 0,
  },
  {
    account_id: "acct:cmb_credit (招行信用卡总账 · 2799/8886)",
    currency: "CNY",
    verified_balance: "-1240.80",
    total_balance: "-1240.80",
    inferred_leg_count: 0,
  },
  {
    account_id: "acct:card_6333 (工商银行储蓄卡 · 未导PDF)",
    currency: "CNY",
    verified_balance: "0.00",
    total_balance: "-4280.60",
    inferred_leg_count: 151,
  },
  {
    account_id: "acct:card_7662 (上海银行信用卡 · 未导PDF)",
    currency: "CNY",
    verified_balance: "0.00",
    total_balance: "-2150.00",
    inferred_leg_count: 80,
  },
];

export const DEMO_ALIASES: IdentityAlias[] = [
  {
    id: "alias_1",
    target_type: "party",
    target_id: "party:merchant_24h便利购",
    alias_kind: "legal_name",
    raw_value: "武汉小麦便利科技有限公司",
    confidence: "0.95",
    origin: "auto_discovered",
    hit_count: 93,
  },
  {
    id: "alias_2",
    target_type: "party",
    target_id: "party:merchant_滴滴出行",
    alias_kind: "legal_name",
    raw_value: "北京嘀嘀无限科技发展有限公司",
    confidence: "0.95",
    origin: "auto_discovered",
    hit_count: 19,
  },
  {
    id: "alias_3",
    target_type: "party",
    target_id: "party:merchant_7eleven",
    alias_kind: "legal_name",
    raw_value: "广东赛壹便利店有限公司",
    confidence: "0.95",
    origin: "auto_discovered",
    hit_count: 14,
  },
  {
    id: "alias_4",
    target_type: "party",
    target_id: "party:merchant_美团",
    alias_kind: "legal_name",
    raw_value: "北京三快在线科技有限公司",
    confidence: "0.95",
    origin: "auto_discovered",
    hit_count: 11,
  },
];

export const DEMO_REVIEWS: ReviewItem[] = [
  {
    kind: "refund_ambiguous_self_or_generic_cp",
    observation_ids: ["obs_boc_refund_01"],
    reason: "银行退款对手方为本人姓名占位符，已由护栏拦截，禁止仅凭对手方自动冲抵",
    evidence: { account: "acct:card_2667", amount: "71.84", hint: "请核对原订单号或手动关联原消费" },
  },
  {
    kind: "funding_unresolved",
    observation_ids: ["obs_alipay_old_09"],
    reason: "旧版支付宝网页导出缺少付款方式列，等待银行流水反向认领或手动指定资金账户",
    evidence: { source: "alipay-csv (legacy)", amount: "-45.00" },
  },
];

export const DEMO_LINEAGES: Record<string, AttributionLineageTree> = {
  ev_merged_1: {
    target_type: "economic_event",
    target_id: "ev_merged_1",
    event: DEMO_EVENTS[0],
    legs: [
      {
        leg: {
          id: "leg_merged_1",
          event_id: "ev_merged_1",
          account_id: "acct:card_2667",
          instrument_id: "inst:2667",
          role: "primary",
          amount: "-13.90",
          currency: "CNY",
          occurred_at: "2026-07-05T03:01:26+08:00",
          verification_state: "verified",
        },
        account_name: "中国银行储蓄卡(2667)",
        evidences: [
          {
            link: {
              id: "ol_m1_bank",
              observation_id: "obs_boc_7680",
              target_type: "ledger_leg",
              target_id: "leg_merged_1",
              role: "authoritative_statement",
              confidence: "0.98",
              attribution_trace: {
                solver: "subset_sum_merged_checkout_v2",
                bank_total: "-76.80",
                bundle_parts: ["-13.90", "-62.90"],
              },
            },
            observation: {
              id: "obs_boc_7680",
              artifact_file: "中国银行/最近1年流水.pdf",
              source: "boc-pdf",
              platform: "boc",
              occurred_at: "2026-07-05T03:01:26+08:00",
              amount: "-76.80",
              currency: "CNY",
              raw_account_hint: "中国银行(2667)",
              raw_counterparty: "支付宝-某店主",
              raw_memo: "网上快捷支付（合并扣款）",
            },
          },
          {
            link: {
              id: "ol_m1_plat",
              observation_id: "obs_ali_1390",
              target_type: "ledger_leg",
              target_id: "leg_merged_1",
              role: "merged_checkout_part",
              confidence: "0.98",
              attribution_trace: { solver: "subset_sum_merged_checkout_v2", order_window_sec: 0 },
            },
            observation: {
              id: "obs_ali_1390",
              artifact_file: "alipay/支付宝交易明细.csv",
              source: "alipay-csv",
              platform: "alipay",
              occurred_at: "2026-07-05T01:38:16+08:00",
              amount: "-13.90",
              currency: "CNY",
              raw_account_hint: "中国银行储蓄卡(2667)",
              raw_counterparty: "桂林**店",
              raw_memo: "桂林三金西瓜霜喷粉剂",
            },
          },
        ],
      },
    ],
    related_events: [],
    matched_aliases: [],
  },
  ev_combo_1: {
    target_type: "economic_event",
    target_id: "ev_combo_1",
    event: DEMO_EVENTS[2],
    legs: [
      {
        leg: {
          id: "leg_combo_bank",
          event_id: "ev_combo_1",
          account_id: "acct:card_2667",
          instrument_id: "inst:2667",
          role: "combo_part",
          amount: "-100.00",
          currency: "CNY",
          occurred_at: "2026-04-26T19:02:57+08:00",
          verification_state: "verified",
        },
        account_name: "中国银行储蓄卡(2667)",
        evidences: [
          {
            link: {
              id: "ol_c_bank",
              observation_id: "obs_boc_100",
              target_type: "ledger_leg",
              target_id: "leg_combo_bank",
              role: "authoritative_statement",
              confidence: "1.00",
              attribution_trace: { solver: "bipartite_min_cost_v2", sec_diff: 0, rail_match: true },
            },
            observation: {
              id: "obs_boc_100",
              artifact_file: "中国银行/最近1年流水.pdf",
              source: "boc-pdf",
              platform: "boc",
              occurred_at: "2026-04-26T19:02:57+08:00",
              amount: "-100.00",
              currency: "CNY",
              raw_counterparty: "财付通-微信转账",
              raw_memo: "网上快捷支付",
            },
          },
        ],
      },
      {
        leg: {
          id: "leg_combo_wallet",
          event_id: "ev_combo_1",
          account_id: "acct:wechat_wallet",
          role: "combo_part",
          amount: "-200.00",
          currency: "CNY",
          occurred_at: "2026-04-26T19:02:57+08:00",
          verification_state: "verified",
        },
        account_name: "微信零钱",
        evidences: [
          {
            link: {
              id: "ol_c_wx",
              observation_id: "obs_wx_300",
              target_type: "ledger_leg",
              target_id: "leg_combo_wallet",
              role: "combo_payment_source",
              confidence: "0.97",
              attribution_trace: {
                rule: "combo_payment_parser",
                combo_total: "-300.00",
                legs_sum: "-100.00 + -200.00",
              },
            },
            observation: {
              id: "obs_wx_300",
              artifact_file: "wechat/微信支付账单流水文件.xlsx",
              source: "wechat-bill",
              platform: "wechat",
              occurred_at: "2026-04-26T19:02:57+08:00",
              amount: "-300.00",
              currency: "CNY",
              raw_account_hint: "中国银行储蓄卡(2667)付款¥100.00\\n零钱付款¥200.00",
              raw_counterparty: "好友",
              raw_memo: "微信转账",
            },
          },
        ],
      },
    ],
    related_events: [],
    matched_aliases: [],
  },
};

export function computeDemoSpending(scope: SpendingScope): SpendingSummary {
  const personal = 13.9 + 62.9 + 300.0 + 6.5;
  const household = 248.5;
  const all = personal + household;
  const net = scope === "personal" ? personal : scope === "household" ? household : all;
  return {
    scope,
    net_spending: net.toFixed(2),
    personal_spending: personal.toFixed(2),
    household_spending: household.toFixed(2),
    total_spending: all.toFixed(2),
    active_event_count: DEMO_EVENTS.length,
    family_event_count: 1,
    inferred_leg_count: 231,
    verified_leg_count: 1283,
  };
}

export const DEMO_MONTHLY: MonthlyReportPoint[] = [
  { month: "2025-11", personal: "4820.40", household: "310.00", income: "18500.00", count: 162 },
  { month: "2025-12", personal: "6190.80", household: "520.00", income: "18500.00", count: 198 },
  { month: "2026-01", personal: "7450.20", household: "890.50", income: "24200.00", count: 215 },
  { month: "2026-02", personal: "5320.10", household: "640.00", income: "18500.00", count: 149 },
  { month: "2026-03", personal: "4980.65", household: "415.20", income: "18500.00", count: 176 },
  { month: "2026-04", personal: "5610.30", household: "480.00", income: "18900.00", count: 184 },
  { month: "2026-05", personal: "6240.90", household: "560.40", income: "18500.00", count: 203 },
  { month: "2026-06", personal: "5890.00", household: "712.80", income: "19100.00", count: 194 },
  { month: "2026-07", personal: "6430.55", household: "635.00", income: "18500.00", count: 221 },
  { month: "2026-08", personal: "5740.20", household: "490.00", income: "18500.00", count: 189 },
  { month: "2026-09", personal: "5180.45", household: "530.60", income: "18500.00", count: 177 },
  { month: "2026-10", personal: "6085.12", household: "618.90", income: "19800.00", count: 212 },
];

export const DEMO_MERCHANTS: MerchantRankItem[] = [
  { name: "山东高速信联科技股份有限公司 (ETC)", amount: "2946.80", count: 99 },
  { name: "万物云（万科物业母公司）", amount: "2680.00", count: 95 },
  { name: "特来电新能源", amount: "2180.50", count: 23 },
  { name: "美团 / 北京三快在线", amount: "1960.40", count: 48 },
  { name: "滴滴出行", amount: "1420.30", count: 19 },
  { name: "湖南联通", amount: "1080.00", count: 54 },
  { name: "iCloud 由云上贵州运营", amount: "816.00", count: 12 },
  { name: "24H便利购 (武汉小麦便利)", amount: "642.50", count: 93 },
];

export const DEMO_ACCOUNTS: AccountFlowItem[] = [
  { account_id: "acct:card_2667", name: "中国银行储蓄卡(2667)", outflow: "38420.50", inflow: "142000.00", verified: 967, inferred: 0 },
  { account_id: "acct:card_8300", name: "宁波银行储蓄卡(8300)", outflow: "19240.80", inflow: "46500.00", verified: 494, inferred: 0 },
  { account_id: "acct:card_4755", name: "招商银行储蓄卡(4755)", outflow: "14810.20", inflow: "32000.00", verified: 325, inferred: 0 },
  { account_id: "acct:wechat_wallet", name: "微信零钱", outflow: "11250.40", inflow: "9840.00", verified: 757, inferred: 0 },
  { account_id: "acct:card_6333", name: "工商银行储蓄卡(6333)", outflow: "6840.30", inflow: "0.00", verified: 0, inferred: 151 },
  { account_id: "acct:card_7662", name: "上海银行信用卡(7662)", outflow: "4120.00", inflow: "0.00", verified: 0, inferred: 80 },
];

export const DEMO_FILES: SourceFileRecord[] = [
  { id: "f1", filename: "中国银行/最近1年流水-密码******.pdf", parser_id: "boc-pdf", parse_status: "parsed", record_count: 967, range: "2025-11-03 ~ 2026-11-01" },
  { id: "f2", filename: "宁波银行/宁波银行1102.pdf", parser_id: "nbcb-pdf", parse_status: "parsed", record_count: 494, range: "2026-05-11 ~ 2026-11-02" },
  { id: "f3", filename: "招商银行/招商银行交易流水(20261102).pdf", parser_id: "cmb-pdf", parse_status: "parsed", record_count: 309, range: "2025-10-31 ~ 2026-10-23" },
  { id: "f4", filename: "招商银行信用卡/2025.11-2026.10 月度账单 (10份)", parser_id: "cmb-credit-pdf", parse_status: "parsed", record_count: 40, range: "2025-11-13 ~ 2026-10-15" },
  { id: "f5", filename: "wechat/微信支付账单流水文件(20251102-20261102).xlsx", parser_id: "wechat-bill", parse_status: "parsed", record_count: 1652, range: "2025-11-02 ~ 2026-11-02" },
  { id: "f6", filename: "alipay/支付宝交易明细(20251103-20261102).csv", parser_id: "alipay-csv", parse_status: "parsed", record_count: 1562, range: "2025-11-03 ~ 2026-11-02" },
  { id: "f7", filename: "工商银行/2026年度储蓄卡加密账单.pdf", parser_id: "icbc-pdf", parse_status: "needs_password", record_count: 0, error: "PDF 已加密，请输入账单解压密码以解锁并升级 151 笔 inferred 资金腿" },
];

export const DEMO_SUBS: SubscriptionItem[] = [
  {
    id: "sub_icloud",
    name: "iCloud+ 200GB（云上贵州）",
    merchant: "iCloud 由云上贵州运营",
    amount: "68.00",
    currency: "CNY",
    cycle: "month",
    next_charge_on: "2026-11-15",
    status: "active",
    flag: null,
  },
  {
    id: "sub_unicom",
    name: "湖南联通手机月租充值",
    merchant: "湖南联通",
    amount: "20.00",
    currency: "CNY",
    cycle: "month",
    next_charge_on: "2026-11-28",
    status: "active",
    flag: null,
  },
  {
    id: "sub_gcloud",
    name: "Google Cloud / AI 服务",
    merchant: "GOOGLE *CLOUD",
    amount: "69.34",
    currency: "CNY",
    cycle: "month",
    next_charge_on: "2026-12-10",
    status: "active",
    flag: "汇率浮动 ±1.20",
  },
];

export const DEMO_SUB_CANDIDATES: SubscriptionCandidate[] = [
  { title: "万物云（万科物业母公司）", amount: "10.00", months: 9, charges: 95, last_on: "2026-10-28" },
  { title: "特来电新能源（固定定额充）", amount: "100.00", months: 5, charges: 23, last_on: "2026-08-22" },
  { title: "山东高速信联科技 (ETC固定通勤段)", amount: "38.00", months: 5, charges: 77, last_on: "2026-10-30" },
];

