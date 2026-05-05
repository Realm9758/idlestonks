import type { Asset } from '../core/Asset.ts';
import type { NewsItem } from '../core/NewsSystem.ts';

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${value.toFixed(2)}`;
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function timeAgo(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function getEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

export function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Trade feedback ────────────────────────────────────────────────────────────
//
// Returns a short insight shown as a second toast when the player buys or sells.
// The goal: teach players what signals matter, without being preachy.

// ── Momentum arrow ────────────────────────────────────────────────────────────

export function getMomentumArrow(momentum: number): string {
  if (momentum > 0.025) return '↑↑';
  if (momentum > 0.006) return '↑';
  if (momentum < -0.025) return '↓↓';
  if (momentum < -0.006) return '↓';
  return '→';
}

// ── Insight panel text ────────────────────────────────────────────────────────
//
// Short AI-style read on the asset based on its current stats.
// Patterns are intentionally learnable: players who understand the signals
// will see these confirm their read, reinforcing the mental model.

export function getInsightText(asset: Asset): string {
  const { hype, momentum, stability, risk } = asset;

  if (hype > 0.75 && momentum > 0.015)
    return '🔥 Hype peak + rising momentum. Classic pump setup. Ride it, then exit fast.';
  if (hype > 0.70 && momentum < -0.01)
    return '⚠️ Overhyped with falling momentum. Pre-crash pattern. Consider selling.';
  if (hype > 0.55 && risk > 0.6)
    return '💣 High hype + extreme risk = maximum volatility. One bad event away from ruin.';

  if (stability > 0.70)
    return '🛡 Low noise, steady gains. Best for passive accumulation and crash hedging.';
  if (stability > 0.50 && momentum > 0)
    return '⚖️ Stable and rising. Less exciting, but consistent. Safe long-term hold.';

  if (risk > 0.80)
    return '🌋 Extreme risk. Sleeping volcano. Could +400% or -90% on any given tick.';
  if (risk > 0.65 && hype < 0.25)
    return '🎲 High risk, cold hype. Hidden potential — or just chaos waiting to erupt.';

  if (momentum > 0.025)
    return '🚀 Strong upward momentum. Trend continuation is likely. Classic momentum buy.';
  if (momentum > 0.010)
    return '📈 Rising momentum. Moderate trend forming. Monitor for acceleration.';
  if (momentum < -0.025)
    return '📉 Steep decline in progress. Strong negative momentum. Do not catch this knife.';
  if (momentum < -0.010)
    return '↘️ Negative momentum building. Could reverse or continue dropping.';

  if (hype > 0.50 && stability < 0.25)
    return '💣 Hyped but fragile. One bad event and this craters hard.';
  if (hype < 0.15 && stability > 0.40 && risk < 0.30)
    return '💎 Cold hype, solid foundation, low risk. Value investor territory.';

  return '📊 Mixed signals. No clear edge right now. Watch for momentum or hype changes.';
}

// ── Stock tags ────────────────────────────────────────────────────────────────

export interface StockTag { label: string; cls: string; }

export function getStockTags(asset: Asset): StockTag[] {
  const tags: StockTag[] = [];
  const { hype, momentum, stability, risk } = asset;

  if (momentum > 0.022)       tags.push({ label: '🚀 SURGING',   cls: 'tag-surge' });
  else if (momentum > 0.008)  tags.push({ label: '📈 TRENDING',  cls: 'tag-trend' });
  else if (momentum < -0.022) tags.push({ label: '💥 CRASHING',  cls: 'tag-crash' });
  else if (momentum < -0.008) tags.push({ label: '📉 FALLING',   cls: 'tag-fall' });

  if (hype > 0.65)            tags.push({ label: '🔥 HYPED',     cls: 'tag-hype' });
  if (stability > 0.65)       tags.push({ label: '🛡 STABLE',    cls: 'tag-stable' });
  else if (risk > 0.7)        tags.push({ label: '🎲 HIGH RISK', cls: 'tag-risk' });

  if (hype < 0.12 && momentum < -0.005
      && !tags.some(t => t.cls === 'tag-fall' || t.cls === 'tag-crash'))
    tags.push({ label: '😴 DYING', cls: 'tag-dying' });

  return tags.slice(0, 3);
}

// ── Recommended play ──────────────────────────────────────────────────────────

export interface RecommendedPlay { action: string; sub: string; cls: string; }

export function getRecommendedPlay(asset: Asset): RecommendedPlay {
  const { hype, momentum, stability, risk } = asset;
  if (risk > 0.8)
    return { action: 'DEGEN PLAY',    sub: 'Extreme volatility — moon or crater.',        cls: 'rp-degen' };
  if (momentum > 0.018 && hype > 0.4)
    return { action: 'STRONG BUY',    sub: 'Momentum + hype aligned. Classic pump.',      cls: 'rp-strong' };
  if (hype > 0.65 && momentum > 0)
    return { action: 'SHORT TERM BUY', sub: 'Ride the hype spike. Exit before it fades.', cls: 'rp-short' };
  if (momentum > 0.008)
    return { action: 'BUY',           sub: 'Upward trend in progress.',                   cls: 'rp-buy' };
  if (stability > 0.65 && momentum >= 0)
    return { action: 'BUY & HOLD',    sub: 'Stable grower. Safe long-term hold.',         cls: 'rp-hold' };
  if (momentum < -0.018)
    return { action: 'AVOID',         sub: "Strong downtrend. Don't catch this knife.",   cls: 'rp-avoid' };
  if (momentum < -0.005)
    return { action: 'WAIT',          sub: 'Price falling. Watch for reversal.',          cls: 'rp-wait' };
  return   { action: 'WATCH',         sub: 'No clear edge. Monitor for signals.',         cls: 'rp-wait' };
}

// ── Opportunity score (1–5) ───────────────────────────────────────────────────

export function getOpportunityScore(asset: Asset): number {
  const { hype, momentum, stability, risk } = asset;
  let s = 1;
  if (momentum > 0.025)      s += 2;
  else if (momentum > 0.01)  s += 1.5;
  else if (momentum > 0.003) s += 0.5;
  else if (momentum < -0.01) s -= 0.5;
  if (hype > 0.65)      s += 1;
  else if (hype > 0.4)  s += 0.5;
  if (stability > 0.65) s += 0.5;
  if (risk > 0.8)       s = Math.max(s, 2.5);
  return Math.min(5, Math.max(1, Math.round(s)));
}

// ── Timing advice ─────────────────────────────────────────────────────────────

export interface TimingAdvice { text: string; cls: string; }

export function getTimingAdvice(asset: Asset): TimingAdvice {
  const { hype, momentum } = asset;
  if (momentum > 0.015)                  return { text: 'ENTER NOW — momentum is active',             cls: 'tim-now' };
  if (hype > 0.65 && momentum < 0.005)  return { text: 'SELL SOON — hype peaking, reversal near',   cls: 'tim-sell' };
  if (hype > 0.5 && momentum > 0)       return { text: 'ENTER NOW — hype + positive momentum',      cls: 'tim-now' };
  if (momentum < -0.015)                 return { text: 'EXIT NOW — sharp decline in progress',       cls: 'tim-exit' };
  if (momentum < -0.005)                 return { text: 'WAIT — price falling, watch for reversal',  cls: 'tim-wait' };
  return                                          { text: 'WATCH — no timing edge right now',         cls: 'tim-neutral' };
}

// ── Risk warning ──────────────────────────────────────────────────────────────

export function getRiskWarning(asset: Asset): string | null {
  const { hype, stability, risk, momentum } = asset;
  if (risk > 0.8)
    return '🌋 Extreme shock risk — price can swing ±40% at any moment';
  if (hype > 0.65 && stability < 0.25)
    return '💣 High hype + low stability = violent crash risk when hype fades';
  if (momentum > 0.02 && risk > 0.5)
    return '⚠️ Fast-moving + high risk. Gains can reverse in seconds.';
  if (momentum < -0.015)
    return '📉 Strong downtrend — buying here means catching a falling knife';
  if (stability < 0.15)
    return '💀 Fragile structure — one bad event could destroy this position';
  return null;
}

// ── Trade feedback ────────────────────────────────────────────────────────────

export function getTradeInsight(asset: Asset, action: 'buy' | 'sell'): string {
  if (action === 'buy') {
    if (asset.momentum > 0.02 && asset.hype > 0.5)
      return `📈 Buying into SURGING momentum + HIGH hype — could run further, but hype decays`;
    if (asset.momentum > 0.015)
      return `📈 Strong momentum behind ${asset.name} — trend continuation likely`;
    if (asset.hype > 0.7)
      return `🔥 Entering at PEAK HYPE — expect a spike, then watch for the crash`;
    if (asset.hype > 0.45)
      return `🔥 High hype adds upward pressure — ride it while it lasts`;
    if (asset.momentum < -0.015)
      return `📉 Catching a falling knife — momentum is negative. Brave or foolish?`;
    if (asset.stability > 0.65)
      return `🛡 Safe pick — high stability means softer crashes and steady growth`;
    if (asset.risk > 0.75)
      return `🎲 EXTREME risk asset — rare shocks incoming. Could moon or crater.`;
    if (asset.risk > 0.45)
      return `⚠️ High risk — expect irregular big moves. Size your position carefully.`;
    if (asset.momentum < -0.005)
      return `📉 Momentum is falling — could reverse, could keep dropping`;
    return `✅ Neutral entry — no strong signals either way`;
  } else {
    if (asset.hype > 0.65)
      return `💰 Selling at HIGH hype — good timing. Hype peaks don't last.`;
    if (asset.momentum > 0.02)
      return `⚠️ Selling into SURGING momentum — may leave gains on the table`;
    if (asset.momentum < -0.015)
      return `🛡 Cutting losses — momentum is deeply negative. Smart exit.`;
    if (asset.risk > 0.7)
      return `🎲 Taking profits on extreme-risk asset — always a reasonable call`;
    return `✅ Sold — check momentum and hype before re-entering`;
  }
}

export interface SignalLabel { text: string; cls: string; }

export function getSignalLabel(asset: Asset): SignalLabel {
  if (asset.momentum > 0.025)                          return { text: '🚀 SURGING',  cls: 'sl-great' };
  if (asset.momentum < -0.025)                         return { text: '☠️ CRASHING', cls: 'sl-danger' };
  if (asset.hype > 0.65 && asset.momentum > -0.008)   return { text: '🔥 HOT',      cls: 'sl-good' };
  if (asset.momentum > 0.010)                          return { text: '📈 RISING',   cls: 'sl-good' };
  if (asset.momentum < -0.010)                         return { text: '📉 FALLING',  cls: 'sl-bad' };
  if (asset.risk > 0.7 && asset.stability < 0.2)       return { text: '🎲 RISKY',    cls: 'sl-warn' };
  if (asset.stability > 0.6 && asset.momentum > -0.005) return { text: '🛡 STEADY',  cls: 'sl-neutral' };
  return { text: '➡️ FLAT', cls: 'sl-muted' };
}

// ── Sector system ─────────────────────────────────────────────────────────────

export interface SectorDef {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export const SECTORS: SectorDef[] = [
  { id: 'hype',  emoji: '🐸', label: 'Hype Riders',  description: 'Buy the spike, sell before decay' },
  { id: 'blue',  emoji: '🏦', label: 'Blue Chips',   description: 'Steady growers — buy and hold' },
  { id: 'blend', emoji: '🎲', label: 'Blends',        description: 'Moderate risk, catches pumps' },
  { id: 'chaos', emoji: '💥', label: 'Chaos Assets', description: 'Only enter on catalyst' },
];

export const SECTOR_ORDER = ['hype', 'blue', 'blend', 'chaos'] as const;

export const SECTOR_MAP: Record<string, string> = {
  catcoin:          'hype',
  doge_cousin:      'hype',
  influencer_stock: 'hype',
  stonks_up:        'blue',
  ai_writes_ai:     'blue',
  meme_etf:         'blend',
  diamond_hands:    'blend',
  quantum_banana:   'chaos',
  rug_pull:         'chaos',
  nft_of_nft:       'chaos',
};

export const CORRELATED_PAIRS: Array<{ ids: [string, string]; warning: string }> = [
  {
    ids: ['catcoin', 'doge_cousin'],
    warning: "🐱🐕 CatCoin & Doge's Cousin are correlated — both pump and crash on meme events",
  },
  {
    ids: ['influencer_stock', 'meme_etf'],
    warning: '📸😂 Influencer Stock & Meme ETF share hype cycles — consider reducing overlap',
  },
];

// ── Timing window (ENTRY / RIDING / EXIT / BLEEDING) ─────────────────────────
//
// One persistent label on every card that tells players where they are in the
// cycle — so they can act on it, not just observe price movement.

export interface TimingWindow { text: string; cls: string; }

export function getTimingWindow(asset: Asset): TimingWindow {
  const { hype, momentum, stability, carryingCost } = asset;

  // Hype cycle: highest priority because hype has a finite, predictable arc
  if (hype > 0.75 && momentum > 0)
    return { text: '⚡ PEAK HYPE — consider selling soon', cls: 'tw-peak' };
  if (hype > 0.75 && momentum <= 0)
    return { text: '🔴 HYPE FADING — exit window closing', cls: 'tw-exit' };
  if (hype > 0.45 && momentum > 0.005)
    return { text: '🟢 ENTERING — hype + momentum aligned', cls: 'tw-enter' };
  if (hype > 0.45 && momentum < -0.005)
    return { text: '🟡 FADING — hype passing, watch for reversal', cls: 'tw-warn' };

  // Momentum cycle
  if (momentum > 0.022)
    return { text: '⚡ RIDING — strong uptrend active', cls: 'tw-peak' };
  if (momentum > 0.008)
    return { text: '🟢 ENTERING — momentum building', cls: 'tw-enter' };
  if (momentum < -0.022)
    return { text: '🔴 EXIT NOW — sharp decline in progress', cls: 'tw-exit' };
  if (momentum < -0.008)
    return { text: '🟡 FALLING — wait for reversal signal', cls: 'tw-warn' };

  // Carrying cost trap: player is bleeding for no reason
  if (carryingCost > 0 && hype < 0.25 && momentum <= 0)
    return { text: '💸 BLEEDING — exit or wait for catalyst', cls: 'tw-bleed' };

  // Blue chip steady state
  if (stability > 0.6 && momentum >= -0.005)
    return { text: '🛡 STEADY — safe to accumulate anytime', cls: 'tw-stable' };

  return { text: '⏳ WATCHING — no clear timing signal', cls: 'tw-neutral' };
}

// ── Hype decay estimate ────────────────────────────────────────────────────────

export function getHypeDecayTicks(asset: Asset): number {
  if (asset.hype <= 0.15) return 0;
  return Math.max(1, Math.round(Math.log(0.15 / asset.hype) / Math.log(asset.hypeDecay)));
}

// ── Live story sentence (shown on each stock card) ────────────────────────────
//
// Priority: pending news > hype state > momentum > carrying cost bleed > trend

export function getStorySentence(asset: Asset, activeNews: NewsItem[], day: number): string {
  const TYPE_ICONS: Record<string, string> = {
    hype: '🔥', growth: '📈', breakthrough: '⚡', scandal: '🕵️', crash: '💥',
  };

  // Priority 1: pending news catalyst
  const news = activeNews.filter(n => n.targetAssetId === asset.id);
  if (news.length > 0) {
    const n = news[0];
    const daysLeft = n.triggerDay - day;
    const dayStr   = daysLeft <= 1 ? 'today' : `in ${daysLeft}d`;
    const sDir = n.successMult >= 1
      ? `+${((n.successMult - 1) * 100).toFixed(0)}%`
      : `-${((1 - n.successMult) * 100).toFixed(0)}%`;
    const fDir = n.failMult >= 1
      ? `+${((n.failMult - 1) * 100).toFixed(0)}%`
      : `-${((1 - n.failMult) * 100).toFixed(0)}%`;
    const icon = TYPE_ICONS[n.type] ?? '📰';
    return `${icon} News resolves ${dayStr} · ✅ ${sDir} · ❌ ${fDir}`;
  }

  // Priority 2: hype state
  const decayTicks = getHypeDecayTicks(asset);
  if (asset.hype > 0.75 && asset.momentum > 0.005)
    return `🔥 VIRAL hype at ${(asset.hype * 100).toFixed(0)}% · fades in ~${decayTicks} ticks — ride it now`;
  if (asset.hype > 0.75 && asset.momentum < -0.005)
    return `⚠️ Peak hype passing — momentum turned negative. Exit window closing`;
  if (asset.hype > 0.45 && asset.hypeDecay < 0.95)
    return `🔥 Hype at ${(asset.hype * 100).toFixed(0)}%, fading fast (~${decayTicks} ticks) — trade the spike`;
  if (asset.hype > 0.45)
    return `🔥 Hype at ${(asset.hype * 100).toFixed(0)}% with slow decay — medium-term tailwind`;

  // Priority 3: strong momentum
  if (asset.momentum > 0.02)
    return `🚀 Strong uptrend active (${(asset.momentum * 100).toFixed(2)}%) — trend continuation likely`;
  if (asset.momentum < -0.02)
    return `☠️ Sharp decline in progress — wait for reversal before entering`;

  // Priority 4: carrying cost bleed
  if (asset.carryingCost > 0 && asset.hype < 0.2 && asset.momentum < 0) {
    const dailyBleed = (asset.carryingCost * 60 * 100).toFixed(2);
    return `💸 Bleeding ~${dailyBleed}%/day with no catalyst — consider exiting`;
  }

  // Priority 5: stable blue chip
  if (asset.stability > 0.65 && asset.trend > 0)
    return `🛡 Steady climber — safe accumulation. No timing needed`;

  // Priority 6: falling momentum
  if (asset.momentum < -0.008)
    return `📉 Negative momentum building — price falling. Watch for reversal`;

  return `📊 No strong signal — monitor for momentum or hype changes`;
}

// ── Concrete volatility profile (shown in insight panel) ─────────────────────

export function getConcreteVolatilityInfo(asset: Asset): string {
  const { risk, stability, carryingCost } = asset;
  const parts: string[] = [];

  if (risk > 0.01) {
    const ticksPerShock = Math.round(1 / (risk * 0.012));
    const shockMag      = Math.round((0.10 + risk * 0.175) * 100);
    parts.push(`⚡ Shock: ~1-in-${ticksPerShock} ticks · ±${shockMag}% when it fires`);
  } else {
    parts.push(`✅ Near-zero shock risk`);
  }

  if (stability > 0.4) {
    const cushion = Math.round(stability * 55);
    parts.push(`🛡 Downside cushioned ${cushion}% by stability`);
  }

  if (carryingCost > 0) {
    const dailyCost = (carryingCost * 60 * 100).toFixed(3);
    parts.push(`💸 Costs ~${dailyCost}%/day to hold with no price movement`);
  }

  return parts.join('\n');
}

// ── Archetype playbook (how to trade this asset) ─────────────────────────────

export function getArchetypePlaybook(asset: Asset): string {
  const { carryingCost, stability, risk, hypeDecay, trend } = asset;

  if (carryingCost > 0.0001 && stability < 0.15 && risk > 0.7)
    return 'Only enter when a news catalyst is pending. Exit the same day. Holding bleeds value passively even when flat.';
  if (stability > 0.65 && risk < 0.15)
    return 'Buy and hold. Only sell to rotate into a clearly better opportunity. Boring = consistently profitable.';
  if (hypeDecay < 0.95)
    return 'Buy on hype spike, sell before hype drops below 30%. Never hold when cold — timing is everything here.';
  if (hypeDecay < 0.98 && trend < 0)
    return 'Trade hype cycles only. Holding long-term loses money due to negative trend. Enter rising, exit before peak fades.';
  if (risk > 0.6 && stability > 0.2)
    return 'Size your position small — big shocks are frequent. Adds high upside potential but expect violent drawdowns.';
  if (trend > 0.004)
    return 'Steady momentum with patience. Enter on dips and hold through minor shocks. The trend works for you.';
  return 'Watch momentum and hype. Enter on rising trend or hype, exit on reversal signs.';
}

// ── Best opportunity + worst hold ─────────────────────────────────────────────

export interface OpportunityResult {
  asset: Asset;
  reason: string;
}

export function getBestOpportunity(assets: Asset[], activeNews: NewsItem[]): OpportunityResult | null {
  if (assets.length === 0) return null;
  const pendingIds = new Set(activeNews.map(n => n.targetAssetId));

  let bestScore = -Infinity;
  let bestAsset: Asset | null = null;

  for (const asset of assets) {
    let score = 0;
    score += asset.momentum * 150;
    score += asset.hype * 1.2;
    score += asset.stability * 0.5;
    score -= asset.carryingCost * 60 * 100 * 3;
    score += asset.trend * 300;
    if (pendingIds.has(asset.id)) score += 1.5;
    if (asset.momentum < -0.01) score -= 2;

    if (score > bestScore) { bestScore = score; bestAsset = asset; }
  }

  if (!bestAsset) return null;

  const a = bestAsset;
  let reason: string;
  if (a.momentum > 0.015 && a.hype > 0.4)  reason = 'Momentum + hype aligned';
  else if (a.momentum > 0.015)              reason = 'Strong upward momentum';
  else if (pendingIds.has(a.id))            reason = 'News catalyst pending';
  else if (a.hype > 0.6)                   reason = 'High hype phase';
  else if (a.stability > 0.65)             reason = 'Safe steady climber';
  else if (a.trend > 0.004)               reason = 'Strong positive trend';
  else                                     reason = 'Best available signal';

  return { asset: bestAsset, reason };
}

export function getWorstHold(ownedAssets: Asset[]): OpportunityResult | null {
  const candidates = ownedAssets.filter(a => a.momentum < -0.01 || (a.carryingCost > 0 && a.hype < 0.2));
  if (candidates.length === 0) return null;

  let worstScore = Infinity;
  let worstAsset: Asset | null = null;

  for (const asset of candidates) {
    let score = asset.momentum * 100;
    score -= asset.carryingCost * 60 * 100 * 5;
    if (asset.hype < 0.15) score -= 0.5;
    if (asset.trend < 0)   score -= 0.5;
    if (score < worstScore) { worstScore = score; worstAsset = asset; }
  }

  if (!worstAsset) return null;

  const a = worstAsset;
  let reason: string;
  if (a.momentum < -0.02)                     reason = 'Sharp decline in progress';
  else if (a.carryingCost > 0 && a.hype < 0.15) reason = 'Bleeding daily with no catalyst';
  else if (a.momentum < -0.01)                reason = 'Negative momentum building';
  else                                         reason = 'Weak position';

  return { asset: worstAsset, reason };
}

// ── Decision signal (3-state: Good Entry / Wait / Risky) ─────────────────────
//
// The single most important signal on each card. Scannable in under a second.
// Scored from hype × momentum × risk balance.

export interface DecisionSignal {
  signal: 'Buy' | 'Hold' | 'Avoid';
  cls: 'sig-good' | 'sig-wait' | 'sig-risky';
  reason: string;
}

export function getDecisionSignal(asset: Asset, activeNews?: NewsItem[]): DecisionSignal {
  const { hype, momentum, stability, risk, carryingCost, trend } = asset;
  const hasPendingNews = activeNews?.some(n => n.targetAssetId === asset.id) ?? false;

  // Risky conditions — check these first to avoid false positives
  if (momentum < -0.022)
    return { signal: 'Avoid', cls: 'sig-risky', reason: 'Sharp decline — falling knife' };
  if (hype > 0.72 && momentum < -0.008)
    return { signal: 'Avoid', cls: 'sig-risky', reason: 'Hype peaked, reversal underway' };
  if (carryingCost > 0 && hype < 0.2 && momentum <= 0)
    return { signal: 'Avoid', cls: 'sig-risky', reason: 'Bleeding daily, no catalyst' };
  if (risk > 0.82 && hype < 0.3 && momentum < 0.005)
    return { signal: 'Avoid', cls: 'sig-risky', reason: 'High risk, unstable' };
  if (momentum < -0.010)
    return { signal: 'Avoid', cls: 'sig-risky', reason: 'Negative momentum building' };

  // Good Entry conditions
  if (hasPendingNews && momentum > 0)
    return { signal: 'Buy', cls: 'sig-good', reason: 'News catalyst + rising momentum' };
  if (momentum > 0.018 && hype > 0.4)
    return { signal: 'Buy', cls: 'sig-good', reason: 'Hype rising + strong momentum' };
  if (hype > 0.65 && momentum > 0.003)
    return { signal: 'Buy', cls: 'sig-good', reason: 'High hype with positive momentum' };
  if (momentum > 0.022)
    return { signal: 'Buy', cls: 'sig-good', reason: 'Strong uptrend active' };
  if (stability > 0.65 && momentum >= -0.002 && trend > 0)
    return { signal: 'Buy', cls: 'sig-good', reason: 'Stable steady climber' };
  if (momentum > 0.010)
    return { signal: 'Buy', cls: 'sig-good', reason: 'Rising momentum' };
  if (hasPendingNews)
    return { signal: 'Buy', cls: 'sig-good', reason: 'News catalyst pending' };

  return { signal: 'Hold', cls: 'sig-wait', reason: 'No clear trend' };
}

// ── Hysteresis: prevent the decision pill from flickering between states ──────
// A new signal must be observed for SIG_PERSIST_TICKS consecutive evaluations
// before it replaces the displayed signal. Bypass the delay when escalating to
// "Avoid" — danger should reach the player immediately.

export interface SignalHysteresisEntry {
  current: DecisionSignal;
  pending: DecisionSignal | null;
  pendingTicks: number;
}

const SIG_PERSIST_TICKS = 3;

export function getStableDecisionSignal(
  asset: Asset,
  activeNews: NewsItem[],
  history: Map<string, SignalHysteresisEntry>,
): DecisionSignal {
  const fresh = getDecisionSignal(asset, activeNews);
  const entry = history.get(asset.id);

  if (!entry) {
    history.set(asset.id, { current: fresh, pending: null, pendingTicks: 0 });
    return fresh;
  }

  // Same signal as displayed → reset any pending switch and keep current.
  if (fresh.cls === entry.current.cls) {
    if (entry.pending) { entry.pending = null; entry.pendingTicks = 0; }
    // Refresh reason text in case it changed within the same category
    entry.current = fresh;
    return entry.current;
  }

  // Escalation to Avoid bypasses hysteresis — bad news should land immediately.
  if (fresh.cls === 'sig-risky') {
    entry.current = fresh;
    entry.pending = null;
    entry.pendingTicks = 0;
    return fresh;
  }

  // New signal differs — start or continue a pending switch.
  if (!entry.pending || entry.pending.cls !== fresh.cls) {
    entry.pending = fresh;
    entry.pendingTicks = 1;
  } else {
    entry.pendingTicks++;
  }

  if (entry.pendingTicks >= SIG_PERSIST_TICKS) {
    entry.current = entry.pending;
    entry.pending = null;
    entry.pendingTicks = 0;
  }

  return entry.current;
}

// ── Top opportunities (ranked list for Best Opportunity bar) ──────────────────

export function getTopOpportunities(assets: Asset[], activeNews: NewsItem[], count = 2): OpportunityResult[] {
  if (assets.length === 0) return [];
  const pendingIds = new Set(activeNews.map(n => n.targetAssetId));

  const scored = assets.map(asset => {
    let score = 0;
    score += asset.momentum * 150;
    score += asset.hype * 1.2;
    score += asset.stability * 0.5;
    score -= asset.carryingCost * 60 * 100 * 3;
    score += asset.trend * 300;
    if (pendingIds.has(asset.id)) score += 1.5;
    if (asset.momentum < -0.01) score -= 2;
    return { asset, score };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map(({ asset }) => {
    const a = asset;
    let reason: string;
    if (a.momentum > 0.015 && a.hype > 0.4)  reason = 'Momentum + hype aligned';
    else if (a.momentum > 0.015)              reason = 'Strong upward momentum';
    else if (pendingIds.has(a.id))            reason = 'News catalyst pending';
    else if (a.hype > 0.6)                   reason = 'High hype phase';
    else if (a.stability > 0.65)             reason = 'Safe steady climber';
    else if (a.trend > 0.004)               reason = 'Strong positive trend';
    else                                     reason = 'Best available signal';
    return { asset, reason };
  });
}
