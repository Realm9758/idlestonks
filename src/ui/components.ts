import type { Asset } from '../core/Asset.ts';

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
