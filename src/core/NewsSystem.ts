import type { Market } from './Market.ts';
import type { EventSeverity } from './EventSystem.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  headline: string;
  targetAssetId: string;
  targetName: string;
  targetEmoji: string;
  createdDay: number;
  triggerDay: number;
  successChance: number;
  successMult: number;       // shock multiplier on success
  failMult: number;          // shock multiplier on failure
  successHypeBoost: number;  // added to hype on success
  failHypeDrain: number;     // hype is multiplied by this on failure
  successTrendBoost: number; // added to trendBoost on success
  successMsgTemplate: string; // {name} {emoji} {pct} placeholders
  failMsgTemplate: string;
  resolved: boolean;
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
  // ── Bullish rumours ──────────────────────────────────────────────────────
  {
    headline: n => `New CEO rumoured to turn ${n} around`,
    successChance: 0.60,
    getSuccessMult: () => 1.5 + Math.random() * 1.0,
    getFailMult:    () => 0.45 + Math.random() * 0.2,
    successHypeBoost: 0.30,
    failHypeDrain: 0.20,
    successTrendBoost: 0.003,
    successMsgTemplate: '✅ New CEO delivers! {emoji} {name} surged +{pct}%',
    failMsgTemplate:    '❌ CEO was a fraud. {emoji} {name} crashed -{pct}%',
  },
  {
    headline: n => `Major partnership rumoured for ${n}`,
    successChance: 0.65,
    getSuccessMult: () => 1.4 + Math.random() * 0.8,
    getFailMult:    () => 0.50 + Math.random() * 0.25,
    successHypeBoost: 0.25,
    failHypeDrain: 0.30,
    successTrendBoost: 0.002,
    successMsgTemplate: '🤝 Partnership confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '💔 Partnership fell through. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `${n} product launch expected soon`,
    successChance: 0.60,
    getSuccessMult: () => 1.4 + Math.random() * 1.0,
    getFailMult:    () => 0.50 + Math.random() * 0.20,
    successHypeBoost: 0.35,
    failHypeDrain: 0.25,
    successTrendBoost: 0.002,
    successMsgTemplate: '🚀 Product launch exceeds expectations! {emoji} {name} +{pct}%',
    failMsgTemplate:    '💣 Launch flopped. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `Analyst upgrade incoming for ${n}`,
    successChance: 0.70,
    getSuccessMult: () => 1.3 + Math.random() * 0.6,
    getFailMult:    () => 0.60 + Math.random() * 0.20,
    successHypeBoost: 0.20,
    failHypeDrain: 0.35,
    successTrendBoost: 0.001,
    successMsgTemplate: '📈 Upgrade confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '📉 Downgrade instead. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `${n} going viral — insiders quietly buying`,
    successChance: 0.55,
    getSuccessMult: () => 1.7 + Math.random() * 1.5,
    getFailMult:    () => 0.40 + Math.random() * 0.25,
    successHypeBoost: 0.40,
    failHypeDrain: 0.10,
    successTrendBoost: 0.004,
    successMsgTemplate: '🔥 {emoji} {name} goes viral! +{pct}%',
    failMsgTemplate:    '😴 Hype fizzled before it started. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `Institutional buy order expected for ${n}`,
    successChance: 0.65,
    getSuccessMult: () => 1.5 + Math.random() * 0.7,
    getFailMult:    () => 0.55 + Math.random() * 0.20,
    successHypeBoost: 0.20,
    failHypeDrain: 0.30,
    successTrendBoost: 0.002,
    successMsgTemplate: '🏦 Institutional buy confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '🏦 Institution sold instead. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `Whale accumulating ${n} — breakout expected`,
    successChance: 0.58,
    getSuccessMult: () => 1.6 + Math.random() * 1.2,
    getFailMult:    () => 0.45 + Math.random() * 0.25,
    successHypeBoost: 0.30,
    failHypeDrain: 0.20,
    successTrendBoost: 0.003,
    successMsgTemplate: '🐋 Whale breakout confirmed! {emoji} {name} +{pct}%',
    failMsgTemplate:    '🐋 Whale dumped at the top. {emoji} {name} -{pct}%',
  },

  // ── Bearish rumours ──────────────────────────────────────────────────────
  {
    headline: n => `Lawsuit expected to hit ${n}`,
    successChance: 0.65,
    getSuccessMult: () => 0.30 + Math.random() * 0.35,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.5,
    successHypeBoost: 0,
    failHypeDrain: 1,  // no drain on false alarm
    successTrendBoost: -0.003,
    successMsgTemplate: '⚖️ Lawsuit confirmed! {emoji} {name} crashed -{pct}%',
    failMsgTemplate:    '⚖️ Case dismissed! {emoji} {name} relief bounce +{pct}%',
  },
  {
    headline: n => `SEC investigation rumoured for ${n}`,
    successChance: 0.55,
    getSuccessMult: () => 0.25 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.6,
    successHypeBoost: 0,
    failHypeDrain: 1,
    successTrendBoost: -0.004,
    successMsgTemplate: '👮 SEC confirmed! {emoji} {name} -{pct}%',
    failMsgTemplate:    '✅ False alarm. {emoji} {name} relief +{pct}%',
  },
  {
    headline: n => `Insider selling stake in ${n} — exit signal?`,
    successChance: 0.60,
    getSuccessMult: () => 0.35 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.4,
    successHypeBoost: 0,
    failHypeDrain: 1,
    successTrendBoost: -0.002,
    successMsgTemplate: '📤 Mass insider sell-off confirmed. {emoji} {name} -{pct}%',
    failMsgTemplate:    '📥 Insiders were actually buying. {emoji} {name} +{pct}%',
  },
  {
    headline: n => `Earnings miss feared for ${n}`,
    successChance: 0.55,
    getSuccessMult: () => 0.45 + Math.random() * 0.25,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.7,
    successHypeBoost: 0,
    failHypeDrain: 1,
    successTrendBoost: -0.003,
    successMsgTemplate: '📊 Earnings MISS. {emoji} {name} -{pct}%',
    failMsgTemplate:    '📊 Earnings BEAT! {emoji} {name} +{pct}%',
  },
  {
    headline: n => `Rug pull fears growing around ${n}`,
    successChance: 0.50,
    getSuccessMult: () => 0.10 + Math.random() * 0.30,
    getFailMult:    (sm) => 1 + (1 - sm) * 0.4,
    successHypeBoost: 0,
    failHypeDrain: 1,
    successTrendBoost: -0.005,
    successMsgTemplate: '🪤 RUG PULLED! {emoji} {name} -{pct}%',
    failMsgTemplate:    '💎 Diamond hands prevailed. {emoji} {name} +{pct}%',
  },

  // ── Volatile / uncertain ─────────────────────────────────────────────────
  {
    headline: n => `${n} CEO to make major announcement`,
    successChance: 0.52,
    getSuccessMult: () => 1.6 + Math.random() * 2.0,
    getFailMult:    () => 0.30 + Math.random() * 0.30,
    successHypeBoost: 0.40,
    failHypeDrain: 0.15,
    successTrendBoost: 0.003,
    successMsgTemplate: '📢 Bullish announcement! {emoji} {name} +{pct}%',
    failMsgTemplate:    '📢 Bearish surprise. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `Court ruling on ${n} expected any day`,
    successChance: 0.50,
    getSuccessMult: () => 1.5 + Math.random() * 2.0,
    getFailMult:    () => 0.25 + Math.random() * 0.35,
    successHypeBoost: 0.25,
    failHypeDrain: 0.20,
    successTrendBoost: 0.002,
    successMsgTemplate: '⚖️ Ruling in favour! {emoji} {name} +{pct}%',
    failMsgTemplate:    '⚖️ Ruling against. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `Short squeeze building in ${n}`,
    successChance: 0.55,
    getSuccessMult: () => 1.8 + Math.random() * 1.5,
    getFailMult:    () => 0.45 + Math.random() * 0.25,
    successHypeBoost: 0.35,
    failHypeDrain: 0.10,
    successTrendBoost: 0.005,
    successMsgTemplate: '💥 Short squeeze triggered! {emoji} {name} rocketed +{pct}%',
    failMsgTemplate:    '😓 Shorts won. {emoji} {name} -{pct}%',
  },
  {
    headline: n => `Retail army targeting ${n} next`,
    successChance: 0.52,
    getSuccessMult: () => 2.0 + Math.random() * 2.5,
    getFailMult:    () => 0.40 + Math.random() * 0.30,
    successHypeBoost: 0.50,
    failHypeDrain: 0.05,
    successTrendBoost: 0.005,
    successMsgTemplate: '🚀 Reddit discovers {emoji} {name}! +{pct}%',
    failMsgTemplate:    '💸 Retail capitulated early. {emoji} {name} -{pct}%',
  },
];

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
  private nextGenerationDay = 1;  // first news on day 1
  private idCounter = 0;
  private readonly maxActive = 6;
  private readonly maxHistory = 20;

  // ── Generation ────────────────────────────────────────────────────────────

  // Call once per day from IdleSystem. Returns newly created item or null.
  generateIfDue(market: Market, currentDay: number): NewsItem | null {
    if (currentDay < this.nextGenerationDay) return null;
    const active = this.items.filter(n => !n.resolved);
    if (active.length >= this.maxActive) return null;

    const assets = market.getUnlockedAssets();
    if (assets.length === 0) return null;

    const target = assets[Math.floor(Math.random() * assets.length)];
    const tpl    = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const delay  = 1 + Math.floor(Math.random() * 4);  // 1–4 days
    const sm     = tpl.getSuccessMult();
    const fm     = tpl.getFailMult(sm);

    const item: NewsItem = {
      id:               `news_${this.idCounter++}`,
      headline:         tpl.headline(target.name),
      targetAssetId:    target.id,
      targetName:       target.name,
      targetEmoji:      target.emoji,
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
    this.nextGenerationDay = currentDay + 2 + Math.floor(Math.random() * 2);  // 2–3 days
    return item;
  }

  // ── Resolution ────────────────────────────────────────────────────────────

  // Call once per day from IdleSystem. Returns all resolved items this day.
  dayTick(market: Market, currentDay: number): NewsResolution[] {
    const resolutions: NewsResolution[] = [];

    for (const item of this.items) {
      if (item.resolved || item.triggerDay !== currentDay) continue;
      item.resolved = true;
      resolutions.push(this.applyEffect(item, market));
    }

    // Trim history (keep last maxHistory items, all unresolved preserved)
    const unresolved = this.items.filter(n => !n.resolved);
    const resolved   = this.items.filter(n => n.resolved).slice(-this.maxHistory);
    this.items = [...unresolved, ...resolved];

    return resolutions;
  }

  private applyEffect(item: NewsItem, market: Market): NewsResolution {
    const asset = market.getAsset(item.targetAssetId);
    const success = Math.random() < item.successChance;

    if (!asset) {
      return {
        headline: item.headline,
        targetName: item.targetName,
        targetEmoji: item.targetEmoji,
        success: false,
        message: `${item.targetEmoji} ${item.targetName} not found in market.`,
        severity: 'neutral',
      };
    }

    if (success) {
      asset.shock(item.successMult);
      asset.hype = Math.min(1, asset.hype + item.successHypeBoost);
      asset.trendBoost += item.successTrendBoost;
      const msg = fillTemplate(item.successMsgTemplate, item.targetName, item.targetEmoji, item.successMult);
      return {
        headline: item.headline,
        targetName: item.targetName,
        targetEmoji: item.targetEmoji,
        success: true,
        message: msg,
        severity: item.successMult >= 1 ? 'good' : 'bad',
      };
    } else {
      asset.shock(item.failMult);
      if (item.failHypeDrain > 0 && item.failHypeDrain < 1) {
        asset.hype *= item.failHypeDrain;
      }
      const msg = fillTemplate(item.failMsgTemplate, item.targetName, item.targetEmoji, item.failMult);
      const isCrash = item.failMult < 1;
      return {
        headline: item.headline,
        targetName: item.targetName,
        targetEmoji: item.targetEmoji,
        success: false,
        message: msg,
        severity: isCrash ? 'bad' : 'good',
      };
    }
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
    return {
      items: this.items.slice(-this.maxHistory),
      nextGenerationDay: this.nextGenerationDay,
      idCounter: this.idCounter,
    };
  }

  loadState(state: NewsSaveState): void {
    this.items              = state.items ?? [];
    this.nextGenerationDay  = state.nextGenerationDay ?? 1;
    this.idCounter          = state.idCounter ?? 0;
  }
}
