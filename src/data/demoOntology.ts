/**
 * 脱敏演示数据集（真实场景镜像：N:1 合单支付、1:N 组合支付、未导流水 inferred 卡、亲情卡、
 * 提现手续费、本人姓名退款护栏拦截），用于离线或后端未启动时的完整交互体验与单元测试。
 */
import type {
  AccountBalance,
  AttributionLineageTree,
  EconomicEvent,
  IdentityAlias,
  ReviewItem,
  SpendingScope,
  SpendingSummary,
} from "../api/ontology";

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
