import type { Market } from './Market.ts';
import type { Asset } from './Asset.ts';
import type { EventSeverity } from './EventSystem.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NewsItemType = 'hype' | 'crash' | 'growth' | 'scandal' | 'breakthrough';

export interface NewsItem {
  id: string;
  headline: string;
  targetAssetId: string;
  targetName: string;
  targetEmoji: string;
  type: NewsItemType;
  createdDay: number;
  triggerDay: number;
  successChance: number;
  successMult: number;
  failMult: number;
  successHypeBoost: number;
  failHypeDrain: number;
  successTrendBoost: number;
  successMsgTemplate: string;
  failMsgTemplate: string;
  resolved: boolean;
  resolvedSuccess?: boolean;
  resolvedMessage?: string;
}

export interface NewsResolution {
  headline: string;
  targetName: string;
  targetEmoji: string;
  success: boolean;
  message: string;
  severity: EventSeverity;
}

export interface NewsSaveState {
  items: NewsItem[];
  nextGenerationDay: number;
  idCounter: number;
}

// ── Templates ─────────────────────────────────────────────────────────────────

interface NewsTemplate {
  type: NewsItemType;
  headline: (name: string) => string;
  successChance: number;
  getSuccessMult: () => number;
  getFailMult:    (sm: number) => number;
  successHypeBoost: number;
  failHypeDrain:    number;
  successTrendBoost: number;
  successMsgTemplate: string;
  failMsgTemplate: string;
}

const TEMPLATES: NewsTemplate[] = [
  // ── Growth ───────────────────────────────────────────────────────────────
  {
    type: 'growth',
    headline: n => `New CEO rumoured to turn ${n} around`,
    successChance: 0.60,
    getSuccessMult: () => 1.5 + Math.random() * 1.0,
    getFailMult:    () => 0.45 + Math.random() * 0.20,
    successHypeBoost: 0.30, failHypeDrain: 0.20, successTrendBoost: 0.003,
    successMsgTemplate: '✅ New CEO delivers! {emoji} {name} surged +{pct}%',
    failMsgTemplate:    '❌ CEO was a fraud. {emoji} {name} crashed -{pct}%',
  },
  {
    type: 'growth',
    headline: n => `Major partnership rumoured for ${n}`,
    successChance: 0.65,
    getSuccessMult: () => 1.4 + Math.random() * 0.8,
    getFailMult:    () => 0.50 + Math.random() * 0.25,
    successHypeBoost: 0.25, failHypeDrain: 0.30, successTrendBoost: 0.002,
    successMsgTemplate: '🤝 Partnership confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '💔 Partnership fell through. {emoji} {name} -{pct}%',
  },
  {
    type: 'growth',
    headline: n => `${n} product launch expected soon`,
    successChance: 0.60,
    getSuccessMult: () => 1.4 + Math.random() * 1.0,
    getFailMult:    () => 0.50 + Math.random() * 0.20,
    successHypeBoost: 0.35, failHypeDrain: 0.25, successTrendBoost: 0.002,
    successMsgTemplate: '🚀 Product launch exceeds expectations! {emoji} {name} +{pct}%',
    failMsgTemplate:    '💣 Launch flopped hard. {emoji} {name} -{pct}%',
  },
  {
    type: 'growth',
    headline: n => `Analyst upgrade incoming for ${n}`,
    successChance: 0.70,
    getSuccessMult: () => 1.3 + Math.random() * 0.6,
    getFailMult:    () => 0.60 + Math.random() * 0.20,
    successHypeBoost: 0.20, failHypeDrain: 0.35, successTrendBoost: 0.001,
    successMsgTemplate: '📈 Upgrade confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '📉 Downgraded instead. {emoji} {name} -{pct}%',
  },
  {
    type: 'growth',
    headline: n => `Institutional buy order expected for ${n}`,
    successChance: 0.65,
    getSuccessMult: () => 1.5 + Math.random() * 0.7,
    getFailMult:    () => 0.55 + Math.random() * 0.20,
    successHypeBoost: 0.20, failHypeDrain: 0.30, successTrendBoost: 0.002,
    successMsgTemplate: '🏦 Institutional buy confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '🏦 Institution sold instead. {emoji} {name} -{pct}%',
  },

  // ── Hype ─────────────────────────────────────────────────────────────────
  {
    type: 'hype',
    headline: n => `${n} going viral — insiders quietly buying`,
    successChance: 0.55,
    getSuccessMult: () => 1.7 + Math.random() * 1.5,
    getFailMult:    () => 0.40 + Math.random() * 0.25,
    successHypeBoost: 0.45, failHypeDrain: 0.10, successTrendBoost: 0.004,
    successMsgTemplate: '🔥 {emoji} {name} goes viral! +{pct}%',
    failMsgTemplate:    '😴 Hype fizzled. {emoji} {name} -{pct}%',
  },
  {
    type: 'hype',
    headline: n => `Retail army targeting ${n} next`,
    successChance: 0.52,
    getSuccessMult: () => 2.0 + Math.random() * 2.5,
    getFailMult:    () => 0.40 + Math.random() * 0.30,
    successHypeBoost: 0.50, failHypeDrain: 0.05, successTrendBoost: 0.005,
    successMsgTemplate: '🚀 Reddit discovers {emoji} {name}! +{pct}%',
    failMsgTemplate:    '💸 Retail capitulated early. {emoji} {name} -{pct}%',
  },
  {
    type: 'hype',
    headline: n => `${n} CEO to make major announcement`,
    successChance: 0.52,
    getSuccessMult: () => 1.6 + Math.random() * 2.0,
    getFailMult:    () => 0.30 + Math.random() * 0.30,
    successHypeBoost: 0.40, failHypeDrain: 0.15, successTrendBoost: 0.003,
    successMsgTemplate: '📢 Bullish announcement! {emoji} {name} +{pct}%',
    failMsgTemplate:    '📢 Bearish surprise. {emoji} {name} -{pct}%',
  },

  // ── Breakthrough ─────────────────────────────────────────────────────────
  {
    type: 'breakthrough',
    headline: n => `Whale accumulating ${n} — breakout expected`,
    successChance: 0.58,
    getSuccessMult: () => 1.6 + Math.random() * 1.2,
    getFailMult:    () => 0.45 + Math.random() * 0.25,
    successHypeBoost: 0.30, failHypeDrain: 0.20, successTrendBoost: 0.003,
    successMsgTemplate: '🐋 Whale breakout confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '🐋 Whale dumped at the top. {emoji} {name} -{pct}%',
  },
  {
    type: 'breakthrough',
    headline: n => `Short squeeze building in ${n}`,
    successChance: 0.55,
    getSuccessMult: () => 1.8 + Math.random() * 1.5,
    getFailMult:    () => 0.45 + Math.random() * 0.25,
    successHypeBoost: 0.35, failHypeDrain: 0.10, successTrendBoost: 0.005,
    successMsgTemplate: '💥 Short squeeze triggered! {emoji} {name} rocketed +{pct}%',
    failMsgTemplate:    '😓 Shorts won. {emoji} {name} -{pct}%',
  },
  {
    type: 'breakthrough',
    headline: n => `Court ruling on ${n} expected any day`,
    successChance: 0.50,
    getSuccessMult: () => 1.5 + Math.random() * 2.0,
    getFailMult:    () => 0.25 + Math.random() * 0.35,
    successHypeBoost: 0.25, failHypeDrain: 0.20, successTrendBoost: 0.002,
    successMsgTemplate: '⚖️ Ruling in favour! {emoji} {name} +{pct}%',
    failMsgTemplate:    '⚖️ Ruling against. {emoji} {name} -{pct}%',
  },

  // ── Scandal ───────────────────────────────────────────────────────────────
  {
    type: 'scandal',
    headline: n => `Lawsuit expected to hit ${n}`,
    successChance: 0.65,
    getSuccessMult: () => 0.30 + Math.random() * 0.35,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.5,
    successHypeBoost: 0, failHypeDrain: 1, successTrendBoost: -0.003,
    successMsgTemplate: '⚖️ Lawsuit confirmed! {emoji} {name} crashed -{pct}%',
    failMsgTemplate:    '⚖️ Case dismissed! {emoji} {name} relief bounce +{pct}%',
  },
  {
    type: 'scandal',
    headline: n => `SEC investigation rumoured for ${n}`,
    successChance: 0.55,
    getSuccessMult: () => 0.25 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.6,
    successHypeBoost: 0, failHypeDrain: 1, successTrendBoost: -0.004,
    successMsgTemplate: '👮 SEC confirmed! {emoji} {name} -{pct}%',
    failMsgTemplate:    '✅ False alarm. {emoji} {name} relief +{pct}%',
  },
  {
    type: 'scandal',
    headline: n => `Insider selling stake in ${n} — exit signal?`,
    successChance: 0.60,
    getSuccessMult: () => 0.35 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.4,
    successHypeBoost: 0, failHypeDrain: 1, successTrendBoost: -0.002,
    successMsgTemplate: '📤 Mass insider sell-off confirmed. {emoji} {name} -{pct}%',
    failMsgTemplate:    '📥 Insiders were actually buying. {emoji} {name} +{pct}%',
  },
  {
    type: 'scandal',
    headline: n => `Rug pull fears growing around ${n}`,
    successChance: 0.50,
    getSuccessMult: () => 0.10 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.4,
    successHypeBoost: 0, failHypeDrain: 1, successTrendBoost: -0.005,
    successMsgTemplate: '🪤 RUG PULLED! {emoji} {name} -{pct}%',
    failMsgTemplate:    '💎 Diamond hands prevailed. {emoji} {name} +{pct}%',
  },

  // ── Crash ─────────────────────────────────────────────────────────────────
  {
    type: 'crash',
    headline: n => `Earnings miss feared for ${n}`,
    successChance: 0.55,
    getSuccessMult: () => 0.45 + Math.random() * 0.25,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.7,
    successHypeBoost: 0, failHypeDrain: 1, successTrendBoost: -0.003,
    successMsgTemplate: '📊 Earnings MISS. {emoji} {name} -{pct}%',
    failMsgTemplate:    '📊 Earnings BEAT! {emoji} {name} +{pct}%',
  },
  {
    type: 'crash',
    headline: n => `${n} facing potential delisting`,
    successChance: 0.45,
    getSuccessMult: () => 0.20 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.55,
    successHypeBoost: 0, failHypeDrain: 1, successTrendBoost: -0.006,
    successMsgTemplate: '☠️ Delisting confirmed. {emoji} {name} -{pct}%',
    failMsgTemplate:    '✅ Delisting avoided! {emoji} {name} relief +{pct}%',
  },
];

// ── Stat-weighted template selection ─────────────────────────────────────────
//
// Asset stats bias which news type gets generated:
//   hype > 0.6   → +3× weight on 'hype' templates
//   risk > 0.65  → +2.5× weight on 'scandal' / 'crash'
//   trend > 0.002 → +2× weight on 'growth' / 'breakthrough'
//   stability > 0.5 → +1.5× weight on 'breakthrough'

const TYPE_BASE_WEIGHT: Record<NewsItemType, number> = {
  hype: 1, growth: 1, breakthrough: 1, scandal: 1, crash: 1,
};

function selectTemplate(asset: Asset): NewsTemplate {
  const w = { ...TYPE_BASE_WEIGHT };
  if (asset.hype > 0.60)        { w.hype += 3.0; }
  if (asset.risk > 0.65)        { w.scandal += 2.5; w.crash += 1.5; }
  if (asset.trend > 0.002)      { w.growth += 2.0; w.breakthrough += 1.0; }
  if (asset.stability > 0.50)   { w.breakthrough += 1.5; }
  if (asset.hype < 0.20)        { w.hype = Math.max(0.1, w.hype - 0.8); }

  // Build weighted pool: each template gets weight proportional to its type
  let total = 0;
  const pool = TEMPLATES.map(t => {
    const weight = w[t.type];
    total += weight;
    return { t, weight };
  });

  let r = Math.random() * total;
  for (const { t, weight } of pool) {
    r -= weight;
    if (r <= 0) return t;
  }
  return TEMPLATES[TEMPLATES.length - 1];
}

function fillTemplate(template: string, name: string, emoji: string, mult: number): string {
  const pct = mult >= 1
    ? ((mult - 1) * 100).toFixed(0)
    : ((1 - mult) * 100).toFixed(0);
  return template
    .replace('{name}', name)
    .replace('{emoji}', emoji)
    .replace('{pct}', pct);
}

// ── NewsSystem ────────────────────────────────────────────────────────────────

export class NewsSystem {
  private items: NewsItem[] = [];
  private nextGenerationDay = 1;
  private idCounter = 0;
  private readonly maxActive = 6;
  private readonly maxHistory = 30;

  // ── Generation ────────────────────────────────────────────────────────────

  generateIfDue(market: Market, currentDay: number): NewsItem | null {
    if (currentDay < this.nextGenerationDay) return null;

    const active = this.items.filter(n => !n.resolved);
    if (active.length >= this.maxActive) return null;

    const assets = market.getUnlockedAssets();
    if (assets.length === 0) return null;

    // Prefer assets that don't already have pending news
    const pendingIds = new Set(active.map(n => n.targetAssetId));
    const freeAssets = assets.filter(a => !pendingIds.has(a.id));
    const pool = freeAssets.length > 0 ? freeAssets : assets;
    const target = pool[Math.floor(Math.random() * pool.length)];

    const tpl   = selectTemplate(target);
    const delay = 1 + Math.floor(Math.random() * 4);  // 1–4 days
    const sm    = tpl.getSuccessMult();
    const fm    = tpl.getFailMult(sm);

    const item: NewsItem = {
      id:               `news_${this.idCounter++}`,
      headline:         tpl.headline(target.name),
      targetAssetId:    target.id,
      targetName:       target.name,
      targetEmoji:      target.emoji,
      type:             tpl.type,
      createdDay:       currentDay,
      triggerDay:       currentDay + delay,
      successChance:    tpl.successChance,
      successMult:      sm,
      failMult:         fm,
      successHypeBoost: tpl.successHypeBoost,
      failHypeDrain:    tpl.failHypeDrain,
      successTrendBoost: tpl.successTrendBoost,
      successMsgTemplate: tpl.successMsgTemplate,
      failMsgTemplate:    tpl.failMsgTemplate,
      resolved: false,
    };

    this.items.push(item);
    this.nextGenerationDay = currentDay + 2 + Math.floor(Math.random() * 2);
    return item;
  }

  // ── Resolution ────────────────────────────────────────────────────────────

  dayTick(market: Market, currentDay: number): NewsResolution[] {
    const resolutions: NewsResolution[] = [];

    for (const item of this.items) {
      if (item.resolved || item.triggerDay !== currentDay) continue;
      resolutions.push(this.applyEffect(item, market));
    }

    const unresolved = this.items.filter(n => !n.resolved);
    const resolved   = this.items.filter(n => n.resolved).slice(-this.maxHistory);
    this.items = [...unresolved, ...resolved];

    return resolutions;
  }

  private applyEffect(item: NewsItem, market: Market): NewsResolution {
    const asset   = market.getAsset(item.targetAssetId);
    const success = Math.random() < item.successChance;

    item.resolved = true;
    item.resolvedSuccess = success;

    if (!asset) {
      item.resolvedMessage = `${item.targetEmoji} ${item.targetName} not found.`;
      return { headline: item.headline, targetName: item.targetName, targetEmoji: item.targetEmoji, success: false, message: item.resolvedMessage, severity: 'neutral' };
    }

    let msg: string;
    let severity: EventSeverity;

    if (success) {
      asset.shock(item.successMult);
      asset.hype = Math.min(1, asset.hype + item.successHypeBoost);
      asset.trendBoost += item.successTrendBoost;
      msg      = fillTemplate(item.successMsgTemplate, item.targetName, item.targetEmoji, item.successMult);
      severity = item.successMult >= 1 ? 'good' : 'bad';
    } else {
      asset.shock(item.failMult);
      if (item.failHypeDrain > 0 && item.failHypeDrain < 1) asset.hype *= item.failHypeDrain;
      msg      = fillTemplate(item.failMsgTemplate, item.targetName, item.targetEmoji, item.failMult);
      severity = item.failMult < 1 ? 'bad' : 'good';
    }

    item.resolvedMessage = msg;
    return { headline: item.headline, targetName: item.targetName, targetEmoji: item.targetEmoji, success, message: msg, severity };
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getActive(): NewsItem[] {
    return this.items.filter(n => !n.resolved);
  }

  getAll(): NewsItem[] {
    return [...this.items];
  }

  // ── Save / load ───────────────────────────────────────────────────────────

  saveState(): NewsSaveState {
    return { items: this.items.slice(-this.maxHistory), nextGenerationDay: this.nextGenerationDay, idCounter: this.idCounter };
  }

  loadState(state: NewsSaveState): void {
    this.items             = state.items ?? [];
    this.nextGenerationDay = state.nextGenerationDay ?? 1;
    this.idCounter         = state.idCounter ?? 0;
  }
}
